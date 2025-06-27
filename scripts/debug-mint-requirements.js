const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 DEBUGGING BATCH NFT MINTING REQUIREMENTS");
    console.log("======================================================================");
    
    try {
        const network = hre.network.name;
        const [deployer] = await ethers.getSigners();
        
        console.log(`📡 Network: ${network}`);
        console.log(`👤 Deployer: ${deployer.address}`);
        
        // Load deployed contracts
        const oracleDeployment = require("../deployments/avalancheFuji-oracle-deployment.json");
        const batchSystemDeployment = require("../deployments/avalancheFuji-batch-nft-system.json");
        
        const oracle = await ethers.getContractAt("CarbonVerificationOracle", oracleDeployment.contractAddress);
        const batchNFT = await ethers.getContractAt("BatchNFT", batchSystemDeployment.contracts.batchNFT.address);
        
        console.log(`🔗 Oracle: ${oracleDeployment.contractAddress}`);
        console.log(`🎨 BatchNFT: ${batchSystemDeployment.contracts.batchNFT.address}`);
        
        // Check minting requirements
        const creditId = 2;
        const projectId = "GS-15234";
        const totalCredits = 5000;
        
        console.log("\n" + "=" .repeat(50));
        console.log("🔍 CHECKING ALL MINTING REQUIREMENTS");
        console.log("=" .repeat(50));
        
        // Requirement 1: Credit exists and is verified
        console.log("1. Checking carbon credit...");
        try {
            const credit = await oracle.getCarbonCredit(creditId);
            console.log(`   ✅ Credit exists: ID ${creditId}`);
            console.log(`   📋 Project: ${credit.projectId}`);
            console.log(`   📋 Amount: ${ethers.formatUnits(credit.amount, 18)} tonnes`);
            console.log(`   📋 Is Verified: ${credit.isVerified}`);
            console.log(`   📋 Owner: ${credit.owner}`);
            
            if (!credit.isVerified) {
                console.log("   ❌ FAILED: Carbon credit not verified");
                return;
            }
            
            if (credit.projectId !== projectId) {
                console.log(`   ❌ FAILED: Project ID mismatch. Expected: ${projectId}, Got: ${credit.projectId}`);
                return;
            }
            
            console.log("   ✅ PASSED: Credit is verified and project ID matches");
        } catch (error) {
            console.log(`   ❌ FAILED: Credit does not exist - ${error.message}`);
            return;
        }
        
        // Requirement 2: Chainlink verification request exists
        console.log("\n2. Checking Chainlink verification request...");
        const requestId = await oracle.creditToRequest(creditId);
        if (requestId === ethers.ZeroHash) {
            console.log("   ❌ FAILED: No Chainlink verification request found");
            return;
        }
        console.log(`   ✅ PASSED: Request ID exists - ${requestId}`);
        
        // Requirement 3: Chainlink verification is fulfilled
        console.log("\n3. Checking Chainlink verification fulfillment...");
        const verificationReq = await oracle.getVerificationRequest(requestId);
        console.log(`   📋 Fulfilled: ${verificationReq.fulfilled}`);
        console.log(`   📋 GS ID: ${verificationReq.gsId}`);
        console.log(`   📋 Available For Sale: ${verificationReq.availableForSale}`);
        console.log(`   📋 Timestamp: ${verificationReq.timestamp}`);
        console.log(`   📋 Verification Status: ${verificationReq.verificationStatus}`);
        
        if (!verificationReq.fulfilled) {
            console.log("   ❌ FAILED: Chainlink verification not completed");
            return;
        }
        console.log("   ✅ PASSED: Chainlink verification is fulfilled");
        
        // Requirement 4: Verification status is 1 (verified)
        console.log("\n4. Checking verification status...");
        const statusValue = Number(verificationReq.verificationStatus);
        console.log(`   📋 Status value: ${statusValue} (type: ${typeof statusValue})`);
        
        if (statusValue !== 1) {
            console.log(`   ❌ FAILED: Verification status is ${statusValue}, expected 1 (verified)`);
            console.log("   📝 Status meanings: 0=pending, 1=verified, 2=failed");
            return;
        }
        console.log("   ✅ PASSED: Verification status is 1 (verified)");
        
        // Requirement 5: Available credits > 0
        console.log("\n5. Checking available credits...");
        if (verificationReq.availableForSale <= 0) {
            console.log(`   ❌ FAILED: No credits available. Available: ${verificationReq.availableForSale}`);
            return;
        }
        console.log(`   ✅ PASSED: ${verificationReq.availableForSale} credits available`);
        
        // Requirement 6: Requested amount <= available amount
        console.log("\n6. Checking requested vs available amount...");
        if (totalCredits > verificationReq.availableForSale) {
            console.log(`   ❌ FAILED: Requested ${totalCredits} > Available ${verificationReq.availableForSale}`);
            return;
        }
        console.log(`   ✅ PASSED: Requested ${totalCredits} <= Available ${verificationReq.availableForSale}`);
        
        // Requirement 7: Check authorization
        console.log("\n7. Checking authorization...");
        try {
            const isAuthorized = await batchNFT.authorizedIssuers(deployer.address);
            console.log(`   📋 Is Authorized Issuer: ${isAuthorized}`);
            
            if (!isAuthorized) {
                console.log("   ❌ FAILED: Deployer is not an authorized issuer");
                return;
            }
            console.log("   ✅ PASSED: Deployer is authorized issuer");
        } catch (error) {
            console.log(`   ⚠️  Could not check authorization: ${error.message}`);
        }
        
        console.log("\n" + "=" .repeat(50));
        console.log("🎯 FINAL RESULT");
        console.log("=" .repeat(50));
        console.log("✅ ALL REQUIREMENTS PASSED!");
        console.log("🎨 BatchNFT should be mintable with these parameters:");
        console.log(`   📋 Recipient: ${deployer.address}`);
        console.log(`   📋 Project ID: ${projectId}`);
        console.log(`   📋 Total Credits: ${totalCredits}`);
        console.log(`   📋 Credit ID: ${creditId}`);
        
        console.log("\n🔗 Chainlink Functions Data Ready for NFT Metadata:");
        console.log(`   🌟 GS Project ID: ${verificationReq.gsId}`);
        console.log(`   🔥 Available Credits: ${verificationReq.availableForSale}`);
        console.log(`   📅 Timestamp: ${verificationReq.timestamp}`);
        console.log(`   ✅ Status: Verified`);
        
    } catch (error) {
        console.error("❌ Debug failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 