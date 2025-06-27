const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🎨 MINTING BATCH NFT (SIMPLIFIED)");
    console.log("======================================================================");
    
    try {
        const network = hre.network.name;
        const [deployer] = await ethers.getSigners();
        
        console.log(`📡 Network: ${network}`);
        console.log(`👤 Deployer: ${deployer.address}`);
        console.log(`💰 Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} AVAX`);
        
        // Load deployed contracts
        const oracleDeployment = require("../deployments/avalancheFuji-oracle-deployment.json");
        const batchSystemDeployment = require("../deployments/avalancheFuji-batch-nft-system.json");
        
        const batchNFT = await ethers.getContractAt("BatchNFT", batchSystemDeployment.contracts.batchNFT.address);
        
        console.log(`🎨 BatchNFT: ${batchSystemDeployment.contracts.batchNFT.address}`);
        
        // Minting parameters (all verified by debug script)
        const recipient = deployer.address;
        const projectId = "GS-15234";
        const totalCredits = ethers.parseUnits("5000", 18);
        const creditId = 2;
        
        console.log(`\n🔄 Minting BatchNFT...`);
        console.log(`   📋 Recipient: ${recipient}`);
        console.log(`   📋 Project ID: ${projectId}`);
        console.log(`   📋 Total Credits: ${ethers.formatUnits(totalCredits, 18)}`);
        console.log(`   📋 Credit ID: ${creditId}`);
        
        // Estimate gas first
        try {
            const gasEstimate = await batchNFT.mintBatchWithToken.estimateGas(
                recipient,
                projectId,
                totalCredits,
                creditId
            );
            console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
        } catch (gasError) {
            console.log(`⚠️  Gas estimation failed: ${gasError.message}`);
            console.log("   This might indicate the transaction will revert");
            
            // Try to get more specific error info
            try {
                await batchNFT.mintBatchWithToken.staticCall(
                    recipient,
                    projectId,
                    totalCredits,
                    creditId
                );
            } catch (staticError) {
                console.log(`🔍 Static call error: ${staticError.message}`);
                
                // Check if it's a specific revert reason
                if (staticError.message.includes("Carbon credit not verified")) {
                    console.log("❌ Issue: Carbon credit not verified by Chainlink Functions");
                } else if (staticError.message.includes("Chainlink verification not completed")) {
                    console.log("❌ Issue: Chainlink verification not completed");
                } else if (staticError.message.includes("Chainlink verification failed")) {
                    console.log("❌ Issue: Chainlink verification failed");
                } else if (staticError.message.includes("exceed Chainlink verified available amount")) {
                    console.log("❌ Issue: Requested credits exceed Chainlink verified available amount");
                } else {
                    console.log("❌ Issue: Unknown contract revert");
                }
                return;
            }
        }
        
        // Get current gas price
        const feeData = await ethers.provider.getFeeData();
        console.log(`⛽ Gas price: ${feeData.gasPrice} gwei`);
        
        // Attempt the transaction
        console.log(`\n⏳ Sending transaction...`);
        const mintTx = await batchNFT.mintBatchWithToken(
            recipient,
            projectId,
            totalCredits,
            creditId,
            {
                gasLimit: 3000000, // Higher gas limit
                gasPrice: feeData.gasPrice
            }
        );
        
        console.log(`📤 Transaction hash: ${mintTx.hash}`);
        console.log(`⏳ Waiting for confirmation...`);
        
        const receipt = await mintTx.wait();
        console.log(`✅ Transaction confirmed in block: ${receipt.blockNumber}`);
        console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
        
        // Extract batch ID from events
        let batchId, tokenAddress;
        for (const log of receipt.logs) {
            try {
                const parsed = batchNFT.interface.parseLog(log);
                if (parsed && parsed.name === "BatchMintedWithToken") {
                    batchId = Number(parsed.args.batchId);
                    tokenAddress = parsed.args.tokenAddress;
                    console.log(`🎨 BatchNFT #${batchId} minted successfully!`);
                    console.log(`🪙 ProjectToken created: ${tokenAddress}`);
                    break;
                }
            } catch (e) {
                // Skip non-matching logs
            }
        }
        
        if (!batchId) {
            const nextBatchId = await batchNFT.nextBatchId();
            batchId = Number(nextBatchId) - 1;
            tokenAddress = await batchNFT.batchToTokenContract(batchId);
            console.log(`🎨 BatchNFT #${batchId} minted (fallback detection)`);
            console.log(`🪙 ProjectToken: ${tokenAddress}`);
        }
        
        // Now fetch and display the NFT metadata with Chainlink Functions data
        console.log(`\n🔗 FETCHING NFT METADATA WITH CHAINLINK FUNCTIONS DATA...`);
        
        const tokenURI = await batchNFT.tokenURI(batchId);
        console.log(`\n🎨 NFT Metadata for BatchNFT #${batchId}:`);
        
        if (tokenURI.startsWith("data:application/json;base64,")) {
            const base64Data = tokenURI.replace("data:application/json;base64,", "");
            const jsonData = Buffer.from(base64Data, 'base64').toString('utf-8');
            const metadata = JSON.parse(jsonData);
            
            console.log(`\n📝 DECODED NFT METADATA:`);
            console.log(`   🎨 Name: ${metadata.name}`);
            console.log(`   📝 Description: ${metadata.description}`);
            console.log(`   🖼️  Image: ${metadata.image}`);
            
            console.log(`\n🔗 ATTRIBUTES (INCLUDING CHAINLINK FUNCTIONS DATA):`);
            metadata.attributes.forEach((attr, index) => {
                const isChainlinkData = attr.trait_type.includes("GS Project ID") || 
                                       attr.trait_type.includes("Available Credits") || 
                                       attr.trait_type.includes("Last Updated") ||
                                       attr.trait_type.includes("Verification Status");
                
                if (isChainlinkData) {
                    console.log(`   ${index + 1}. 🌟 ${attr.trait_type}: ${attr.value} ← FROM CHAINLINK FUNCTIONS`);
                } else {
                    console.log(`   ${index + 1}. 📋 ${attr.trait_type}: ${attr.value}`);
                }
            });
            
            console.log(`\n🏆 SUCCESS: NFT METADATA POWERED BY CHAINLINK FUNCTIONS!`);
            console.log(`🔗 The NFT now contains real-time carbon credit data from Gold Standard API`);
            console.log(`🎯 This demonstrates dynamic NFT metadata using Chainlink Functions as the core data source`);
            
        } else {
            console.log(`📋 Raw Token URI: ${tokenURI}`);
        }
        
        console.log(`\n✅ COMPLETE SYSTEM DEMONSTRATION SUCCESSFUL!`);
        
    } catch (error) {
        console.error("❌ Minting failed:", error);
        
        if (error.message.includes("execution reverted")) {
            console.log("\n💡 The transaction reverted. This could be due to:");
            console.log("   • Contract validation failure");
            console.log("   • Gas estimation issues");
            console.log("   • Network congestion");
            console.log("   • Smart contract logic preventing the mint");
        }
        
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 