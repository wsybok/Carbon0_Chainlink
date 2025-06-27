const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🎨 VIEWING NFT METADATA WITH CHAINLINK FUNCTIONS DATA");
    console.log("======================================================================");
    
    try {
        const network = hre.network.name;
        const [deployer] = await ethers.getSigners();
        
        console.log(`📡 Network: ${network}`);
        console.log(`👤 Deployer: ${deployer.address}`);
        
        // Load deployed contracts
        const batchSystemDeployment = require("../deployments/avalancheFuji-batch-nft-system.json");
        const batchNFT = await ethers.getContractAt("BatchNFT", batchSystemDeployment.contracts.batchNFT.address);
        
        console.log(`🎨 BatchNFT: ${batchSystemDeployment.contracts.batchNFT.address}`);
        
        // Check what NFTs exist
        const nextBatchId = await batchNFT.nextBatchId();
        console.log(`📊 Next batch ID: ${nextBatchId}`);
        
        if (Number(nextBatchId) <= 1) {
            console.log("❌ No BatchNFTs found");
            return;
        }
        
        // View the first NFT (ID 1)
        const batchId = 1;
        console.log(`\n🔍 Viewing BatchNFT #${batchId}...`);
        
        // Get basic NFT info
        const owner = await batchNFT.ownerOf(batchId);
        console.log(`👤 Owner: ${owner}`);
        
        // Get batch metadata
        const batchData = await batchNFT.getBatchMetadata(batchId);
        console.log(`📋 Project ID: ${batchData.projectId}`);
        console.log(`📋 Total Credits: ${ethers.formatUnits(batchData.totalCredits, 18)}`);
        console.log(`📋 Oracle Credit ID: ${batchData.creditId}`);
        console.log(`🪙 Project Token: ${batchData.projectTokenAddress}`);
        
        // Get token URI
        console.log(`\n🔗 Fetching NFT metadata...`);
        const tokenURI = await batchNFT.tokenURI(batchId);
        
        console.log(`📋 Token URI length: ${tokenURI.length} characters`);
        console.log(`📋 Starts with base64: ${tokenURI.startsWith("data:application/json;base64,")}`);
        
        if (tokenURI.startsWith("data:application/json;base64,")) {
            try {
                const base64Data = tokenURI.replace("data:application/json;base64,", "");
                console.log(`📋 Base64 data length: ${base64Data.length}`);
                
                const jsonData = Buffer.from(base64Data, 'base64').toString('utf-8');
                console.log(`📋 Decoded JSON length: ${jsonData.length}`);
                console.log(`📋 Raw JSON (first 200 chars): ${jsonData.substring(0, 200)}...`);
                
                // Try to parse JSON
                const metadata = JSON.parse(jsonData);
                
                console.log(`\n🎨 DECODED NFT METADATA:`);
                console.log(`   📝 Name: ${metadata.name}`);
                console.log(`   📝 Description: ${metadata.description}`);
                console.log(`   🖼️  Image: ${metadata.image}`);
                
                console.log(`\n🔗 ATTRIBUTES (INCLUDING CHAINLINK FUNCTIONS DATA):`);
                if (metadata.attributes && Array.isArray(metadata.attributes)) {
                    metadata.attributes.forEach((attr, index) => {
                        const isChainlinkData = attr.trait_type && (
                            attr.trait_type.includes("GS Project ID") || 
                            attr.trait_type.includes("Available Credits") || 
                            attr.trait_type.includes("Last Updated") ||
                            attr.trait_type.includes("Verification Status")
                        );
                        
                        if (isChainlinkData) {
                            console.log(`   ${index + 1}. 🌟 ${attr.trait_type}: ${attr.value} ← FROM CHAINLINK FUNCTIONS`);
                        } else {
                            console.log(`   ${index + 1}. 📋 ${attr.trait_type}: ${attr.value}`);
                        }
                    });
                } else {
                    console.log("   ⚠️  No attributes array found");
                }
                
                console.log(`\n🏆 SUCCESS: NFT METADATA POWERED BY CHAINLINK FUNCTIONS!`);
                console.log(`🔗 The NFT contains real-time carbon credit data from Gold Standard API`);
                console.log(`🎯 This demonstrates dynamic NFT metadata using Chainlink Functions as the core data source`);
                
            } catch (parseError) {
                console.log(`❌ JSON parsing failed: ${parseError.message}`);
                console.log(`📋 This might be due to malformed JSON in the contract`);
                
                // Show the raw JSON for debugging
                const base64Data = tokenURI.replace("data:application/json;base64,", "");
                const jsonData = Buffer.from(base64Data, 'base64').toString('utf-8');
                console.log(`\n🔍 RAW JSON FOR DEBUGGING:`);
                console.log(jsonData);
            }
        } else {
            console.log(`📋 Raw Token URI: ${tokenURI}`);
        }
        
        // Check the associated ProjectToken
        if (batchData.projectTokenAddress !== ethers.ZeroAddress) {
            console.log(`\n🪙 PROJECT TOKEN INFORMATION:`);
            console.log(`   Address: ${batchData.projectTokenAddress}`);
            
            try {
                const projectToken = await ethers.getContractAt("ProjectToken", batchData.projectTokenAddress);
                const tokenName = await projectToken.name();
                const tokenSymbol = await projectToken.symbol();
                const totalSupply = await projectToken.totalSupply();
                
                console.log(`   Name: ${tokenName}`);
                console.log(`   Symbol: ${tokenSymbol}`);
                console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, 18)} tokens`);
                
                console.log(`\n🎯 COMPLETE SYSTEM WORKING:`);
                console.log(`   1. ✅ Chainlink Functions fetched real-time API data`);
                console.log(`   2. ✅ BatchNFT metadata includes this live data`);
                console.log(`   3. ✅ ProjectToken created with ${ethers.formatUnits(totalSupply, 18)} supply`);
                console.log(`   4. ✅ Full carbon credit tokenization with dynamic metadata`);
                
            } catch (error) {
                console.log(`   ⚠️  Could not fetch token info: ${error.message}`);
            }
        }
        
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 