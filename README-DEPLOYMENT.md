# 🚀 Quick Deployment Guide

## Deploy to Vercel (Recommended)

### Option 1: Automated Script
```bash
./deploy-vercel.sh
```

### Option 2: Manual Deployment

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

### Option 3: GitHub + Vercel Dashboard

1. Push your code to GitHub
2. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
3. Click "New Project" and import your repository
4. Vercel will auto-detect the configuration from `vercel.json`

## What Gets Deployed

✅ **Complete Frontend Application** with:
- Wallet integration (Core Wallet + MetaMask)
- Carbon credit verification via Chainlink Functions
- BatchNFT minting system
- ProjectToken management
- Real-time metadata from blockchain

✅ **Smart Contracts** (already deployed on Avalanche Fuji):
- CarbonVerificationOracle
- BatchNFT system
- ProjectToken factory

## Live Demo Features

Users can:
1. 🔗 Connect Avalanche-compatible wallets
2. 🌍 Verify real carbon credits via Gold Standard API
3. 🎨 Mint BatchNFTs with live verification data
4. 💰 Create linked ProjectTokens
5. ♻️ Retire carbon credits with full traceability

## Post-Deployment

- Your app will be live at `https://your-project.vercel.app`
- Test all wallet connections and contract interactions
- Share your live demo with the community!

---

**Ready to go live!** 🌟 