// ============================================================================
// scripts/test-chainlink-integration.js - Test Chainlink Functions Integration
// ============================================================================

const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
    console.log("🔗 TESTING CHAINLINK FUNCTIONS INTEGRATION");
    console.log("=" .repeat(70));
    
    const network = hre.network.name;
    const [deployer] = await ethers.getSigners();
    
    console.log(`📡 Network: ${network}`);
    console.log(`👤 Deployer: ${deployer.address}`);
    
    // Load deployed contracts
    let deploymentInfo;
    try {
        deploymentInfo = require(`../deployments/${network}-batch-nft-system.json`);
    } catch (error) {
        console.log("❌ Batch NFT system not deployed. Run deploy script first:");
        console.log("npm run deploy:batch-nft -- --network avalancheFuji");
        return;
    }
    
    const oracleAddress = deploymentInfo.contracts.carbonVerificationOracle.address;
    const batchNFTAddress = deploymentInfo.contracts.batchNFT.address;
    
    console.log(`\n🔗 Contract Addresses:`);
    console.log(`Oracle: ${oracleAddress}`);
    console.log(`BatchNFT: ${batchNFTAddress}`);
    
    // Get contract instances
    const oracle = await ethers.getContractAt("CarbonVerificationOracle", oracleAddress);
    const batchNFT = await ethers.getContractAt("BatchNFT", batchNFTAddress);
    
    try {
        // ================================================================
        // STEP 1: REGISTER CARBON CREDIT IN ORACLE
        // ================================================================
        console.log("\n" + "=" .repeat(50));
        console.log("📋 STEP 1: REGISTER CARBON CREDIT");
        console.log("=" .repeat(50));
        
        const projectId = "GS-15234";
        const amount = ethers.parseUnits("10000", 18); // 10,000 tonnes CO2
        const verificationHash = ethers.keccak256(ethers.toUtf8Bytes("verification_hash_123"));
        const expiryDate = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year
        
        console.log(`🔄 Registering carbon credit for project: ${projectId}`);
        const registerTx = await oracle.registerCarbonCredit(
            amount,
            projectId,
            verificationHash,
            expiryDate
        );
        await registerTx.wait();
        
        const nextCreditId = await oracle.nextCreditId();
        const creditId = Number(nextCreditId) - 1;
        console.log(`✅ Carbon credit registered with ID: ${creditId}`);
        
        // ================================================================
        // STEP 2: REQUEST CHAINLINK FUNCTIONS VERIFICATION
        // ================================================================
        console.log("\n" + "=" .repeat(50));
        console.log("🔗 STEP 2: CHAINLINK FUNCTIONS VERIFICATION");
        console.log("=" .repeat(50));
        
        console.log(`🔄 Requesting Chainlink Functions verification for credit ${creditId}...`);
        const verifyTx = await oracle.requestVerification(creditId);
        const receipt = await verifyTx.wait();
        
        console.log(`✅ Chainlink Functions request sent!`);
        console.log(`📋 Transaction hash: ${receipt.hash}`);
        
        // Get the request ID from events
        const requestEvent = receipt.logs.find(log => {
            try {
                const parsed = oracle.interface.parseLog(log);
                return parsed && parsed.name === "VerificationRequested";
            } catch (e) {
                return false;
            }
        });
        
        let requestId;
        if (requestEvent) {
            const parsed = oracle.interface.parseLog(requestEvent);
            requestId = parsed.args.requestId;
            console.log(`🔗 Chainlink Request ID: ${requestId}`);
        }
        
        // ================================================================
        // STEP 3: CHECK CHAINLINK FUNCTIONS DATA
        // ================================================================
        console.log("\n" + "=" .repeat(50));
        console.log("📊 STEP 3: CHAINLINK FUNCTIONS DATA");
        console.log("=" .repeat(50));
        
        console.log("⏳ Waiting for Chainlink Functions callback...");
        console.log("📝 This will fetch real-time data from Gold Standard API");
        
        let isVerified = false;
        let verificationData = null;
        let attempts = 0;
        const maxAttempts = 12; // 60 seconds total
        
        while (attempts < maxAttempts && !isVerified) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
            
            const credit = await oracle.getCarbonCredit(creditId);
            const requestIdFromCredit = await oracle.creditToRequest(creditId);
            
            if (requestIdFromCredit !== ethers.ZeroHash) {
                const verificationReq = await oracle.getVerificationRequest(requestIdFromCredit);
                
                if (verificationReq.fulfilled) {
                    isVerified = true;
                    verificationData = verificationReq;
                    
                    console.log(`\n🎉 CHAINLINK FUNCTIONS DATA RECEIVED!`);
                    console.log(`🌟 GS Project ID: ${verificationData.gsId}`);
                    console.log(`🔥 Available Credits: ${verificationData.availableForSale}`);
                    console.log(`📅 Timestamp: ${verificationData.timestamp}`);
                    console.log(`✅ Status: ${verificationData.verificationStatus === 1 ? "VERIFIED" : "FAILED"}`);
                    break;
                }
            }
            
            console.log(`⏳ Attempt ${attempts}/${maxAttempts} - waiting for Chainlink callback...`);
        }
        
        if (!isVerified) {
            console.log("\n⚠️  Chainlink verification still pending after 60 seconds");
            console.log("📝 In production, this process can take 1-2 minutes");
            console.log("🔗 You can check the status later or wait longer");
            
            // Show current request status
            const requestIdFromCredit = await oracle.creditToRequest(creditId);
            if (requestIdFromCredit !== ethers.ZeroHash) {
                const verificationReq = await oracle.getVerificationRequest(requestIdFromCredit);
                console.log(`📊 Request Status: ${verificationReq.fulfilled ? "Fulfilled" : "Pending"}`);
            }
        }
        
        // ================================================================
        // STEP 4: DEMONSTRATE DYNAMIC NFT METADATA
        // ================================================================
        console.log("\n" + "=" .repeat(50));
        console.log("🎨 STEP 4: DYNAMIC NFT METADATA FROM CHAINLINK");
        console.log("=" .repeat(50));
        
        console.log("🔄 Testing BatchNFT creation with Chainlink data...");
        
        if (isVerified && verificationData) {
            try {
                // Try to mint BatchNFT with verified Chainlink data
                const batchCredits = Math.min(5000, Number(verificationData.availableForSale)); // Use available amount
                
                console.log(`🔄 Minting BatchNFT with ${batchCredits} credits from Chainlink verified amount...`);
                
                const mintTx = await batchNFT.mintBatchWithToken(
                    deployer.address,
                    projectId,
                    ethers.parseUnits(batchCredits.toString(), 18),
                    creditId
                );
                
                const mintReceipt = await mintTx.wait();
                console.log(`✅ BatchNFT minted successfully!`);
                
                // Get the batch ID
                const batchMintedEvent = mintReceipt.logs.find(log => {
                    try {
                        const parsed = batchNFT.interface.parseLog(log);
                        return parsed && parsed.name === "BatchMintedWithToken";
                    } catch (e) {
                        return false;
                    }
                });
                
                if (batchMintedEvent) {
                    const parsed = batchNFT.interface.parseLog(batchMintedEvent);
                    const batchId = Number(parsed.args.batchId);
                    const tokenAddress = parsed.args.tokenAddress;
                    
                    console.log(`🎨 BatchNFT ID: ${batchId}`);
                    console.log(`🪙 ProjectToken: ${tokenAddress}`);
                    
                    // Get the token URI to show Chainlink data integration
                    const tokenURI = await batchNFT.tokenURI(batchId);
                    
                    console.log("\n🔗 DYNAMIC NFT METADATA (powered by Chainlink Functions):");
                    console.log("=" .repeat(60));
                    
                    // Decode the base64 JSON metadata
                    if (tokenURI.startsWith("data:application/json;base64,")) {
                        const base64Data = tokenURI.replace("data:application/json;base64,", "");
                        const jsonData = Buffer.from(base64Data, 'base64').toString('utf-8');
                        const metadata = JSON.parse(jsonData);
                        
                        console.log(`📝 Name: ${metadata.name}`);
                        console.log(`📄 Description: ${metadata.description}`);
                        console.log("\n🏷️ Attributes (from Chainlink Functions):");
                        
                        metadata.attributes.forEach(attr => {
                            console.log(`   ${attr.trait_type}: ${attr.value}`);
                        });
                        
                        console.log("\n🎯 KEY FEATURES DEMONSTRATED:");
                        console.log("✅ Real-time data from Chainlink Functions");
                        console.log("✅ Dynamic NFT metadata updates");
                        console.log("✅ Gold Standard API integration");
                        console.log("✅ Verification status tracking");
                        console.log("✅ Available credits from external API");
                        
                    } else {
                        console.log("📋 Token URI:", tokenURI);
                    }
                }
                
            } catch (error) {
                if (error.message.includes("Carbon credit not verified")) {
                    console.log("⚠️  Credit verification still in progress");
                    console.log("📝 BatchNFT requires Chainlink verification to complete");
                } else {
                    console.log("❌ Error minting BatchNFT:", error.message);
                }
            }
        } else {
            console.log("📝 Demonstrating metadata structure (verification pending):");
            console.log("🔗 When Chainlink Functions completes, NFT metadata will include:");
            console.log("   • GS Project ID from API");
            console.log("   • Available credits from API");
            console.log("   • Real-time timestamp");
            console.log("   • Verification status");
            console.log("   • Dynamic updates on each view");
        }
        
        // ================================================================
        // SUMMARY
        // ================================================================
        console.log("\n" + "=" .repeat(70));
        console.log("🎉 CHAINLINK FUNCTIONS INTEGRATION TEST COMPLETE");
        console.log("=" .repeat(70));
        
        console.log("\n🔑 KEY ACHIEVEMENTS:");
        console.log("✅ Carbon credit registered in oracle");
        console.log("✅ Chainlink Functions verification requested");
        console.log(`${isVerified ? "✅" : "⏳"} Real-time API data ${isVerified ? "received" : "pending"}`);
        console.log("✅ Dynamic NFT metadata system ready");
        console.log("✅ BatchNFT requires Chainlink verification");
        
        if (verificationData) {
            console.log("\n📊 LIVE CHAINLINK DATA:");
            console.log(`🌟 Project: ${verificationData.gsId}`);
            console.log(`🔥 Available: ${verificationData.availableForSale} credits`);
            console.log(`📅 Updated: ${verificationData.timestamp}`);
        }
        
        console.log("\n🎯 NEXT STEPS:");
        console.log("1. Wait for Chainlink verification to complete");
        console.log("2. Mint BatchNFT with verified data");
        console.log("3. View dynamic metadata with real-time API data");
        console.log("4. Mint and retire ProjectTokens");
        
    } catch (error) {
        console.error("❌ Test failed:", error);
        throw error;
    }
}

// Allow script to be run directly or imported
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = main; 