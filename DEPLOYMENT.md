# Deployment Guide - Carbon Credit BatchNFT System

This guide explains how to deploy the Carbon Credit BatchNFT system to Vercel for public access.

## Project Structure

This is a monorepo containing:
- **Frontend**: Next.js application in `/frontend` directory
- **Smart Contracts**: Solidity contracts in `/contracts` directory
- **Deployment Scripts**: Hardhat deployment scripts in `/scripts` directory

## Frontend Deployment to Vercel

### Prerequisites

1. **GitHub Repository**: Push your code to a GitHub repository
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **Environment Variables**: Prepare any required environment variables

### Deployment Steps

#### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Connect Repository**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Build Settings**:
   - Vercel should auto-detect the `vercel.json` configuration
   - Root Directory: Leave as default (auto-detected)
   - Build Command: `cd frontend && npm run build` (from vercel.json)
   - Output Directory: `frontend/.next` (from vercel.json)
   - Install Command: `cd frontend && npm install` (from vercel.json)

3. **Environment Variables** (if needed):
   - Add any required environment variables in the Vercel dashboard
   - Common variables might include:
     - `NEXT_PUBLIC_CHAIN_ID=43113` (Avalanche Fuji)
     - `NEXT_PUBLIC_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc`

4. **Deploy**:
   - Click "Deploy"
   - Vercel will build and deploy your application

#### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

### Smart Contract Deployment

The smart contracts are already deployed to Avalanche Fuji testnet:

- **CarbonVerificationOracle**: Check `deployments/` directory for addresses
- **BatchNFT System**: Check `deployments/` directory for addresses

### Post-Deployment Checklist

1. **Test Wallet Connection**:
   - Verify Core Wallet and MetaMask connections work
   - Test network switching to Avalanche Fuji

2. **Test Contract Interactions**:
   - Verify carbon credit verification works
   - Test BatchNFT minting functionality
   - Test ProjectToken operations

3. **Update Contract Addresses** (if needed):
   - If you redeploy contracts, update addresses in `frontend/lib/contracts.ts`

### Environment Variables

Create these environment variables in Vercel dashboard if needed:

```env
# Network Configuration
NEXT_PUBLIC_CHAIN_ID=43113
NEXT_PUBLIC_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc

# Contract Addresses (update with your deployed addresses)
NEXT_PUBLIC_ORACLE_ADDRESS=0x...
NEXT_PUBLIC_BATCH_NFT_ADDRESS=0x...
NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=0x...
```

### Custom Domain (Optional)

1. **Add Domain**:
   - Go to your project settings in Vercel
   - Add your custom domain

2. **Configure DNS**:
   - Point your domain to Vercel's servers
   - Vercel will provide DNS instructions

### Monitoring and Analytics

1. **Vercel Analytics**: Automatically enabled for deployed projects
2. **Error Monitoring**: Check Vercel Functions tab for any errors
3. **Performance**: Monitor Core Web Vitals in Vercel dashboard

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check build logs in Vercel dashboard
   - Ensure all dependencies are in `package.json`
   - Verify TypeScript compilation

2. **Wallet Connection Issues**:
   - Ensure HTTPS is enabled (automatic with Vercel)
   - Check browser console for errors
   - Verify wallet extension permissions

3. **Contract Interaction Failures**:
   - Verify contract addresses are correct
   - Check network configuration
   - Ensure sufficient AVAX for gas fees

### Support

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Next.js Deployment**: [nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)
- **Avalanche Testnet**: [docs.avax.network](https://docs.avax.network)

## Features Available After Deployment

✅ **Wallet Integration**: Core Wallet + MetaMask support
✅ **Carbon Credit Verification**: Real-time API verification via Chainlink Functions
✅ **BatchNFT Minting**: Create NFTs representing carbon credit batches
✅ **ProjectToken Creation**: ERC-20 tokens linked to BatchNFTs
✅ **Retirement System**: Track carbon credit retirements
✅ **Real-time Metadata**: Dynamic NFT metadata from Chainlink verification

## Live Demo Features

Users can:
1. Connect their Avalanche-compatible wallet
2. View verified carbon credit data from Gold Standard API
3. Mint BatchNFTs representing carbon credit batches
4. Create corresponding ProjectTokens
5. Retire carbon credits with full traceability
6. View NFT metadata with live verification data

---

**Ready to deploy!** 🚀 Your Carbon Credit BatchNFT system will be publicly accessible and fully functional on Vercel. 