// ============================================================================
// scripts/config.js - Chainlink配置
// ============================================================================

const CHAINLINK_CONFIG = {
  avalancheFuji: {
    router: "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0",
    donId: "fun-avalanche-fuji-1",
    donIdBytes32: "0x66756e2d6176616c616e6368652d66756a692d31000000000000000000000000",
    gatewayUrls: [
      "https://01.functions-gateway.testnet.chain.link/",
      "https://02.functions-gateway.testnet.chain.link/",
    ],
    explorerUrl: "https://testnet.snowtrace.io",
    linkToken: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846",
    linkPriceFeed: "0x79c91fd4F8b3DaBEe17d286EB11cEE4D83521775",
  },
  polygonMumbai: {
    router: "0x6E2dc0F9DB014aE19888F539E59285D2Ea04244C",
    donId: "fun-polygon-mumbai-1",
    donIdBytes32: "0x66756e2d706f6c79676f6e2d6d756d6261692d31000000000000000000000000",
    gatewayUrls: [
      "https://01.functions-gateway.testnet.chain.link/",
      "https://02.functions-gateway.testnet.chain.link/",
    ],
    explorerUrl: "https://mumbai.polygonscan.com",
    linkToken: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
    linkPriceFeed: "0x12162c3E810393dEC01362aBf156D7ecf6159528",
  },
  sepolia: {
    router: "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0",
    donId: "fun-ethereum-sepolia-1",
    donIdBytes32: "0x66756e2d657468657265756d2d7365706f6c69612d31000000000000000000",
    gatewayUrls: [
      "https://01.functions-gateway.testnet.chain.link/",
      "https://02.functions-gateway.testnet.chain.link/",
    ],
    explorerUrl: "https://sepolia.etherscan.io",
    linkToken: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    linkPriceFeed: "0x42585eD362B3f1BCa95c640FdFf35Ef899212734",
  },
};
  
  // Gold Standard API配置 - 从环境变量读取
const GOLD_STANDARD_CONFIG = {
  apiBaseUrl: process.env.GOLD_STANDARD_API_BASE_URL || "https://goldstandard-mockup-api.vercel.app/",
  apiKey: process.env.GOLD_STANDARD_API_KEY || "gs_test_key_12345",
  testProjects: [
    "GS-15234", // Solar Water Heating Kenya - 35,000 credits
    "GS-15235", // Wind Farm Maharashtra India - 75,000 credits
    "GS-15236", // Improved Cookstoves Cambodia - 0 credits (pending)
  ]
};
  
  module.exports = {
    CHAINLINK_CONFIG,
    GOLD_STANDARD_CONFIG,
  };
  
  