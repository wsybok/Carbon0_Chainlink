#!/bin/bash

# Carbon Credit BatchNFT System - Vercel Deployment Script
echo "🚀 Deploying Carbon Credit BatchNFT System to Vercel..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
echo "🔐 Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo "Please login to Vercel:"
    vercel login
fi

# Test build locally first
echo "🔨 Testing build locally..."
cd frontend
npm install
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Local build successful!"
    cd ..
    
    # Deploy to Vercel
    echo "🌐 Deploying to Vercel..."
    vercel --prod
    
    echo ""
    echo "🎉 Deployment complete!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Visit your Vercel dashboard to see the deployment"
    echo "2. Test wallet connections (Core Wallet & MetaMask)"
    echo "3. Verify contract interactions work on Avalanche Fuji"
    echo "4. Share your live demo URL!"
    echo ""
    echo "🔗 Features available in your live demo:"
    echo "   ✅ Wallet Integration (Core + MetaMask)"
    echo "   ✅ Carbon Credit Verification via Chainlink Functions"
    echo "   ✅ BatchNFT Minting with real-time metadata"
    echo "   ✅ ProjectToken Creation and Management"
    echo "   ✅ Carbon Credit Retirement System"
    echo ""
else
    echo "❌ Local build failed. Please fix the issues before deploying."
    cd ..
    exit 1
fi 