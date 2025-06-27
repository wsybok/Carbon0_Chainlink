// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IProjectToken.sol";
import "./interfaces/IBatchNFT.sol";

contract ProjectToken is ERC20, Ownable, IProjectToken {
    // Connection to BatchNFT
    uint256 public immutable batchId;
    address public immutable batchNftContract;
    address public immutable tokenFactory;
    
    // Carbon credit tracking
    uint256 public totalRetired;
    
    // Retirement records
    struct RetirementRecord {
        address user;
        uint256 amount;
        string reason;
        uint256 timestamp;
        uint256 retirementId;
    }
    
    mapping(uint256 => RetirementRecord) public retirementRecords;
    mapping(address => uint256[]) public userRetirements;
    uint256 public nextRetirementId = 1;
    
    // Modifiers
    modifier onlyBatchNFT() {
        require(msg.sender == batchNftContract, "Only BatchNFT can call this");
        _;
    }
    
    modifier onlyAuthorizedMinter() {
        require(
            msg.sender == batchNftContract || msg.sender == owner(),
            "Not authorized to mint"
        );
        _;
    }
    
    constructor(
        uint256 _batchId,
        address _batchNftContract,
        address _tokenFactory,
        string memory _name,
        string memory _symbol,
        address _owner
    ) ERC20(_name, _symbol) {
        _transferOwnership(_owner);
        batchId = _batchId;
        batchNftContract = _batchNftContract;
        tokenFactory = _tokenFactory;
    }
    
    // Minting function - only callable by BatchNFT or owner
    function mint(address to, uint256 amount) external onlyAuthorizedMinter {
        _mint(to, amount);
        
        // Sync with BatchNFT
        _syncIssuedCredits(amount);
    }
    
    // Carbon credit retirement function
    function retire(uint256 amount, string memory reason) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        require(amount > 0, "Amount must be greater than 0");
        require(bytes(reason).length > 0, "Retirement reason required");
        
        // Burn tokens
        _burn(msg.sender, amount);
        
        // Update retirement tracking
        totalRetired += amount;
        
        // Create retirement record
        uint256 retirementId = nextRetirementId++;
        retirementRecords[retirementId] = RetirementRecord({
            user: msg.sender,
            amount: amount,
            reason: reason,
            timestamp: block.timestamp,
            retirementId: retirementId
        });
        
        userRetirements[msg.sender].push(retirementId);
        
        // Sync with BatchNFT
        _syncRetiredCredits(amount);
        
        emit CarbonCreditsRetired(msg.sender, amount, reason, block.timestamp);
    }
    
    // Internal function to sync issued credits with BatchNFT
    function _syncIssuedCredits(uint256 amount) internal {
        try IBatchNFT(batchNftContract).updateIssuedCredits(batchId, amount) {
            // Successfully synced
        } catch {
            // Log sync failure but don't revert the mint
            emit BatchConnectionValidated(false, "Failed to sync issued credits");
        }
    }
    
    // Internal function to sync retired credits with BatchNFT
    function _syncRetiredCredits(uint256 amount) internal {
        try IBatchNFT(batchNftContract).updateRetiredCredits(batchId, amount) {
            // Successfully synced
        } catch {
            // Log sync failure but don't revert the retirement
            emit BatchConnectionValidated(false, "Failed to sync retired credits");
        }
    }
    
    // Validate connection to BatchNFT
    function validateBatchConnection() external view returns (bool isValid, string memory errorMessage) {
        // Check if BatchNFT exists
        if (batchNftContract == address(0)) {
            return (false, "BatchNFT contract address is zero");
        }
        
        // Check if NFT exists
        try IBatchNFT(batchNftContract).ownerOf(batchId) returns (address) {
            // NFT exists, check mapping
            try IBatchNFT(batchNftContract).batchToTokenContract(batchId) returns (address tokenAddr) {
                if (tokenAddr != address(this)) {
                    return (false, "BatchNFT mapping does not point to this contract");
                }
                
                // Check data consistency
                try IBatchNFT(batchNftContract).getBatchMetadata(batchId) returns (IBatchNFT.BatchMetadata memory metadata) {
                    if (metadata.issuedCredits != totalSupply()) {
                        return (false, "Issued credits mismatch with total supply");
                    }
                    if (metadata.retiredCredits != totalRetired) {
                        return (false, "Retired credits mismatch");
                    }
                    
                    return (true, "Connection validated successfully");
                } catch {
                    return (false, "Failed to get batch metadata");
                }
            } catch {
                return (false, "Failed to get token contract from BatchNFT");
            }
        } catch {
            return (false, "BatchNFT does not exist");
        }
    }
    
    // Get user retirement history
    function getUserRetirements(address user) external view returns (uint256[] memory) {
        return userRetirements[user];
    }
    
    // Get retirement record details
    function getRetirementRecord(uint256 retirementId) external view returns (RetirementRecord memory) {
        return retirementRecords[retirementId];
    }
    
    // Override transfer functions to validate connection before transfers
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);
        
        // Skip validation for minting/burning
        if (from == address(0) || to == address(0)) {
            return;
        }
        
        // Validate connection on transfers
        (bool isValid,) = this.validateBatchConnection();
        require(isValid, "BatchNFT connection invalid");
    }
    
    // Emergency functions (only owner)
    function emergencyRecoverConnection() external onlyOwner {
        // This can be used to manually sync data in case of desync
        try IBatchNFT(batchNftContract).getBatchMetadata(batchId) returns (IBatchNFT.BatchMetadata memory metadata) {
            // Update BatchNFT with current state
            if (metadata.issuedCredits != totalSupply()) {
                IBatchNFT(batchNftContract).updateIssuedCredits(batchId, totalSupply() - metadata.issuedCredits);
            }
            if (metadata.retiredCredits != totalRetired) {
                IBatchNFT(batchNftContract).updateRetiredCredits(batchId, totalRetired - metadata.retiredCredits);
            }
            
            emit BatchConnectionValidated(true, "Connection recovered successfully");
        } catch {
            emit BatchConnectionValidated(false, "Failed to recover connection");
        }
    }
} 