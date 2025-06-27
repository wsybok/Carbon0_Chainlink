// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IProjectToken is IERC20 {
    // Project token specific functions
    function batchId() external view returns (uint256);
    function batchNftContract() external view returns (address);
    function tokenFactory() external view returns (address);
    function totalRetired() external view returns (uint256);
    
    // Minting and burning functions
    function mint(address to, uint256 amount) external;
    function retire(uint256 amount, string memory reason) external; 
    
    // Validation
    function validateBatchConnection() external view returns (bool isValid, string memory errorMessage);
    
    // Events
    event CarbonCreditsRetired(address indexed user, uint256 amount, string reason, uint256 timestamp);
    event BatchConnectionValidated(bool isValid, string message);
} 