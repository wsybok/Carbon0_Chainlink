// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IBatchNFT is IERC721 {
    struct BatchMetadata {
        string projectId;
        uint256 totalCredits;
        uint256 issuedCredits;
        uint256 retiredCredits;
        address projectTokenAddress;
        uint256 creditId; // Reference to CarbonVerificationOracle creditId
        bool isActive;
        uint256 createdAt;
        address projectOwner;
    }
    
    // Batch management
    function mintBatchWithToken(
        address to,
        string memory projectId,
        uint256 totalCredits,
        uint256 creditId
    ) external returns (uint256 batchId, address tokenAddress);
    
    function updateIssuedCredits(uint256 batchId, uint256 amount) external;
    function updateRetiredCredits(uint256 batchId, uint256 amount) external;
    
    // View functions
    function getBatchMetadata(uint256 batchId) external view returns (BatchMetadata memory);
    function batchToTokenContract(uint256 batchId) external view returns (address);
    function getTokenFactory() external view returns (address);
    
    // Events
    event BatchMintedWithToken(
        uint256 indexed batchId,
        address indexed tokenAddress,
        string projectId,
        uint256 totalCredits,
        uint256 creditId
    );
    event CreditsIssued(uint256 indexed batchId, uint256 amount, uint256 totalIssued);
    event CreditsRetired(uint256 indexed batchId, uint256 amount, uint256 totalRetired);
} 