// ============================================================================
// scripts/deploy-batch-nft-system.js - Deploy Complete BatchNFT System
// ============================================================================

const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
  console.log("🚀 DEPLOYING COMPLETE BATCH NFT SYSTEM");
  console.log("=" .repeat(70));
  
  // Get network info
  const network = hre.network.name;
  const [deployer] = await ethers.getSigners();
  
  console.log(`📡 Network: ${network}`);
  console.log(`📋 Deployer: ${deployer.address}`);
  
  // Check if CarbonVerificationOracle is deployed
  const existingDeployment = require(`../deployments/${network}-oracle-deployment.json`);
  const oracleAddress = existingDeployment.contractAddress;
  
  console.log(`🔗 Using existing CarbonVerificationOracle: ${oracleAddress}`);
  
  // Step 1: Deploy TokenFactory
  console.log("\n🔄 STEP 1: Deploying TokenFactory...");
  const TokenFactory = await ethers.getContractFactory("TokenFactory");
  const tokenFactory = await TokenFactory.deploy();
  await tokenFactory.waitForDeployment();
  const tokenFactoryAddress = await tokenFactory.getAddress();
  
  console.log(`✅ TokenFactory deployed: ${tokenFactoryAddress}`);
  
  // Step 2: Deploy BatchNFT
  console.log("\n🔄 STEP 2: Deploying BatchNFT...");
  const BatchNFT = await ethers.getContractFactory("BatchNFT");
  const batchNFT = await BatchNFT.deploy(tokenFactoryAddress, oracleAddress);
  await batchNFT.waitForDeployment();
  const batchNFTAddress = await batchNFT.getAddress();
  
  console.log(`✅ BatchNFT deployed: ${batchNFTAddress}`);
  
  // Step 3: Set up permissions
  console.log("\n🔄 STEP 3: Setting up permissions...");
  
  // Authorize BatchNFT contract in TokenFactory
  const authFactoryTx = await tokenFactory.authorizeContract(batchNFTAddress);
  await authFactoryTx.wait();
  console.log(`✅ Authorized BatchNFT in TokenFactory`);
  
  // Authorize deployer as issuer for testing
  const authorizeTx = await batchNFT.authorizeIssuer(deployer.address);
  await authorizeTx.wait();
  console.log(`✅ Authorized ${deployer.address} as issuer`);
  
  // Verify connections
  console.log("\n🔄 STEP 4: Verifying system connections...");
  
  const factoryFromBatch = await batchNFT.tokenFactory();
  const oracleFromBatch = await batchNFT.verificationOracle();
  
  console.log(`🔗 BatchNFT -> TokenFactory: ${factoryFromBatch}`);
  console.log(`🔗 BatchNFT -> Oracle: ${oracleFromBatch}`);
  
  // Check if TokenFactory is authorized
  const isAuthorized = await tokenFactory.authorizedContracts(batchNFTAddress);
  console.log(`🔗 TokenFactory authorizes BatchNFT: ${isAuthorized}`);
  
  // Save deployment info
  const deploymentInfo = {
    network: network,
    deploymentTime: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      carbonVerificationOracle: {
        address: oracleAddress,
        existing: true
      },
      tokenFactory: {
        address: tokenFactoryAddress,
        transactionHash: tokenFactory.deploymentTransaction()?.hash
      },
      batchNFT: {
        address: batchNFTAddress,
        transactionHash: batchNFT.deploymentTransaction()?.hash
      }
    },
    systemConfiguration: {
      oracleIntegration: true,
      factoryAuthorization: isAuthorized,
      deployerAsIssuer: true
    },
    nextSteps: [
      "1. Register carbon credits in CarbonVerificationOracle",
      "2. Request verification for credits",
      "3. Use mintBatchWithToken() to create batch NFTs with tokens",
      "4. Mint project tokens to users",
      "5. Users can retire tokens for carbon offsetting"
    ]
  };
  
  // Write to file
  const fs = require("fs");
  const filename = `deployments/${network}-batch-nft-system.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n" + "=" .repeat(70));
  console.log("🎉 BATCH NFT SYSTEM DEPLOYMENT COMPLETE!");
  console.log("=" .repeat(70));
  
  console.log("\n📋 CONTRACT ADDRESSES:");
  console.log(`CarbonVerificationOracle: ${oracleAddress}`);
  console.log(`TokenFactory:            ${tokenFactoryAddress}`);
  console.log(`BatchNFT:                ${batchNFTAddress}`);
  
  console.log("\n🔧 SYSTEM CAPABILITIES:");
  console.log("✅ Verify carbon credits with Chainlink Functions");
  console.log("✅ Mint BatchNFT with integrated ProjectToken");
  console.log("✅ Dual-pointer system (NFT ↔ ERC-20)");
  console.log("✅ Real-time data synchronization");
  console.log("✅ Carbon credit retirement tracking");
  console.log("✅ Dynamic NFT metadata with verification data");
  
  console.log("\n🎯 NEXT STEPS:");
  console.log("1. Install OpenZeppelin: npm install @openzeppelin/contracts");
  console.log("2. Compile contracts: npm run compile");
  console.log("3. Run test script: node scripts/test-batch-nft-system.js");
  
  console.log("\n💾 Deployment info saved to:", filename);
  
  return {
    oracleAddress,
    tokenFactoryAddress,
    batchNFTAddress,
    deploymentInfo
  };
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