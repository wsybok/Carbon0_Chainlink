// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./ProjectToken.sol";
import "./interfaces/IProjectToken.sol";

contract TokenFactory is Ownable {
    // Events
    event ProjectTokenCreated(
        uint256 indexed batchId,
        address indexed tokenAddress,
        address indexed batchNftContract,
        string name,
        string symbol
    );
    
    // Tracking created tokens
    mapping(uint256 => address) public batchIdToToken;
    mapping(address => uint256) public tokenToBatchId;
    address[] public allTokens;
    
    // Only BatchNFT contracts can create tokens
    mapping(address => bool) public authorizedContracts;
    
    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }
    
    constructor() {}
    
    // Authorize BatchNFT contract to create tokens
    function authorizeContract(address batchNftContract) external onlyOwner {
        authorizedContracts[batchNftContract] = true;
    }
    
    // Remove authorization
    function deauthorizeContract(address batchNftContract) external onlyOwner {
        authorizedContracts[batchNftContract] = false;
    }
    
    // Create a new ProjectToken for a BatchNFT
    function createProjectToken(
        uint256 batchId,
        address batchNftContract,
        string memory projectId,
        address projectOwner
    ) external onlyAuthorized returns (address tokenAddress) {
        require(batchIdToToken[batchId] == address(0), "Token already exists for this batch");
        require(batchNftContract != address(0), "Invalid BatchNFT contract");
        require(projectOwner != address(0), "Invalid project owner");
        
        // Generate token name and symbol
        string memory tokenName = string(abi.encodePacked("CarbonCredit-", projectId, "-2024"));
        string memory tokenSymbol = _generateTokenSymbol(projectId);
        
        // Deploy new ProjectToken
        ProjectToken newToken = new ProjectToken(
            batchId,
            batchNftContract,
            address(this),
            tokenName,
            tokenSymbol,
            projectOwner
        );
        
        tokenAddress = address(newToken);
        
        // Track the new token
        batchIdToToken[batchId] = tokenAddress;
        tokenToBatchId[tokenAddress] = batchId;
        allTokens.push(tokenAddress);
        
        emit ProjectTokenCreated(batchId, tokenAddress, batchNftContract, tokenName, tokenSymbol);
        
        return tokenAddress;
    }
    
    // Generate token symbol from project ID
    function _generateTokenSymbol(string memory projectId) internal pure returns (string memory) {
        bytes memory projectBytes = bytes(projectId);
        
        if (projectBytes.length == 0) {
            return "CC-UNK-2024";
        }
        
        // For projects like "VCS-001" or "GS-15234", extract meaningful parts
        if (projectBytes.length >= 3) {
            // Extract first 3 characters and add suffix
            string memory prefix = string(abi.encodePacked(
                projectBytes[0],
                projectBytes[1],
                projectBytes[2]
            ));
            
            // Handle common standards
            if (keccak256(projectBytes) == keccak256(bytes("VCS"))) {
                return "CC-VCS-2024";
            } else if (keccak256(abi.encodePacked(projectBytes[0], projectBytes[1])) == keccak256(bytes("GS"))) {
                return "CC-GS-2024";
            } else {
                return string(abi.encodePacked("CC-", prefix, "-2024"));
            }
        }
        
        return "CC-FOR-2024"; // Default fallback
    }
    
    // View functions
    function getTokenAddress(uint256 batchId) external view returns (address) {
        return batchIdToToken[batchId];
    }
    
    function getBatchId(address tokenAddress) external view returns (uint256) {
        return tokenToBatchId[tokenAddress];
    }
    
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }
    
    function getTotalTokens() external view returns (uint256) {
        return allTokens.length;
    }
    
    function isTokenCreated(uint256 batchId) external view returns (bool) {
        return batchIdToToken[batchId] != address(0);
    }
    
    // Get token info
    function getTokenInfo(uint256 batchId) external view returns (
        address tokenAddress,
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint256 totalRetired,
        bool isValid
    ) {
        tokenAddress = batchIdToToken[batchId];
        if (tokenAddress == address(0)) {
            return (address(0), "", "", 0, 0, false);
        }
        
        IProjectToken token = IProjectToken(tokenAddress);
        name = IERC20Metadata(tokenAddress).name();
        symbol = IERC20Metadata(tokenAddress).symbol();
        totalSupply = token.totalSupply();
        totalRetired = token.totalRetired();
        (isValid,) = token.validateBatchConnection();
    }
    
    // Emergency functions
    function emergencyValidateAllTokens() external view onlyOwner returns (
        address[] memory invalidTokens,
        uint256 invalidCount
    ) {
        invalidTokens = new address[](allTokens.length);
        invalidCount = 0;
        
        for (uint256 i = 0; i < allTokens.length; i++) {
            try IProjectToken(allTokens[i]).validateBatchConnection() returns (bool isValid, string memory) {
                if (!isValid) {
                    invalidTokens[invalidCount] = allTokens[i];
                    invalidCount++;
                }
            } catch {
                invalidTokens[invalidCount] = allTokens[i];
                invalidCount++;
            }
        }
    }
} 