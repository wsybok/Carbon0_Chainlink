// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/dev/v1_0_0/libraries/FunctionsRequest.sol";

contract CarbonVerificationOracle is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    // State variables
    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;
    uint64 public immutable i_subscriptionId;
    uint32 public gasLimit;
    bytes32 public donID;
    
    uint256 public nextCreditId = 1;
    
    struct CarbonCredit {
        uint256 amount;
        string projectId;
        bytes32 verificationHash;
        uint256 expiryDate;
        bool isVerified;
        address owner;
        uint256 createdAt;
        uint256 verifiedAt;
    }
    
    // Simplified verification request with only 3 fields
    struct VerificationRequest {
        bytes32 requestId;
        uint256 creditId;
        bool fulfilled;
        string gsId;
        uint256 availableForSale;
        string timestamp;
        uint8 verificationStatus; // 0 = pending, 1 = verified, 2 = failed
    }
    
    mapping(uint256 => CarbonCredit) public carbonCredits;
    mapping(bytes32 => VerificationRequest) public verificationRequests;
    mapping(uint256 => bytes32) public creditToRequest;
    
    event CarbonCreditRegistered(uint256 indexed creditId, string projectId, uint256 amount, address owner);
    event VerificationRequested(uint256 indexed creditId, bytes32 indexed requestId, string projectId);
    event VerificationFulfilled(bytes32 indexed requestId, uint256 indexed creditId, bool verified);

    error UnexpectedRequestID(bytes32 requestId);

    constructor(
        address router,
        bytes32 _donID,
        uint64 _subscriptionId,
        uint32 _gasLimit
    ) FunctionsClient(router) ConfirmedOwner(msg.sender) {
        donID = _donID;
        i_subscriptionId = _subscriptionId;
        gasLimit = _gasLimit;
    }

    // Simplified JavaScript for 3-field response: gsId|availableForSale|timestamp
    string public constant SOURCE_CODE = 
        "const gsId = args[0];"
        "const apiResponse = await Functions.makeHttpRequest({"
        "  url: `https://goldstandard-mockup-api.vercel.app/api/v2/projects/${gsId}/carbon-credits`,"
        "  headers: { 'X-API-Key': 'chainlink_demo_key' }"
        "});"
        "if (apiResponse.error) {"
        "  throw Error('API Error');"
        "}"
        "const data = apiResponse.data.data;"
        "const result = `${data.gsId}|${data.availableForSale}|${apiResponse.data.timestamp}`;"
        "return Functions.encodeString(result);";
    
    function registerCarbonCredit(
        uint256 _amount,
        string memory _projectId,
        bytes32 _verificationHash,
        uint256 _expiryDate
    ) external returns (uint256) {
        uint256 creditId = nextCreditId++;
        
        carbonCredits[creditId] = CarbonCredit({
            amount: _amount,
            projectId: _projectId,
            verificationHash: _verificationHash,
            expiryDate: _expiryDate,
            isVerified: false,
            owner: msg.sender,
            createdAt: block.timestamp,
            verifiedAt: 0
        });
        
        emit CarbonCreditRegistered(creditId, _projectId, _amount, msg.sender);
        return creditId;
    }
    
    function requestVerification(uint256 _creditId) external returns (bytes32 requestId) {
        require(_creditId < nextCreditId, "Credit does not exist");
        require(carbonCredits[_creditId].owner == msg.sender, "Not credit owner");
        
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(SOURCE_CODE);
        
        string[] memory args = new string[](1);
        args[0] = carbonCredits[_creditId].projectId;
        req.setArgs(args);
        
        s_lastRequestId = _sendRequest(
            req.encodeCBOR(),
            i_subscriptionId,
            gasLimit,
            donID
        );
        
        // Initialize simplified verification request
        verificationRequests[s_lastRequestId] = VerificationRequest({
            requestId: s_lastRequestId,
            creditId: _creditId,
            fulfilled: false,
            gsId: "",
            availableForSale: 0,
            timestamp: "",
            verificationStatus: 0
        });
        
        creditToRequest[_creditId] = s_lastRequestId;
        
        emit VerificationRequested(_creditId, s_lastRequestId, carbonCredits[_creditId].projectId);
        
        return s_lastRequestId;
    }
    
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        if (s_lastRequestId != requestId) {
            revert UnexpectedRequestID(requestId);
        }
        
        s_lastResponse = response;
        s_lastError = err;
        
        VerificationRequest storage request = verificationRequests[requestId];
        request.fulfilled = true;
        
        if (err.length > 0) {
            request.verificationStatus = 2; // Failed
            return;
        }
        
        // Parse simplified pipe-separated response: gsId|availableForSale|timestamp
        string memory responseString = string(response);
        (string memory gsId, uint256 availableForSale, string memory timestamp) = _parseSimpleResponse(responseString);
        
        request.gsId = gsId;
        request.availableForSale = availableForSale;
        request.timestamp = timestamp;
        
        // Auto-verify if credits are available
        bool verified = availableForSale > 0;
        request.verificationStatus = verified ? 1 : 2;
        
        if (verified) {
            carbonCredits[request.creditId].isVerified = true;
            carbonCredits[request.creditId].verifiedAt = block.timestamp;
        }
        
        emit VerificationFulfilled(requestId, request.creditId, verified);
    }
    
    // Simplified parser for 3 fields: gsId|availableForSale|timestamp
    function _parseSimpleResponse(string memory response) internal pure returns (
        string memory gsId,
        uint256 availableForSale,
        string memory timestamp
    ) {
        bytes memory responseBytes = bytes(response);
        
        if (responseBytes.length == 0) {
            return ("", 0, "");
        }
        
        // Find first pipe
        uint256 firstPipe = 0;
        for (uint256 i = 0; i < responseBytes.length; i++) {
            if (responseBytes[i] == "|") {
                firstPipe = i;
                break;
            }
        }
        
        // Find second pipe
        uint256 secondPipe = 0;
        for (uint256 i = firstPipe + 1; i < responseBytes.length; i++) {
            if (responseBytes[i] == "|") {
                secondPipe = i;
                break;
            }
        }
        
        if (firstPipe == 0 || secondPipe == 0) {
            return ("", 0, "");
        }
        
        // Extract gsId
        bytes memory gsIdBytes = new bytes(firstPipe);
        for (uint256 i = 0; i < firstPipe; i++) {
            gsIdBytes[i] = responseBytes[i];
        }
        gsId = string(gsIdBytes);
        
        // Extract and parse availableForSale
        uint256 numberLength = secondPipe - firstPipe - 1;
        bytes memory numberBytes = new bytes(numberLength);
        for (uint256 i = 0; i < numberLength; i++) {
            numberBytes[i] = responseBytes[firstPipe + 1 + i];
        }
        availableForSale = _parseUint(string(numberBytes));
        
        // Extract timestamp
        uint256 timestampLength = responseBytes.length - secondPipe - 1;
        bytes memory timestampBytes = new bytes(timestampLength);
        for (uint256 i = 0; i < timestampLength; i++) {
            timestampBytes[i] = responseBytes[secondPipe + 1 + i];
        }
        timestamp = string(timestampBytes);
    }
    
    function _parseUint(string memory str) internal pure returns (uint256) {
        bytes memory strBytes = bytes(str);
        uint256 result = 0;
        
        for (uint256 i = 0; i < strBytes.length; i++) {
            uint8 digit = uint8(strBytes[i]);
            if (digit >= 48 && digit <= 57) { // 0-9
                result = result * 10 + (digit - 48);
            }
        }
        
        return result;
    }
    
    // View functions
    function getCarbonCredit(uint256 _creditId) external view returns (CarbonCredit memory) {
        return carbonCredits[_creditId];
    }
    
    function getVerificationRequest(bytes32 _requestId) external view returns (VerificationRequest memory) {
        return verificationRequests[_requestId];
    }
    
    function getLastResponse() external view returns (bytes memory) {
        return s_lastResponse;
    }
    
    function getLastError() external view returns (bytes memory) {
        return s_lastError;
    }
    
    // Owner functions
    function updateGasLimit(uint32 _gasLimit) external onlyOwner {
        gasLimit = _gasLimit;
    }
    
    function updateDonID(bytes32 _donID) external onlyOwner {
        donID = _donID;
    }
}