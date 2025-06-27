export const CONTRACTS = {
  BATCH_NFT: "0x4134f7B9eCC847D8548176471A31D408959254f9",
  TOKEN_FACTORY: "0x0B6D191B449EBB814Eb0332490683a802947b2CA",
  VERIFICATION_ORACLE: "0xc195a76987dd0E62407811dc21927C322a85e9eF",
} as const;

export const AVALANCHE_FUJI = {
  id: 43113,
  name: 'Avalanche Fuji',
  network: 'avalanche-fuji',
  nativeCurrency: {
    decimals: 18,
    name: 'Avalanche',
    symbol: 'AVAX',
  },
  rpcUrls: {
    public: { http: ['https://api.avax-test.network/ext/bc/C/rpc'] },
    default: { http: ['https://api.avax-test.network/ext/bc/C/rpc'] },
  },
  blockExplorers: {
    etherscan: { name: 'SnowTrace', url: 'https://testnet.snowtrace.io' },
    default: { name: 'SnowTrace', url: 'https://testnet.snowtrace.io' },
  },
  testnet: true,
};

// Simplified ABIs for the frontend
export const BATCH_NFT_ABI = [
  {
    "inputs": [
      {"internalType": "string", "name": "projectId", "type": "string"},
      {"internalType": "uint256", "name": "totalCredits", "type": "uint256"},
      {"internalType": "string", "name": "description", "type": "string"}
    ],
    "name": "mintBatchWithToken",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "tokenURI",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "batchId", "type": "uint256"}],
    "name": "getBatchInfo",
    "outputs": [
      {"internalType": "string", "name": "projectId", "type": "string"},
      {"internalType": "uint256", "name": "totalCredits", "type": "uint256"},
      {"internalType": "uint256", "name": "issuedCredits", "type": "uint256"},
      {"internalType": "uint256", "name": "retiredCredits", "type": "uint256"},
      {"internalType": "address", "name": "tokenAddress", "type": "address"},
      {"internalType": "uint256", "name": "creditId", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const PROJECT_TOKEN_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "retire",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const VERIFICATION_ORACLE_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "creditId", "type": "uint256"}],
    "name": "getCreditInfo",
    "outputs": [
      {"internalType": "string", "name": "gsId", "type": "string"},
      {"internalType": "uint256", "name": "availableForSale", "type": "uint256"},
      {"internalType": "uint256", "name": "lastUpdated", "type": "uint256"},
      {"internalType": "bool", "name": "verified", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "creditId", "type": "uint256"},
      {"internalType": "string", "name": "gsId", "type": "string"}
    ],
    "name": "requestVerification",
    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const; 