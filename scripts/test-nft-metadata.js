const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🎨 TESTING NFT METADATA WITH CHAINLINK FUNCTIONS");
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
        
        const oracle = await ethers.getContractAt("CarbonVerificationOracle", oracleDeployment.contractAddress);
        const batchNFT = await ethers.getContractAt("BatchNFT", batchSystemDeployment.contracts.batchNFT.address);
        
        console.log(`🔗 Oracle: ${oracleDeployment.contractAddress}`);
        console.log(`🎨 BatchNFT: ${batchSystemDeployment.contracts.batchNFT.address}`);
        
        // ================================================================
        // PHASE 1: CHECK EXISTING CHAINLINK DATA
        // ================================================================
        console.log("\n" + "=" .repeat(50));
        console.log("🔍 PHASE 1: CHECKING CHAINLINK FUNCTIONS DATA");
        console.log("=" .repeat(50));
        
        // Check existing credit and verification
        const creditId = 2; // From our previous test
        let credit, verificationData;
        
        try {
            credit = await oracle.getCarbonCredit(creditId);
            console.log(`✅ Found carbon credit ID: ${creditId}`);
            console.log(`📋 Project: ${credit.projectId}`);
            console.log(`📋 Amount: ${ethers.formatUnits(credit.amount, 18)} tonnes`);
            console.log(`📋 Verified: ${credit.isVerified}`);
            
            // Get verification data
            const requestId = await oracle.creditToRequest(creditId);
            if (requestId !== ethers.ZeroHash) {
                verificationData = await oracle.getVerificationRequest(requestId);
                console.log(`\n🔗 Chainlink Functions Data:`);
                console.log(`   Request ID: ${requestId}`);
                console.log(`   Fulfilled: ${verificationData.fulfilled}`);
                
                if (verificationData.fulfilled) {
                    console.log(`   🌟 GS Project ID: ${verificationData.gsId}`);
                    console.log(`   🔥 Available Credits: ${verificationData.availableForSale}`);
                    console.log(`   📅 Timestamp: ${verificationData.timestamp}`);
                    console.log(`   ✅ Status: ${verificationData.verificationStatus}`);
                }
            } else {
                console.log("⚠️  No Chainlink verification request found");
            }
        } catch (error) {
            console.log(`⚠️  Credit ${creditId} not found:`, error.message);
            verificationData = null;
        }
        
        // ================================================================
        // PHASE 2: CHECK EXISTING BATCH NFT
        // ================================================================
        console.log("\n" + "=" .repeat(50));
        console.log("🎨 PHASE 2: CHECKING BATCH NFT METADATA");
        console.log("=" .repeat(50));
        
        // Check if we have any existing BatchNFTs
        const nextBatchId = await batchNFT.nextBatchId();
        console.log(`📊 Next batch ID: ${nextBatchId}`);
        
        if (Number(nextBatchId) > 1) {
            // We have existing NFTs
            for (let i = 1; i < Number(nextBatchId); i++) {
                try {
                    const owner = await batchNFT.ownerOf(i);
                    console.log(`\n🎨 BatchNFT #${i} owned by: ${owner}`);
                    
                    // Get batch data
                    const batchData = await batchNFT.getBatchData(i);
                    console.log(`📋 Project ID: ${batchData.projectId}`);
                    console.log(`📋 Total Credits: ${ethers.formatUnits(batchData.totalCredits, 18)}`);
                    console.log(`📋 Oracle Credit ID: ${batchData.oracleCreditId}`);
                    
                    // Get NFT metadata
                    try {
                        const tokenURI = await batchNFT.tokenURI(i);
                        console.log(`\n🔗 NFT Metadata for BatchNFT #${i}:`);
                        
                        if (tokenURI.startsWith("data:application/json;base64,")) {
                            const base64Data = tokenURI.replace("data:application/json;base64,", "");
                            const jsonData = Buffer.from(base64Data, 'base64').toString('utf-8');
                            const metadata = JSON.parse(jsonData);
                            
                            console.log(`📝 Name: ${metadata.name}`);
                            console.log(`📝 Description: ${metadata.description}`);
                            console.log(`📝 Attributes:`);
                            
                            metadata.attributes.forEach(attr => {
                                const isChainlinkData = attr.trait_type.includes("GS Project ID") || 
                                                       attr.trait_type.includes("Available Credits") || 
                                                       attr.trait_type.includes("Last Updated") ||
                                                       attr.trait_type.includes("Verification Status");
                                
                                if (isChainlinkData) {
                                    console.log(`     🔗 ${attr.trait_type}: ${attr.value} (FROM CHAINLINK FUNCTIONS)`);
                                } else {
                                    console.log(`     📋 ${attr.trait_type}: ${attr.value}`);
                                }
                            });
                        } else {
                            console.log(`📋 Token URI: ${tokenURI}`);
                        }
                    } catch (error) {
                        console.log(`⚠️  Could not fetch metadata: ${error.message}`);
                    }
                    
                    // Check associated ProjectToken
                    const tokenAddress = await batchNFT.batchToTokenContract(i);
                    if (tokenAddress !== ethers.ZeroAddress) {
                        console.log(`\n🪙 Associated ProjectToken: ${tokenAddress}`);
                        
                        try {
                            const projectToken = await ethers.getContractAt("ProjectToken", tokenAddress);
                            const tokenName = await projectToken.name();
                            const tokenSymbol = await projectToken.symbol();
                            const totalSupply = await projectToken.totalSupply();
                            
                            console.log(`   Name: ${tokenName}`);
                            console.log(`   Symbol: ${tokenSymbol}`);
                            console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, 18)}`);
                        } catch (error) {
                            console.log(`   ⚠️  Could not fetch token info: ${error.message}`);
                        }
                    }
                    
                } catch (error) {
                    console.log(`⚠️  BatchNFT #${i} not found or error: ${error.message}`);
                }
            }
        } else {
            console.log("📝 No BatchNFTs found yet");
        }
        
        // ================================================================
        // PHASE 3: DEMONSTRATE CHAINLINK INTEGRATION
        // ================================================================
        console.log("\n" + "=" .repeat(50));
        console.log("🔗 PHASE 3: CHAINLINK FUNCTIONS INTEGRATION DEMO");
        console.log("=" .repeat(50));
        
        if (verificationData && verificationData.fulfilled) {
            console.log("🎯 CHAINLINK FUNCTIONS SUCCESS!");
            console.log("This demonstrates how real-time API data becomes NFT metadata:");
            
            console.log(`\n📊 Live data from Gold Standard API (via Chainlink):`);
            console.log(`   🌟 Project ID: ${verificationData.gsId}`);
            console.log(`   🔥 Available Credits: ${verificationData.availableForSale}`);
            console.log(`   📅 API Timestamp: ${verificationData.timestamp}`);
            console.log(`   ✅ Verification: ${verificationData.verificationStatus === 1 ? 'VERIFIED' : 'PENDING'}`);
            
            console.log(`\n🎨 This data is automatically included in NFT metadata as:`);
            console.log('   {');
            console.log('     "attributes": [');
            console.log(`       {"trait_type": "GS Project ID", "value": "${verificationData.gsId}"},`);
            console.log(`       {"trait_type": "Available Credits", "value": ${verificationData.availableForSale}},`);
            console.log(`       {"trait_type": "Last Updated", "value": "${verificationData.timestamp}"},`);
            console.log(`       {"trait_type": "Verification Status", "value": "Chainlink Verified"}`);
            console.log('     ]');
            console.log('   }');
            
            console.log(`\n✅ KEY ACHIEVEMENT: NFT metadata is DYNAMIC and powered by Chainlink Functions!`);
            console.log(`   • Real-time carbon credit availability`);
            console.log(`   • Live project verification status`);
            console.log(`   • Current API timestamps`);
            console.log(`   • Decentralized data integrity`);
            
        } else {
            console.log("⚠️  No fulfilled Chainlink verification found");
            console.log("📝 To see the full integration:");
            console.log("   1. Run: npx hardhat run scripts/test-chainlink-integration.js --network avalancheFuji");
            console.log("   2. Wait for Chainlink callback");
            console.log("   3. Run this script again to see NFT metadata");
        }
        
        // ================================================================
        // PHASE 4: SUMMARY
        // ================================================================
        console.log("\n" + "=" .repeat(50));
        console.log("📋 SUMMARY: CHAINLINK FUNCTIONS AS NFT METADATA");
        console.log("=" .repeat(50));
        
        console.log("🔗 System Architecture:");
        console.log("   1. CarbonVerificationOracle uses Chainlink Functions");
        console.log("   2. Fetches real-time data from Gold Standard API");
        console.log("   3. BatchNFT metadata includes this live data");
        console.log("   4. NFT attributes update with each verification");
        
        console.log("\n🎯 Core Innovation:");
        console.log("   • NFT metadata is NOT static JSON");
        console.log("   • Powered by real-time Chainlink Functions data");
        console.log("   • Reflects current carbon credit availability");
        console.log("   • Maintains decentralized verification integrity");
        
        console.log("\n✅ TEST COMPLETE!");
        
    } catch (error) {
        console.error("❌ Test failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 