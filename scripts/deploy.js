// ============================================================================
// scripts/deploy.js - 部署脚本
// ============================================================================

const { ethers } = require("hardhat");
const hre = require("hardhat");
const { CHAINLINK_CONFIG, GOLD_STANDARD_CONFIG } = require("./config");

async function main() {
  console.log("🚀 开始部署 CarbonVerificationOracle...");
  
  // 获取网络配置
  const network = hre.network.name;
  const config = CHAINLINK_CONFIG[network];
  
  if (!config) {
    throw new Error(`不支持的网络: ${network}`);
  }
  
  console.log(`📡 部署到网络: ${network}`);
  console.log(`🔗 Chainlink Router: ${config.router}`);
  
  // 部署参数 - Chainlink Functions配置
  const signers = await ethers.getSigners();
  
  if (signers.length === 0) {
    console.log("❌ No private key configured!");
    console.log("📋 To deploy, create a .env file with:");
    console.log("   PRIVATE_KEY=your_private_key_here");
    console.log("   SNOWTRACE_API_KEY=your_snowtrace_api_key_here");
    console.log("   CHAINLINK_SUBSCRIPTION_ID=your_subscription_id");
    console.log("\n💡 You can get Fuji testnet AVAX from: https://faucet.avax.network/");
    console.log("💡 Create Chainlink subscription at: https://functions.chain.link/");
    return;
  }
  
  const [deployer] = signers;
  
  // Chainlink Functions参数
  const subscriptionId = process.env.CHAINLINK_SUBSCRIPTION_ID || "0";
  const gasLimit = process.env.CHAINLINK_GAS_LIMIT || 300000; // Can be increased up to 300,000 max
  const donIdBytes32 = config.donIdBytes32;
  
  console.log("📋 部署参数:");
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Network: ${network}`);
  console.log(`   Chainlink Router: ${config.router}`);
  console.log(`   Subscription ID: ${subscriptionId}`);
  console.log(`   Gas Limit: ${gasLimit} (Max: 300,000)`);
  console.log(`   DON ID: ${donIdBytes32}`);
  console.log(`   API URL: https://goldstandard-mockup-api.vercel.app`);
  console.log(`   API Key: gs_test_key_12345 (hardcoded for testing)`);
  
  // 部署合约
  const CarbonVerificationOracle = await ethers.getContractFactory("CarbonVerificationOracle");
  const oracle = await CarbonVerificationOracle.deploy(
    config.router,
    donIdBytes32,
    subscriptionId,
    gasLimit
  );
  
  await oracle.waitForDeployment();
  const contractAddress = await oracle.getAddress();
  
  console.log("✅ CarbonVerificationOracle 部署成功!");
  console.log(`📍 合约地址: ${contractAddress}`);
  console.log(`🔍 验证链接: ${config.explorerUrl}/address/${contractAddress}`);
  
  // 保存部署信息
  const deploymentInfo = {
    network: network,
    contractAddress: contractAddress,
    chainlinkConfig: config,
    functionsConfig: {
      subscriptionId: subscriptionId,
      gasLimit: gasLimit,
      donId: config.donId,
      donIdBytes32: donIdBytes32
    },
    apiConfig: {
      baseUrl: "https://goldstandard-mockup-api.vercel.app",
      apiKey: "gs_test_key_12345",
      hardcoded: true
    },
    goldStandardConfig: GOLD_STANDARD_CONFIG,
    deploymentTime: new Date().toISOString(),
    deployer: deployer.address
  };
  
  // 写入文件
  const fs = require("fs");
  fs.writeFileSync(
    `deployments/${network}-oracle-deployment.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("💾 部署信息已保存到 deployments/ 目录");
  
  // 下一步指导
  console.log("\n🎯 下一步操作:");
  if (subscriptionId === "0") {
    console.log("1. 创建 Chainlink Functions Subscription:");
    console.log(`   访问: https://functions.chain.link/`);
    console.log(`   连接到 ${network} 网络`);
    console.log("2. 将合约地址添加为 Consumer:");
    console.log(`   ${contractAddress}`);
    console.log("3. 充值 LINK 代币 (建议 2-5 LINK)");
    console.log("4. 更新 .env 文件添加: CHAINLINK_SUBSCRIPTION_ID=your_subscription_id");
    console.log("5. 重新部署合约");
  } else {
    console.log("1. 确保合约已添加为 Consumer (如果尚未添加):");
    console.log(`   订阅 ID: ${subscriptionId}`);
    console.log(`   合约地址: ${contractAddress}`);
    console.log("2. 确保订阅有足够的 LINK 代币");
    console.log("3. 运行测试脚本验证 Chainlink Functions 功能");
  }
  console.log("\n🔗 API配置 (无需 secrets):");
  console.log("   ✅ API URL: https://goldstandard-mockup-api.vercel.app");
  console.log("   ✅ API Key: gs_test_key_12345 (hardcoded in contract)");
  console.log("   ✅ No encrypted secrets needed for testing!");
  
  return {
    oracle: oracle,
    address: contractAddress,
    config: deploymentInfo
  };
}

// ============================================================================
// 主函数入口
// ============================================================================

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
  
 