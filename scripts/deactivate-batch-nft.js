// ============================================================================
// scripts/deactivate-batch-nft.js - Deactivate BatchNFT #2
// ============================================================================

const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
    console.log("🔧 DEACTIVATING BATCHNFT #2");
    console.log("=" .repeat(50));
    
    const network = hre.network.name;
    const [deployer] = await ethers.getSigners();
    
    console.log(`🌐 Network: ${network}`);
    console.log(`👤 Deployer: ${deployer.address}`);
    
    // Load deployed contracts
    const deploymentInfo = require(`../deployments/${network}-batch-nft-system.json`);
    const batchNFTAddress = deploymentInfo.contracts.batchNFT.address;
    
    console.log(`📱 BatchNFT Contract: ${batchNFTAddress}`);
    
    const batchNFT = await ethers.getContractAt("BatchNFT", batchNFTAddress);
    
    // Check current status of BatchNFT #2
    const batchId = 2;
    console.log(`\n🔍 Checking current status of BatchNFT #${batchId}...`);
    
    try {
        const metadata = await batchNFT.getBatchMetadata(batchId);
        console.log(`📋 Project ID: ${metadata.projectId}`);
        console.log(`📊 Total Credits: ${ethers.formatUnits(metadata.totalCredits, 18)}`);
        console.log(`🟢 Currently Active: ${metadata.isActive}`);
        console.log(`👤 Project Owner: ${metadata.projectOwner}`);
        
        if (!metadata.isActive) {
            console.log(`⚠️  BatchNFT #${batchId} is already inactive!`);
            return;
        }
        
        // Check if deployer is the owner
        const contractOwner = await batchNFT.owner();
        console.log(`\n🔐 Contract Owner: ${contractOwner}`);
        console.log(`👤 Current Signer: ${deployer.address}`);
        
        if (contractOwner.toLowerCase() !== deployer.address.toLowerCase()) {
            console.log(`❌ Error: Only contract owner can deactivate BatchNFTs`);
            console.log(`📝 Current signer is not the contract owner`);
            return;
        }
        
        // Deactivate BatchNFT #2
        console.log(`\n🔧 Deactivating BatchNFT #${batchId}...`);
        
        const tx = await batchNFT.deactivateBatch(batchId);
        console.log(`⏳ Transaction sent: ${tx.hash}`);
        console.log(`🔗 Explorer: https://testnet.snowtrace.io/tx/${tx.hash}`);
        
        console.log(`⏳ Waiting for confirmation...`);
        const receipt = await tx.wait();
        
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}!`);
        
        // Verify the change
        const updatedMetadata = await batchNFT.getBatchMetadata(batchId);
        console.log(`\n📊 UPDATED STATUS:`);
        console.log(`🔴 BatchNFT #${batchId} Active: ${updatedMetadata.isActive}`);
        
        if (!updatedMetadata.isActive) {
            console.log(`✅ SUCCESS: BatchNFT #${batchId} has been deactivated!`);
            console.log(`📝 It will now show as INACTIVE in the gallery`);
            console.log(`⛓️  The NFT remains on-chain but is marked as inactive`);
            console.log(`🎯 Perfect for hackathon demo - now only shows unique projects!`);
        } else {
            console.log(`❌ ERROR: BatchNFT #${batchId} is still active`);
        }
        
    } catch (error) {
        if (error.message.includes('Batch does not exist')) {
            console.log(`❌ BatchNFT #${batchId} does not exist`);
        } else {
            console.error(`❌ Error: ${error.message}`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 