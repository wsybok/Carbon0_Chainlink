// ============================================================================
// scripts/setup-subscription.js - 创建并配置Chainlink Subscription
// ============================================================================

const { CHAINLINK_CONFIG, GOLD_STANDARD_CONFIG } = require("./config");
const hre = require("hardhat");

async function setupChainlinkSubscription() {
  console.log("🔗 设置 Chainlink Functions Subscription...");
  
  const network = hre.network.name;
  const config = CHAINLINK_CONFIG[network];
  
  if (!config) {
    console.log(`❌ 不支持的网络: ${network}`);
    console.log("支持的网络: avalancheFuji, polygonMumbai, sepolia");
    return;
  }
  
  // 这里提供手动设置指导，因为需要通过Chainlink UI创建
  console.log("📋 手动设置步骤:");
  console.log("1. 访问 https://functions.chain.link/");
  console.log(`2. 连接到 ${network} 网络`);
  console.log("3. 创建新的 Subscription");
  console.log("4. 充值 LINK 代币 (建议 2-5 LINK)");
  console.log("5. 添加以下 Consumer 合约地址:");
  
  // 读取部署地址
  try {
    const deploymentFile = `deployments/${network}-oracle-deployment.json`;
    const deployment = JSON.parse(require("fs").readFileSync(deploymentFile));
    console.log(`   📍 ${deployment.contractAddress}`);
    console.log(`   🔍 验证: ${deployment.chainlinkConfig.explorerUrl}/address/${deployment.contractAddress}`);
  } catch (error) {
    console.log("   ❌ [请先部署合约到此网络]");
    console.log(`   💡 运行: npm run deploy:${network === 'avalancheFuji' ? 'fuji' : network}`);
  }
  
  console.log("6. 上传 Secrets (DON encrypted):");
  console.log(`   goldStandardApiKey: "${GOLD_STANDARD_CONFIG.apiKey}"`);
  console.log(`   🔗 API Base URL: ${GOLD_STANDARD_CONFIG.apiBaseUrl}`);
  
  console.log("\n💡 完成后，更新 .env 文件:");
  console.log("CHAINLINK_SUBSCRIPTION_ID=your_subscription_id");
  
  console.log("\n🎯 Chainlink Functions 文档:");
  console.log("https://docs.chain.link/chainlink-functions");
}

// ============================================================================
// 主函数入口
// ============================================================================

if (require.main === module) {
  setupChainlinkSubscription()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
  