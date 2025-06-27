// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "./interfaces/IBatchNFT.sol";
import "./interfaces/IProjectToken.sol";
import "./TokenFactory.sol";
import "./CarbonVerificationOracle.sol";

contract BatchNFT is ERC721, ERC721URIStorage, Ownable, IBatchNFT {
    using Strings for uint256;
    
    // Core contracts
    TokenFactory public immutable tokenFactory;
    CarbonVerificationOracle public immutable verificationOracle;
    
    // State tracking
    uint256 public nextBatchId = 1;
    
    // Batch metadata storage
    mapping(uint256 => BatchMetadata) public batchMetadata;
    mapping(uint256 => address) public batchToTokenContract;
    
    // Authorization
    mapping(address => bool) public authorizedIssuers;
    
    // Modifiers
    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender] || msg.sender == owner(), "Not authorized issuer");
        _;
    }
    
    modifier onlyProjectToken(uint256 batchId) {
        require(msg.sender == batchToTokenContract[batchId], "Only project token can call");
        _;
    }
    
    modifier validBatch(uint256 batchId) {
        require(_ownerOf(batchId) != address(0), "Batch does not exist");
        _;
    }
    
    constructor(
        address _tokenFactory,
        address _verificationOracle
    ) ERC721("Carbon Credit Batch", "CCB") {
        require(_tokenFactory != address(0), "Invalid token factory");
        require(_verificationOracle != address(0), "Invalid verification oracle");
        
        tokenFactory = TokenFactory(_tokenFactory);
        verificationOracle = CarbonVerificationOracle(_verificationOracle);
    }
    
    // Authorize issuer
    function authorizeIssuer(address issuer) external onlyOwner {
        authorizedIssuers[issuer] = true;
    }
    
    // Remove issuer authorization
    function deauthorizeIssuer(address issuer) external onlyOwner {
        authorizedIssuers[issuer] = false;
    }
    
    // 🔥 CORE FUNCTION: Mint BatchNFT with CHAINLINK FUNCTIONS VERIFICATION
    function mintBatchWithToken(
        address to,
        string memory projectId,
        uint256 totalCredits,
        uint256 creditId
    ) external onlyAuthorizedIssuer returns (uint256 batchId, address tokenAddress) {
        require(to != address(0), "Invalid recipient");
        require(bytes(projectId).length > 0, "Project ID required");
        require(totalCredits > 0, "Total credits must be greater than 0");
        
        // 🎯 STEP 1: Verify the carbon credit exists and is CHAINLINK VERIFIED
        CarbonVerificationOracle.CarbonCredit memory credit = verificationOracle.getCarbonCredit(creditId);
        require(credit.isVerified, "Carbon credit not verified by Chainlink Functions");
        require(keccak256(bytes(credit.projectId)) == keccak256(bytes(projectId)), "Project ID mismatch with Oracle");
        
        // 🎯 STEP 2: Validate CHAINLINK FUNCTIONS verification data
        bytes32 requestId = verificationOracle.creditToRequest(creditId);
        require(requestId != bytes32(0), "No Chainlink verification request found");
        
        CarbonVerificationOracle.VerificationRequest memory verificationReq = verificationOracle.getVerificationRequest(requestId);
        require(verificationReq.fulfilled, "Chainlink verification not completed");
        require(verificationReq.verificationStatus == 1, "Chainlink verification failed");
        require(verificationReq.availableForSale > 0, "No credits available per Chainlink Functions data");
        
        // 🎯 STEP 3: Ensure we don't mint more than Chainlink verified amount
        // Convert totalCredits from wei to plain units for comparison with Chainlink data
        uint256 totalCreditsInUnits = totalCredits / 1e18;
        require(totalCreditsInUnits <= verificationReq.availableForSale, "Requested credits exceed Chainlink verified available amount");
        
        batchId = nextBatchId++;
        
        // Create BatchNFT metadata
        batchMetadata[batchId] = BatchMetadata({
            projectId: projectId,
            totalCredits: totalCredits,
            issuedCredits: 0,
            retiredCredits: 0,
            projectTokenAddress: address(0), // Will be set after token creation
            creditId: creditId,
            isActive: true,
            createdAt: block.timestamp,
            projectOwner: to
        });
        
        // Mint the BatchNFT
        _mint(to, batchId);
        
        // 🎯 Create ProjectToken with CHAINLINK VERIFIED data
        tokenAddress = tokenFactory.createProjectToken(
            batchId,
            address(this),
            verificationReq.gsId, // Use Chainlink verified GS ID as project ID
            to
        );
        
        // Establish dual-pointer connection
        batchToTokenContract[batchId] = tokenAddress;
        batchMetadata[batchId].projectTokenAddress = tokenAddress;
        
        // Set token URI with metadata
        _setTokenURI(batchId, _generateTokenURI(batchId));
        
        emit BatchMintedWithToken(batchId, tokenAddress, projectId, totalCredits, creditId);
        
        return (batchId, tokenAddress);
    }
    
    // Update issued credits (called by ProjectToken)
    function updateIssuedCredits(uint256 batchId, uint256 amount) external onlyProjectToken(batchId) validBatch(batchId) {
        BatchMetadata storage metadata = batchMetadata[batchId];
        metadata.issuedCredits += amount;
        
        require(metadata.issuedCredits <= metadata.totalCredits, "Cannot exceed total credits");
        
        emit CreditsIssued(batchId, amount, metadata.issuedCredits);
    }
    
    // Update retired credits (called by ProjectToken)
    function updateRetiredCredits(uint256 batchId, uint256 amount) external onlyProjectToken(batchId) validBatch(batchId) {
        BatchMetadata storage metadata = batchMetadata[batchId];
        metadata.retiredCredits += amount;
        
        require(metadata.retiredCredits <= metadata.issuedCredits, "Cannot retire more than issued");
        
        emit CreditsRetired(batchId, amount, metadata.retiredCredits);
        
        // Update token URI to reflect retirement
        _setTokenURI(batchId, _generateTokenURI(batchId));
    }
    
    // Generate dynamic token URI with CHAINLINK FUNCTIONS DATA as core metadata
    function _generateTokenURI(uint256 batchId) internal view returns (string memory) {
        BatchMetadata memory metadata = batchMetadata[batchId];
        
        // 🔥 CORE: Get verified data from Chainlink Functions Oracle
        CarbonVerificationOracle.CarbonCredit memory credit = verificationOracle.getCarbonCredit(metadata.creditId);
        bytes32 requestId = verificationOracle.creditToRequest(metadata.creditId);
        
        // Build metadata with Chainlink Functions data as primary source
        string memory basicInfo = _buildBasicMetadata(batchId, metadata, credit);
        string memory chainlinkData = _buildChainlinkMetadata(requestId, credit);
        
        string memory json = string(abi.encodePacked(basicInfo, chainlinkData, ']}'));
        
        return string(abi.encodePacked(
            'data:application/json;base64,',
            _base64Encode(bytes(json))
        ));
    }
    
    function _buildBasicMetadata(uint256 batchId, BatchMetadata memory metadata, CarbonVerificationOracle.CarbonCredit memory credit) internal pure returns (string memory) {
        string memory verificationStatus = credit.isVerified ? "VERIFIED" : "PENDING";
        
        return string(abi.encodePacked(
            '{"name": "Carbon Credit Batch #', batchId.toString(), '",',
            '"description": "Verified via Chainlink Functions - Real-time carbon credit data from Gold Standard API",',
            '"image": "https://ipfs.io/ipfs/QmCarbonCreditBatch/', batchId.toString(), '.png",',
            '"attributes": [',
            '{"trait_type": "Chainlink Verified", "value": "', verificationStatus, '"},',
            '{"trait_type": "Project ID", "value": "', metadata.projectId, '"},',
            '{"trait_type": "Oracle Credit ID", "value": ', metadata.creditId.toString(), '},'
        ));
    }
    
    function _buildChainlinkMetadata(bytes32 requestId, CarbonVerificationOracle.CarbonCredit memory credit) internal view returns (string memory) {
        if (requestId == bytes32(0)) {
            // No Chainlink request yet
            return string(abi.encodePacked(
                '{"trait_type": "Verification Status", "value": "Not Requested"},',
                '{"trait_type": "Oracle Amount", "value": ', credit.amount.toString(), '},',
                '{"trait_type": "Created At", "value": ', credit.createdAt.toString(), '}'
            ));
        }
        
        // Get LIVE Chainlink Functions data
        CarbonVerificationOracle.VerificationRequest memory verificationReq = verificationOracle.getVerificationRequest(requestId);
        
        if (!verificationReq.fulfilled) {
            return '{"trait_type": "Chainlink Status", "value": "Processing..."}';
        }
        
        // CORE FEATURE: Display real-time data from Chainlink Functions
        return string(abi.encodePacked(
            '{"trait_type": "GS Project ID", "value": "', verificationReq.gsId, '"},',
            '{"trait_type": "Available Credits", "value": ', verificationReq.availableForSale.toString(), '},',
            '{"trait_type": "Last Updated", "value": "', verificationReq.timestamp, '"},',
            '{"trait_type": "Verification Status", "value": ', _getVerificationStatusText(verificationReq.verificationStatus), '},',
            '{"trait_type": "Verified At", "value": ', credit.verifiedAt.toString(), '}'
        ));
    }
    
    function _getVerificationStatusText(uint8 status) internal pure returns (string memory) {
        if (status == 0) return '"Pending"';
        if (status == 1) return '"Verified"';
        if (status == 2) return '"Failed"';
        return '"Unknown"';
    }
    
    // Helper function to convert address to string
    function _addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2+i*2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3+i*2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
    
    // Simple base64 encoding for JSON metadata
    function _base64Encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        
        string memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        string memory result = new string(encodedLen + 32);
        
        assembly {
            let tablePtr := add(table, 1)
            let dataPtr := add(data, 32)
            let endPtr := add(dataPtr, mload(data))
            let resultPtr := add(result, 32)
            
            for {} lt(dataPtr, endPtr) {}
            {
                dataPtr := add(dataPtr, 3)
                let input := mload(dataPtr)
                
                mstore8(resultPtr, mload(add(tablePtr, and(shr(18, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(12, input), 0x3F)))) 
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr( 6, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(        input,  0x3F))))
                resultPtr := add(resultPtr, 1)
            }
            
            switch mod(mload(data), 3)
            case 1 { mstore8(sub(resultPtr, 1), 0x3d) mstore8(sub(resultPtr, 2), 0x3d) }
            case 2 { mstore8(sub(resultPtr, 1), 0x3d) }
        }
        
        return result;
    }
    
    // View functions
    function getBatchMetadata(uint256 batchId) external view returns (BatchMetadata memory) {
        return batchMetadata[batchId];
    }
    
    function getTokenFactory() external view returns (address) {
        return address(tokenFactory);
    }
    
    // Batch management functions
    function deactivateBatch(uint256 batchId) external onlyOwner validBatch(batchId) {
        batchMetadata[batchId].isActive = false;
    }
    
    function reactivateBatch(uint256 batchId) external onlyOwner validBatch(batchId) {
        batchMetadata[batchId].isActive = true;
    }
    
    // Emergency functions
    function emergencyUpdateBatchData(
        uint256 batchId,
        uint256 issuedCredits,
        uint256 retiredCredits
    ) external onlyOwner validBatch(batchId) {
        BatchMetadata storage metadata = batchMetadata[batchId];
        require(issuedCredits <= metadata.totalCredits, "Invalid issued credits");
        require(retiredCredits <= issuedCredits, "Invalid retired credits");
        
        metadata.issuedCredits = issuedCredits;
        metadata.retiredCredits = retiredCredits;
        
        // Update token URI
        _setTokenURI(batchId, _generateTokenURI(batchId));
    }
    
    // Override required functions
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize) internal virtual override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        // Prevent transfers of active batches (except minting)
        if (from != address(0) && to != address(0)) {
            require(!batchMetadata[tokenId].isActive || msg.sender == owner(), "Active batch cannot be transferred");
        }
    }
    
    function _burn(uint256 tokenId) internal virtual override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage, IERC165) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
} 