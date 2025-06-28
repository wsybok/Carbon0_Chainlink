# 🌱 Carbon0: Verified Carbon Credit NFT Platform

> **Transforming real-world carbon impact into cross-chain digital assets with Chainlink Functions**

[![Avalanche](https://img.shields.io/badge/Avalanche-Fuji%20Testnet-E84142?style=for-the-badge&logo=avalanche)](https://testnet.snowtrace.io/)
[![Chainlink](https://img.shields.io/badge/Chainlink-Functions-375BD2?style=for-the-badge&logo=chainlink)](https://functions.chain.link/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

---
[Live Demo](https://carbon0-chainlink.vercel.app/)
## 🌟 Overview

**Carbon0** is a revolutionary blockchain platform that bridges real-world carbon credits with decentralized finance through **dynamic NFTs powered by Chainlink Functions**. The platform enables real-time verification of carbon credits from the Gold Standard registry, creating trustworthy, liquid digital assets for the carbon market.

### ✨ Key Features

- 🔗 **Real-time Verification**: Live carbon credit validation via Chainlink Functions
- 🎨 **Dynamic NFT Metadata**: NFTs that update with live verification data
- 🪙 **Automatic Token Generation**: ERC-20 tokens created with each BatchNFT
- ♻️ **Carbon Retirement System**: Transparent carbon offsetting with certificates
- 🌍 **Gold Standard Integration**: Direct API integration with verified carbon projects
- ⛓️ **Cross-Chain Ready**: Built for multi-chain carbon credit trading

---

## 🏗️ Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  Carbon0 Platform                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐         │
│  │   Frontend DApp   │    │   BatchNFT       │    │   ProjectToken   │         │
│  │   (Next.js)       │◄──►│   (ERC-721)      │◄──►│   (ERC-20)       │         │
│  │                   │    │                  │    │                  │         │
│  │ • Wallet Connect  │    │ • Dynamic Meta   │    │ • Mint/Burn      │         │
│  │ • Real-time UI    │    │ • Credit Batches │    │ • Retirement     │         │
│  │ • Gallery View    │    │ • Chainlink Data │    │ • Balance Track  │         │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘         │
│           │                        │                        │                 │
│           │                        │                        │                 │
│           └────────────────────────┼────────────────────────┘                 │
│                                    │                                          │
│  ┌──────────────────────────────────▼──────────────────────────────────┐      │
│  │                 CarbonVerificationOracle                             │      │
│  │                        (Core Contract)                               │      │
│  │                                                                      │      │
│  │  • Chainlink Functions Integration  • Credit Registration           │      │
│  │  • Gold Standard API Calls          • Verification Management       │      │
│  │  • Real-time Data Validation        • Ownership Tracking            │      │
│  └──────────────────┬───────────────────────────────────────────────────┘      │
│                     │                                                          │
│  ┌──────────────────▼──────────────────┐    ┌──────────────────┐              │
│  │     Chainlink Functions DON        │    │   TokenFactory   │              │
│  │                                     │    │                  │              │
│  │ • Decentralized Oracle Network     │    │ • Auto Deploy    │              │
│  │ • JavaScript Execution             │    │ • Standard ERC-20 │              │
│  │ • Gold Standard API Integration    │    │ • Batch Linking   │              │
│  └─────────────────┬───────────────────┘    └──────────────────┘              │
│                    │                                                           │
│  ┌─────────────────▼─────────────────┐                                        │
│  │        Gold Standard API          │                                        │
│  │                                   │                                        │
│  │ • Live Project Data               │                                        │
│  │ • Credit Availability             │                                        │
│  │ • Verification Status             │                                        │
│  │ • Real-time Timestamps            │                                        │
│  └───────────────────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. **CarbonVerificationOracle** 🔗
The heart of the system, integrating Chainlink Functions for real-time carbon credit verification.

**Key Functions:**
- `registerCarbonCredit()`: Register new carbon projects
- `requestVerification()`: Trigger Chainlink Functions verification
- `fulfillRequest()`: Receive and process API data

#### 2. **BatchNFT** 🎨
ERC-721 NFTs representing batches of carbon credits with dynamic metadata.

**Key Functions:**
- `mintBatchWithToken()`: Create NFT + ERC-20 token pair
- `updateIssuedCredits()`: Track token issuance
- `updateRetiredCredits()`: Track carbon retirements

#### 3. **ProjectToken** 🪙
ERC-20 tokens automatically created for each BatchNFT, enabling liquid carbon trading.

**Key Functions:**
- `mint()`: Issue carbon credit tokens
- `retire()`: Permanently retire credits for offsetting
- `getRetirementRecord()`: View retirement certificates

#### 4. **TokenFactory** 🏭
Automated deployment system for ProjectToken contracts.

---

## ⚡ Chainlink Functions Integration

### How It Works

**Carbon0** leverages **Chainlink Functions** to create the first truly **decentralized carbon credit verification system**:

```javascript
// Chainlink Functions JavaScript Code (executed on DON)
const gsId = args[0];
const apiResponse = await Functions.makeHttpRequest({
  url: `https://goldstandard-mockup-api.vercel.app/api/v2/projects/${gsId}/carbon-credits`,
  headers: { 'X-API-Key': 'chainlink_demo_key' }
});

if (apiResponse.error) {
  throw Error('API Error');
}

const data = apiResponse.data.data;
const result = `${data.gsId}|${data.availableForSale}|${apiResponse.data.timestamp}`;
return Functions.encodeString(result);
```

### Verification Flow

1. **🔄 Project Registration**: User registers carbon project in oracle
2. **⚡ Chainlink Trigger**: Request verification via Chainlink Functions
3. **🌐 API Call**: DON executes JavaScript to query Gold Standard API
4. **📊 Data Processing**: Response parsed and validated on-chain
5. **✅ NFT Creation**: BatchNFT minted with verified data
6. **🔄 Live Updates**: NFT metadata updates with real-time verification status

### Decentralization Benefits

- **🌐 No Single Point of Failure**: Multiple oracle nodes validate data
- **🔐 Cryptographic Proof**: All API responses cryptographically verified
- **⏱️ Real-time Updates**: Live data feeds keep NFTs current
- **🛡️ Tamper Proof**: Blockchain immutability ensures data integrity

---

## 🚀 Smart Contracts (Avalanche Fuji)

### Deployed Addresses

| Contract | Address | Explorer |
|----------|---------|----------|
| **CarbonVerificationOracle** | `0xc195a76987dd0E62407811dc21927C322a85e9eF` | [View on Snowtrace](https://testnet.snowtrace.io/address/0xc195a76987dd0E62407811dc21927C322a85e9eF) |
| **BatchNFT** | `0x4134f7B9eCC847D8548176471A31D408959254f9` | [View on Snowtrace](https://testnet.snowtrace.io/address/0x4134f7B9eCC847D8548176471A31D408959254f9) |
| **TokenFactory** | `0x0B6D191B449EBB814Eb0332490683a802947b2CA` | [View on Snowtrace](https://testnet.snowtrace.io/address/0x0B6D191B449EBB814Eb0332490683a802947b2CA) |

### Contract Features

#### CarbonVerificationOracle
```solidity
// Register carbon credit project
function registerCarbonCredit(
    uint256 _amount,
    string memory _projectId,
    bytes32 _verificationHash,
    uint256 _expiryDate
) external returns (uint256)

// Request Chainlink Functions verification
function requestVerification(uint256 _creditId) external returns (bytes32)
```

#### BatchNFT
```solidity
// Mint NFT with automatic token creation
function mintBatchWithToken(
    address to,
    string memory projectId,
    uint256 totalCredits,
    uint256 creditId
) external returns (uint256 batchId, address tokenAddress)
```

#### ProjectToken
```solidity
// Retire tokens for carbon offsetting
function retire(uint256 amount, string memory reason) external

// Get retirement certificate
function getRetirementRecord(uint256 retirementId) external view returns (RetirementRecord memory)
```

---

## 💻 Frontend Application

### Technologies Used

- **⚛️ Next.js 14**: React framework with App Router
- **🎨 TypeScript**: Type-safe development
- **🎯 Tailwind CSS**: Modern, responsive styling
- **⛓️ ethers.js**: Ethereum blockchain interaction
- **🦊 Multi-Wallet Support**: MetaMask, Core Wallet integration

### Key Features

#### 🔗 Wallet Integration
- **Core Wallet**: Optimized for Avalanche ecosystem
- **MetaMask**: Universal Web3 wallet support
- **Auto Network Switching**: Seamless Avalanche Fuji connection

#### 🎨 BatchNFT Gallery
- **Live NFT Display**: Real-time gallery of minted BatchNFTs
- **Project Details**: Rich project information from Gold Standard API
- **Interactive Cards**: View details, check balances, retire tokens

#### ⚡ Real-time Verification
- **Live API Calls**: Watch Chainlink Functions execute in real-time
- **Progress Tracking**: Visual feedback during verification process
- **Result Display**: Beautiful visualization of verification results

#### 📊 Data Visualization
- **Project Dashboard**: Complete project overview with metrics
- **Retirement Certificates**: Blockchain-verified carbon offsetting
- **Transaction History**: Full audit trail of all operations

---

## 🛠️ Setup & Installation

### Prerequisites

- **Node.js** 18+ and npm
- **Hardhat** for smart contract development
- **MetaMask** or **Core Wallet** browser extension
- **Avalanche Fuji testnet** AVAX for gas fees

### Local Development

1. **Clone Repository**
   ```bash
   git clone https://github.com/wsybok/OneTon_Chainlink.git
   cd OneTon_Chainlink
   ```

2. **Install Dependencies**
   ```bash
   # Root dependencies
   npm install
   
   # Frontend dependencies
   cd frontend && npm install && cd ..
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Add your configuration
   # PRIVATE_KEY=your_wallet_private_key
   # AVALANCHE_FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
   ```

4. **Start Development Server**
   ```bash
   cd frontend && npm run dev
   ```

5. **Access Application**
   ```
   http://localhost:3000
   ```

### Smart Contract Deployment

```bash
# Compile contracts
npx hardhat compile

# Deploy to Avalanche Fuji
npx hardhat run scripts/deploy-batch-nft-system.js --network avalancheFuji

# Verify contracts
npx hardhat verify --network avalancheFuji <CONTRACT_ADDRESS>
```

---

## 🎯 Usage Examples

### 1. Register Carbon Project

```javascript
// Register new carbon credit project
const tx = await oracle.registerCarbonCredit(
  ethers.parseUnits("10000", 18), // 10,000 carbon credits
  "GS-15234", // Gold Standard project ID
  verificationHash,
  expiryDate
);
```

### 2. Request Chainlink Verification

```javascript
// Trigger Chainlink Functions verification
const tx = await oracle.requestVerification(creditId);

// Wait for DON to execute and callback
// Real-time polling for results...
```

### 3. Mint BatchNFT with Token

```javascript
// Create NFT + ERC-20 token pair
const { batchId, tokenAddress } = await batchNFT.mintBatchWithToken(
  recipient,
  "GS-15234",
  ethers.parseUnits("5000", 18),
  creditId
);
```

### 4. Retire Carbon Credits

```javascript
// Permanently retire tokens for offsetting
const tx = await projectToken.retire(
  ethers.parseUnits("100", 18),
  "Carbon offset for business operations"
);
```

---

## 🌟 Live Demo

### Demo Projects Available

| Project ID | Description | Available Credits |
|------------|-------------|-------------------|
| **GS-15234** | Solar Farm Kenya | 35,000 tonnes CO2e |
| **GS-15235** | Wind Farm Maharashtra India | 75,000 tonnes CO2e |

### Demo Workflow

1. **🔗 Connect Wallet**: Use Core Wallet or MetaMask
2. **📝 Register Project**: Register demo project (GS-15234)
3. **⚡ Request Verification**: Watch Chainlink Functions execute live
4. **🎨 Mint BatchNFT**: Create NFT with verified data
5. **🪙 Issue Tokens**: Mint carbon credit tokens
6. **♻️ Retire Credits**: Offset carbon footprint with certificates

### Try It Live

**🌐 Live Demo**: [Coming Soon - Deploy to Vercel]

**🔗 GitHub**: [https://github.com/wsybok/OneTon_Chainlink](https://github.com/wsybok/OneTon_Chainlink)

---

## 🧪 Testing

### Unit Tests

```bash
# Run smart contract tests
npx hardhat test

# Test specific contract
npx hardhat test test/CarbonVerificationOracle.test.js
```

### Integration Tests

```bash
# Test full system workflow
npx hardhat run scripts/test-batch-nft-system.js --network avalancheFuji
```

### Frontend Testing

```bash
cd frontend

# Run component tests
npm run test

# End-to-end testing
npm run test:e2e
```

---

## 🔮 Future Roadmap

### Phase 1: Core Platform ✅
- [x] Chainlink Functions integration
- [x] Dynamic NFT metadata
- [x] Multi-wallet support
- [x] Avalanche Fuji deployment

### Phase 2: Enhanced Features 🚧
- [ ] Multi-chain deployment (Ethereum, Polygon)
- [ ] Advanced carbon credit marketplace
- [ ] Mobile app development
- [ ] Integration with more carbon registries

### Phase 3: DeFi Integration 🔮
- [ ] Carbon credit lending/borrowing
- [ ] Yield farming for carbon projects
- [ ] Carbon-backed stablecoins
- [ ] Cross-chain carbon bridges

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Process

1. **Fork** the repository
2. **Create** a feature branch
3. **Commit** your changes
4. **Push** to the branch
5. **Create** a Pull Request

### Code Standards

- **Solidity**: Follow OpenZeppelin patterns
- **TypeScript**: Strict type checking enabled
- **Testing**: Comprehensive test coverage required
- **Documentation**: Clear inline comments

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---


<div align="center">

### 🌱 Building the Future of Carbon Markets

**Made with ❤️ for a sustainable future**

</div>
