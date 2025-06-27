'use client';

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { 
  getWeb3, 
  getContracts, 
  getProjectTokenContract, 
  formatExpiryDate, 
  parseContractError,
  detectWallets,
  connectWallet,
  switchToAvalancheFuji,
  WalletType,
  type WalletProvider
} from '../lib/contracts';

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [connectedWallet, setConnectedWallet] = useState<WalletType | null>(null);
  const [availableWallets, setAvailableWallets] = useState<WalletProvider[]>([]);
  const [isClient, setIsClient] = useState(false);
  
  // Contract interaction states
  const [activeTab, setActiveTab] = useState('overview');
  const [txLoading, setTxLoading] = useState<string>('');
  const [txResult, setTxResult] = useState<string>('');

  // Form states for different operations
  const [registerForm, setRegisterForm] = useState({
    amount: '10000',
    projectId: 'GS-15234',
    expiryDate: '2025-12-31',
  });

  const [verifyForm, setVerifyForm] = useState({
    projectId: 'GS-15234',
  });

  const [mintBatchForm, setMintBatchForm] = useState({
    recipient: '',
    projectId: 'GS-15234',
    totalCredits: '5000',
    creditId: '2',
  });

  const [mintTokenForm, setMintTokenForm] = useState({
    tokenAddress: '',
    recipient: '',
    amount: '1000',
  });

  const [retireForm, setRetireForm] = useState({
    tokenAddress: '',
    amount: '100',
    reason: 'Carbon offset for business operations',
  });

  // View Data form states
  const [viewCreditForm, setViewCreditForm] = useState({
    projectId: 'GS-15234',
  });

  // viewBatchForm removed - BatchNFT data now included in unified project queries

  const [viewTokenForm, setViewTokenForm] = useState({
    tokenAddress: '',
    userAddress: '',
  });

  // View data results
  const [creditData, setCreditData] = useState<any>(null);
  const [batchData, setBatchData] = useState<any>(null);
  const [tokenData, setTokenData] = useState<any>(null);

  // Gallery states
  const [galleryNFTs, setGalleryNFTs] = useState<any[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  
  // Project details states
  const [projectDetails, setProjectDetails] = useState<any>(null);
  const [projectDetailsLoading, setProjectDetailsLoading] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  // Retirement certificate states
  const [retirementCertificate, setRetirementCertificate] = useState<any>(null);
  const [showRetirementModal, setShowRetirementModal] = useState(false);
  const [retirementHistory, setRetirementHistory] = useState<any[]>([]);

  // Chainlink verification callback states
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isPollingVerification, setIsPollingVerification] = useState(false);

  // Utility function to truncate long addresses
  const truncateAddress = (address: string, startChars = 6, endChars = 4) => {
    if (!address) return '';
    if (address.length <= startChars + endChars) return address;
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  };

  // Set client-side flag to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Detect available wallets on component mount
  useEffect(() => {
    const detectWalletsAsync = async () => {
      // Only run wallet detection on client side
      if (typeof window === 'undefined') return;
      
      // First try the standard detection
      let wallets = detectWallets();
      
      // If no Core wallet found, try EIP-6963 detection
      if (!wallets.some(w => w.type === WalletType.CORE)) {
        console.log('🔍 No Core wallet found via standard detection, trying EIP-6963...');
        const { detectCoreWalletEIP6963 } = await import('../lib/contracts');
        const coreWallet = await detectCoreWalletEIP6963();
        
        if (coreWallet) {
          wallets = [coreWallet, ...wallets];
        }
      }
      
      setAvailableWallets(wallets);
      
      // Debug information
      console.log('🎯 Final detected wallets:', wallets);
      console.log('📱 Current wallets in state:', wallets.map(w => ({ name: w.name, type: w.type })));
    };

    // Only run if client-side
    if (isClient) {
      detectWalletsAsync();
    }
  }, [isClient]);

  // Add global error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Check if it's a user rejection error
      const error = event.reason;
      if (error?.code === 4001 || error?.code === 'ACTION_REJECTED' || 
          (error?.message && error.message.includes('User denied'))) {
        // Prevent the error from showing in console for user rejections
        event.preventDefault();
        console.log('Transaction cancelled by user (prevented console error)');
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const handleWalletConnect = async (walletType: WalletType) => {
    try {
      setLoading(true);
      
      const { address, walletName } = await connectWallet(walletType);
      
      // Switch to Avalanche Fuji network
      const wallets = detectWallets();
      const wallet = wallets.find(w => w.type === walletType);
      if (wallet) {
        await switchToAvalancheFuji(wallet.provider);
      }
      
      setWalletAddress(address);
          setConnected(true);
    setConnectedWallet(walletType);
    
    // Pre-fill recipient fields with connected wallet
    setMintBatchForm(prev => ({ ...prev, recipient: address }));
    setMintTokenForm(prev => ({ ...prev, recipient: address }));
    setViewTokenForm(prev => ({ ...prev, userAddress: address }));
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      alert(`Failed to connect ${walletType}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setConnected(false);
    setWalletAddress('');
    setConnectedWallet(null);
    setMintBatchForm(prev => ({ ...prev, recipient: '' }));
    setMintTokenForm(prev => ({ ...prev, recipient: '' }));
    setViewTokenForm(prev => ({ ...prev, userAddress: '' }));
    // Clear any displayed data
    setCreditData(null);
    setBatchData(null);
    setTokenData(null);
  };

  // Helper function to execute contract transactions
  const executeTransaction = async (operation: string, txFunction: () => Promise<any>) => {
    setTxLoading(operation);
    setTxResult('');
    
    try {
      const result = await txFunction();
      setTxResult(`✅ ${operation} successful! Transaction: ${result.hash}`);
    } catch (error: any) {
      // Only log non-user-rejection errors to console
      const errorMessage = parseContractError(error);
      if (!errorMessage.includes('cancelled by user')) {
        console.error(`${operation} failed:`, error);
      } else {
        // For user cancellations, just log a simple message
        console.log(`${operation} cancelled by user`);
      }
      setTxResult(`❌ ${operation} failed: ${errorMessage}`);
    } finally {
      setTxLoading('');
    }
  };

  // Contract interaction functions
  const registerCarbonCredit = async () => {
    await executeTransaction('Register Carbon Credit', async () => {
      const { signer } = await getWeb3(connectedWallet || undefined);
      const { oracle, batchNFT } = getContracts(signer);
      
      // 🎯 CHECK: Prevent duplicate project registrations (One Project = One NFT)
      const nextBatchId = await batchNFT.nextBatchId();
      const existingProjects = new Set();
      
      for (let i = 1; i < Number(nextBatchId); i++) {
        try {
          const batch = await batchNFT.getBatchMetadata(i);
          if (batch.isActive) {
            existingProjects.add(batch.projectId);
          }
        } catch (error) {
          // Batch doesn't exist or is inactive, skip
        }
      }
      
      if (existingProjects.has(registerForm.projectId)) {
        throw new Error(`❌ Project ${registerForm.projectId} already has an active BatchNFT!\n\n💡 Our system follows "One Project = One NFT" model.\nEach Gold Standard project can only have one BatchNFT.\n\nUse a different project ID like:\n• GS-15235 (Wind Farm Maharashtra India)\n• GS-15236 (Improved Cookstoves Cambodia)`);
      }
      
      const amount = ethers.parseUnits(registerForm.amount, 18);
      const verificationHash = ethers.keccak256(ethers.toUtf8Bytes(`verification_${Date.now()}`));
      const expiryDate = formatExpiryDate(registerForm.expiryDate);
      
      const tx = await oracle.registerCarbonCredit(
        amount,
        registerForm.projectId,
        verificationHash,
        expiryDate
      );
      
      await tx.wait();
      return tx;
    });
  };

  const requestVerification = async () => {
    setVerificationResult(null); // Clear previous result
    
    await executeTransaction('Request Chainlink Verification', async () => {
      const { signer } = await getWeb3(connectedWallet || undefined);
      const { oracle } = getContracts(signer);
      
      // 🎯 Find Credit ID from Project ID
      const nextCreditId = await oracle.nextCreditId();
      let foundCreditId = null;
      
      for (let i = 1; i < Number(nextCreditId); i++) {
        try {
          const credit = await oracle.getCarbonCredit(i);
          if (credit.projectId === verifyForm.projectId) {
            foundCreditId = i;
            break;
          }
        } catch (error) {
          // Credit doesn't exist, skip
        }
      }
      
      if (!foundCreditId) {
        throw new Error(`❌ No registered credit found for project ${verifyForm.projectId}.\n\n💡 Please register the project first in the "Register Project" tab.`);
      }
      
      const tx = await oracle.requestVerification(foundCreditId);
      await tx.wait();
      
      // 🔗 Start polling for Chainlink callback data
      pollForVerificationResult(oracle, foundCreditId);
      
      return tx;
    });
  };

  // 🔗 Poll for Chainlink Functions callback data
  const pollForVerificationResult = async (oracle: any, creditId: number) => {
    setIsPollingVerification(true);
    const maxAttempts = 60; // Poll for up to 2 minutes (60 * 2 seconds)
    let attempts = 0;
    
    const pollInterval = setInterval(async () => {
      try {
        attempts++;
        
        // Get the request ID for this credit
        const requestId = await oracle.creditToRequest(creditId);
        if (requestId === '0x0000000000000000000000000000000000000000000000000000000000000000') {
          return; // No request found yet
        }
        
        // Get verification request data
        const verificationData = await oracle.getVerificationRequest(requestId);
        
        if (verificationData.fulfilled) {
          // 🎉 Chainlink callback received!
          // Ensure proper type conversion for verification status
          const statusValue = Number(verificationData.verificationStatus);
          console.log('🔗 Chainlink verification status:', {
            raw: verificationData.verificationStatus,
            converted: statusValue,
            type: typeof verificationData.verificationStatus
          });
          
          setVerificationResult({
            projectId: verifyForm.projectId,
            creditId: creditId,
            requestId: requestId,
            gsId: verificationData.gsId,
            availableForSale: verificationData.availableForSale.toString(),
            timestamp: verificationData.timestamp,
            verificationStatus: statusValue, // 0=pending, 1=verified, 2=failed
            fulfilled: verificationData.fulfilled,
            callbackTime: new Date().toLocaleString()
          });
          
          clearInterval(pollInterval);
          setIsPollingVerification(false);
          
          // Update the transaction result with callback data
          const statusText = statusValue === 1 ? '✅ VERIFIED' : 
                           statusValue === 2 ? '❌ FAILED' : '⏳ PENDING';
          setTxResult(`🔗 Chainlink Functions completed! Status: ${statusText} | Credits Available: ${verificationData.availableForSale}`);
        }
        
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setIsPollingVerification(false);
          setTxResult(`⏰ Verification timeout - callback may still be processing. Check "View Data" tab for updates.`);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000); // Poll every 2 seconds
  };

  const mintBatchNFT = async () => {
    await executeTransaction('Mint BatchNFT', async () => {
      const { signer } = await getWeb3(connectedWallet || undefined);
      const { batchNFT } = getContracts(signer);
      
      const totalCredits = ethers.parseUnits(mintBatchForm.totalCredits, 18);
      
      const tx = await batchNFT.mintBatchWithToken(
        mintBatchForm.recipient,
        mintBatchForm.projectId,
        totalCredits,
        parseInt(mintBatchForm.creditId)
      );
      
      await tx.wait();
      return tx;
    });
  };

  const mintTokens = async () => {
    await executeTransaction('Mint Tokens', async () => {
      const { signer } = await getWeb3(connectedWallet || undefined);
      const projectToken = getProjectTokenContract(mintTokenForm.tokenAddress, signer);
      
      const amount = ethers.parseUnits(mintTokenForm.amount, 18);
      
      const tx = await projectToken.mint(mintTokenForm.recipient, amount);
      await tx.wait();
      return tx;
    });
  };

  const retireTokens = async () => {
    try {
      setTxLoading('Retire Tokens');
      setTxResult('');
      
      const { signer } = await getWeb3(connectedWallet || undefined);
      const projectToken = getProjectTokenContract(retireForm.tokenAddress, signer);
      
      const amount = ethers.parseUnits(retireForm.amount, 18);
      
      // Get the next retirement ID before retiring
      const nextRetirementId = await projectToken.nextRetirementId();
      
      const tx = await projectToken.retire(amount, retireForm.reason);
      await tx.wait();
      
      // Fetch the retirement certificate
      const retirementRecord = await projectToken.getRetirementRecord(nextRetirementId);
      
      setRetirementCertificate({
        retirementId: nextRetirementId.toString(),
        user: retirementRecord.user,
        amount: ethers.formatUnits(retirementRecord.amount, 18),
        reason: retirementRecord.reason,
        timestamp: new Date(Number(retirementRecord.timestamp) * 1000).toLocaleString(),
        transactionHash: tx.hash,
        tokenAddress: retireForm.tokenAddress
      });
      
      setShowRetirementModal(true);
      setTxResult(`✅ Retire Tokens successful! Retirement Certificate ID: ${nextRetirementId.toString()}`);
    } catch (error: any) {
      // Only log non-user-rejection errors to console
      const errorMessage = parseContractError(error);
      if (!errorMessage.includes('cancelled by user')) {
        console.error(`Retire Tokens failed:`, error);
      } else {
        // For user cancellations, just log a simple message
        console.log(`Retire Tokens cancelled by user`);
      }
      setTxResult(`❌ Retire Tokens failed: ${errorMessage}`);
    } finally {
      setTxLoading('');
    }
  };

  // View Data functions
  const checkCreditStatus = async () => {
    try {
      setTxLoading('Check Project Info');
      const { signer } = await getWeb3(connectedWallet || undefined);
      const { oracle, batchNFT } = getContracts(signer);
      
      // 🎯 Find Credit ID from Project ID
      const nextCreditId = await oracle.nextCreditId();
      let foundCreditId = null;
      
      for (let i = 1; i < Number(nextCreditId); i++) {
        try {
          const credit = await oracle.getCarbonCredit(i);
          if (credit.projectId === viewCreditForm.projectId) {
            foundCreditId = i;
            break;
          }
        } catch (error) {
          // Credit doesn't exist, skip
        }
      }
      
      if (!foundCreditId) {
        setCreditData(null);
        setBatchData(null);
        setTxResult(`❌ No registered credit found for project ${viewCreditForm.projectId}.\n\n💡 Please register the project first or check available project IDs in the gallery.`);
        return;
      }
      
      // Get credit data
      const credit = await oracle.getCarbonCredit(foundCreditId);
      
      // Get verification request if exists
      let verificationData = null;
      try {
        const requestId = await oracle.creditToRequest(foundCreditId);
        if (requestId !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
          verificationData = await oracle.getVerificationRequest(requestId);
        }
      } catch (error) {
        console.log('No verification request found for this credit');
      }
      
      // 🎨 Also find and get BatchNFT data for this project
      let batchData = null;
      const nextBatchId = await batchNFT.nextBatchId();
      
      for (let i = 1; i < Number(nextBatchId); i++) {
        try {
          const batch = await batchNFT.getBatchMetadata(i);
          if (batch.projectId === viewCreditForm.projectId && batch.isActive) {
            // Found the BatchNFT for this project
            let tokenURI = 'Not available';
            try {
              tokenURI = await batchNFT.tokenURI(i);
            } catch (uriError) {
              console.log('TokenURI not available for this batch');
            }
            
            batchData = {
              batchId: i,
              projectId: batch.projectId,
              totalCredits: ethers.formatUnits(batch.totalCredits, 18),
              issuedCredits: ethers.formatUnits(batch.issuedCredits, 18),
              retiredCredits: ethers.formatUnits(batch.retiredCredits, 18),
              projectTokenAddress: batch.projectTokenAddress,
              creditId: batch.creditId.toString(),
              isActive: batch.isActive,
              createdAt: new Date(Number(batch.createdAt) * 1000).toLocaleString(),
              projectOwner: batch.projectOwner,
              tokenURI
            };
            break;
          }
        } catch (error) {
          // Batch doesn't exist or is inactive, skip
        }
      }
      
      // Set all the data
      setCreditData({
        creditId: foundCreditId,
        amount: ethers.formatUnits(credit.amount, 18),
        projectId: credit.projectId,
        expiryDate: new Date(Number(credit.expiryDate) * 1000).toLocaleDateString(),
        isVerified: credit.isVerified,
        owner: credit.owner,
        createdAt: new Date(Number(credit.createdAt) * 1000).toLocaleString(),
        verifiedAt: credit.verifiedAt > 0 ? new Date(Number(credit.verifiedAt) * 1000).toLocaleString() : 'Not verified',
        verification: verificationData ? {
          gsId: verificationData.gsId,
          availableForSale: verificationData.availableForSale.toString(),
          timestamp: verificationData.timestamp,
          verificationStatus: Number(verificationData.verificationStatus) // Ensure proper type conversion
        } : null
      });
      
      setBatchData(batchData);
      
      const resultMessage = batchData 
        ? `✅ Complete project info retrieved! Credit ID: ${foundCreditId}, BatchNFT ID: ${batchData.batchId}`
        : `✅ Credit found (ID: ${foundCreditId}) but no BatchNFT minted yet for this project`;
      
      setTxResult(resultMessage);
    } catch (error: any) {
      console.error('Check project info failed:', error);
      setCreditData(null);
      setBatchData(null);
      
      // Better error handling
      if (error.code === 'CALL_EXCEPTION') {
        setTxResult(`❌ Project ${viewCreditForm.projectId} not found or invalid`);
      } else if (error.message.includes('network')) {
        setTxResult(`❌ Network error: Please check your connection and try again`);
      } else {
        setTxResult(`❌ Failed to get project info: ${error.reason || error.message}`);
      }
    } finally {
      setTxLoading('');
    }
  };

  // viewBatchNFT function removed - now integrated into checkCreditStatus for unified project queries

  const checkTokenBalance = async () => {
    try {
      setTxLoading('Check Token Balance');
      
      // Validate inputs
      if (!viewTokenForm.tokenAddress || !ethers.isAddress(viewTokenForm.tokenAddress)) {
        setTokenData(null);
        setTxResult(`❌ Please enter a valid token contract address`);
        return;
      }
      
      if (!viewTokenForm.userAddress || !ethers.isAddress(viewTokenForm.userAddress)) {
        setTokenData(null);
        setTxResult(`❌ Please enter a valid user address`);
        return;
      }
      
      const { signer } = await getWeb3(connectedWallet || undefined);
      const projectToken = getProjectTokenContract(viewTokenForm.tokenAddress, signer);
      
      const name = await projectToken.name();
      const symbol = await projectToken.symbol();
      const totalSupply = await projectToken.totalSupply();
      const balance = await projectToken.balanceOf(viewTokenForm.userAddress);
      const totalRetired = await projectToken.totalRetired();
      const batchId = await projectToken.batchId();
      
      setTokenData({
        tokenAddress: viewTokenForm.tokenAddress,
        userAddress: viewTokenForm.userAddress,
        name,
        symbol,
        totalSupply: ethers.formatUnits(totalSupply, 18),
        balance: ethers.formatUnits(balance, 18),
        totalRetired: ethers.formatUnits(totalRetired, 18),
        batchId: batchId.toString()
      });
      
      setTxResult(`✅ Token balance retrieved successfully!`);
    } catch (error: any) {
      console.error('Check token balance failed:', error);
      setTokenData(null);
      
      // Better error handling
      if (error.code === 'CALL_EXCEPTION') {
        setTxResult(`❌ Invalid token contract address or contract does not exist`);
      } else if (error.message.includes('network')) {
        setTxResult(`❌ Network error: Please check your connection and try again`);
      } else if (error.message.includes('missing revert data')) {
        setTxResult(`❌ Contract at ${viewTokenForm.tokenAddress} is not a valid ProjectToken`);
      } else {
        setTxResult(`❌ Failed to get token balance: ${error.reason || error.message}`);
      }
    } finally {
      setTxLoading('');
    }
  };

  // Direct token balance check with specific parameters (for gallery buttons)
  const checkTokenBalanceWithParams = async (tokenAddress: string, userAddress: string) => {
    try {
      setTxLoading('Check Token Balance');
      
      // Validate inputs
      if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
        setTokenData(null);
        setTxResult(`❌ Invalid token contract address`);
        return;
      }
      
      if (!userAddress || !ethers.isAddress(userAddress)) {
        setTokenData(null);
        setTxResult(`❌ Invalid user address`);
        return;
      }
      
      const { signer } = await getWeb3(connectedWallet || undefined);
      const projectToken = getProjectTokenContract(tokenAddress, signer);
      
      const name = await projectToken.name();
      const symbol = await projectToken.symbol();
      const totalSupply = await projectToken.totalSupply();
      const balance = await projectToken.balanceOf(userAddress);
      const totalRetired = await projectToken.totalRetired();
      const batchId = await projectToken.batchId();
      
      const tokenDataResult = {
        tokenAddress,
        userAddress,
        name,
        symbol,
        totalSupply: ethers.formatUnits(totalSupply, 18),
        balance: ethers.formatUnits(balance, 18),
        totalRetired: ethers.formatUnits(totalRetired, 18),
        batchId: batchId.toString()
      };

      // Update form state and token data
      setViewTokenForm({
        tokenAddress,
        userAddress
      });
      setTokenData(tokenDataResult);
      
      setTxResult(`✅ Token balance retrieved successfully!`);
    } catch (error: any) {
      console.error('Check token balance failed:', error);
      setTokenData(null);
      
      // Better error handling
      if (error.code === 'CALL_EXCEPTION') {
        setTxResult(`❌ Invalid token contract address or contract does not exist`);
      } else if (error.message.includes('network')) {
        setTxResult(`❌ Network error: Please check your connection and try again`);
      } else if (error.message.includes('missing revert data')) {
        setTxResult(`❌ Contract at ${tokenAddress} is not a valid ProjectToken`);
      } else {
        setTxResult(`❌ Failed to get token balance: ${error.reason || error.message}`);
      }
    } finally {
      setTxLoading('');
    }
  };

  // Load gallery NFTs
  const loadGalleryNFTs = async () => {
    if (!connected) return;
    
    try {
      setGalleryLoading(true);
      const { signer } = await getWeb3(connectedWallet || undefined);
      const { batchNFT } = getContracts(signer);
      
      const nextBatchId = await batchNFT.nextBatchId();
      const nfts = [];
      
      // Load existing BatchNFTs (up to next batch ID)
      for (let i = 1; i < Number(nextBatchId); i++) {
        try {
          const batch = await batchNFT.getBatchMetadata(i);
          
          // Try to get tokenURI
          let tokenURI = 'Not available';
          try {
            tokenURI = await batchNFT.tokenURI(i);
          } catch (uriError) {
            console.log(`TokenURI not available for batch ${i}`);
          }
          
          nfts.push({
            batchId: i,
            projectId: batch.projectId,
            totalCredits: ethers.formatUnits(batch.totalCredits, 18),
            issuedCredits: ethers.formatUnits(batch.issuedCredits, 18),
            retiredCredits: ethers.formatUnits(batch.retiredCredits, 18),
            projectTokenAddress: batch.projectTokenAddress,
            creditId: batch.creditId.toString(),
            isActive: batch.isActive,
            createdAt: new Date(Number(batch.createdAt) * 1000).toLocaleString(),
            projectOwner: batch.projectOwner,
            tokenURI
          });
        } catch (error) {
          console.log(`Batch ${i} doesn't exist or failed to load`);
        }
      }
      
      setGalleryNFTs(nfts);
    } catch (error) {
      console.error('Failed to load gallery NFTs:', error);
    } finally {
      setGalleryLoading(false);
    }
  };

  // Load gallery when wallet connects
  useEffect(() => {
    if (connected) {
      loadGalleryNFTs();
    }
  }, [connected]);

  // Fetch user retirement history with blockchain verification
  const fetchRetirementHistory = async (tokenAddress: string, userAddress: string) => {
    try {
      setTxLoading('Fetching Retirement History');
      
      if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
        setTxResult(`❌ Please enter a valid token contract address`);
        return;
      }
      
      if (!userAddress || !ethers.isAddress(userAddress)) {
        setTxResult(`❌ Please enter a valid user address`);
        return;
      }
      
      const { signer } = await getWeb3(connectedWallet || undefined);
      const projectToken = getProjectTokenContract(tokenAddress, signer);
      
      // Get blockchain info for verification
      const provider = signer.provider;
      const currentBlock = await provider.getBlockNumber();
      const network = await provider.getNetwork();
      
      // Map chain ID to proper network name
      const getNetworkName = (chainId: bigint) => {
        switch (chainId.toString()) {
          case '43113': return 'Avalanche Fuji Testnet';
          case '43114': return 'Avalanche Mainnet';
          case '1': return 'Ethereum Mainnet';
          case '11155111': return 'Sepolia Testnet';
          default: return `Unknown Network (${chainId})`;
        }
      };
      
      const networkName = getNetworkName(network.chainId);
      
      // Get user retirement IDs from smart contract
      const retirementIds = await projectToken.getUserRetirements(userAddress);
      
      if (retirementIds.length === 0) {
        setRetirementHistory([]);
        setTxResult(`ℹ️ No retirement records found for this address`);
        return;
      }
      
      // Fetch details for each retirement with blockchain verification
      const history = [];
      for (const retirementId of retirementIds) {
        const record = await projectToken.getRetirementRecord(retirementId);
        
        // Get block timestamp to verify on-chain data
        const blockTimestamp = Number(record.timestamp);
        const blockDate = new Date(blockTimestamp * 1000);
        
        history.push({
          retirementId: retirementId.toString(),
          user: record.user,
          amount: ethers.formatUnits(record.amount, 18),
          reason: record.reason,
          timestamp: blockDate.toLocaleString(),
          blockTimestamp: blockTimestamp,
          tokenAddress,
          // Blockchain verification data
          network: networkName,
          chainId: network.chainId.toString(),
          currentBlock,
          dataSource: 'Smart Contract Call',
          contractVerified: true
        });
      }
      
      setRetirementHistory(history);
      setTxResult(`✅ Found ${history.length} retirement record(s) from blockchain`);
    } catch (error: any) {
      console.error('Fetch retirement history failed:', error);
      setRetirementHistory([]);
      
      if (error.code === 'CALL_EXCEPTION') {
        setTxResult(`❌ Invalid token contract address or contract does not exist`);
      } else if (error.message.includes('network')) {
        setTxResult(`❌ Network error: Please check your connection and try again`);
      } else {
        setTxResult(`❌ Failed to fetch retirement history: ${error.reason || error.message}`);
      }
    } finally {
      setTxLoading('');
    }
  };

  // Fetch project details from Gold Standard API
  const fetchProjectDetails = async (projectId: string) => {
    try {
      setProjectDetailsLoading(true);
      
      // Fetch project details
      const projectResponse = await fetch(`https://goldstandard-mockup-api.vercel.app/api/v2/projects/${projectId}`, {
        headers: {
          'X-API-Key': 'chainlink_demo_key'
        }
      });
      
      if (!projectResponse.ok) {
        throw new Error(`Failed to fetch project details: ${projectResponse.status}`);
      }
      
      const projectData = await projectResponse.json();
      
      // Fetch carbon credits data
      const creditsResponse = await fetch(`https://goldstandard-mockup-api.vercel.app/api/v2/projects/${projectId}/carbon-credits`, {
        headers: {
          'X-API-Key': 'chainlink_demo_key'
        }
      });
      
      let creditsData = null;
      if (creditsResponse.ok) {
        creditsData = await creditsResponse.json();
      }
      
      // Fetch impact report
      const impactResponse = await fetch(`https://goldstandard-mockup-api.vercel.app/api/v2/projects/${projectId}/impact-report`, {
        headers: {
          'X-API-Key': 'chainlink_demo_key'
        }
      });
      
      let impactData = null;
      if (impactResponse.ok) {
        impactData = await impactResponse.json();
      }
      
      setProjectDetails({
        project: projectData,
        credits: creditsData,
        impact: impactData
      });
      
      setShowProjectModal(true);
      
    } catch (error: any) {
      console.error('Failed to fetch project details:', error);
      setTxResult(`❌ Failed to fetch project details: ${error.message || 'Unknown error'}`);
    } finally {
      setProjectDetailsLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: '📋 Overview', icon: '📋' },
    { id: 'register', label: '📝 Register Project', icon: '📝' },
    { id: 'verify', label: '⚡ Live Verification', icon: '⚡' },
    { id: 'mint-batch', label: '🎨 Mint BatchNFT', icon: '🎨' },
    { id: 'mint-tokens', label: '🪙 Mint Tokens', icon: '🪙' },
    { id: 'retire', label: '♻️ Retire Tokens', icon: '♻️' },
    { id: 'view', label: '👁️ View System Data', icon: '👁️' },
  ];

  // Show loading screen during hydration
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🌱</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Carbon Credit BatchNFT System</h1>
          <p className="text-gray-600">Loading application...</p>
          <div className="mt-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🌱 OneTon: Verified Carbon Credit NFTs
          </h1>
          <p className="text-gray-600 text-lg mb-2">
            Real-time carbon credit verification using Chainlink Functions
          </p>
          <p className="text-blue-600 font-medium mb-6">
            🎯 Hackathon Demo: Dynamic NFT Metadata | Automated ERC-20 Tokens | Gold Standard API Integration
          </p>
          
          {/* Wallet Connection */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">🔗 Wallet Connection</h2>
            
            {!connected ? (
              <div>
                {availableWallets.length > 0 ? (
                  <div>
                    <p className="text-gray-600 mb-4">Choose your wallet to connect:</p>
                    <div className="flex flex-wrap gap-4 justify-center">
                      {availableWallets.map((wallet) => (
                        <button
                          key={wallet.type}
                          onClick={() => handleWalletConnect(wallet.type)}
                          disabled={loading}
                          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors min-w-[150px]"
                        >
                          <span className="text-xl">{wallet.icon}</span>
                          <span>{loading ? 'Connecting...' : wallet.name}</span>
                        </button>
                      ))}
                    </div>

                    
                    <div className="mt-4 text-sm text-gray-500">
                      <p>💡 Core Wallet is optimized for Avalanche. MetaMask works too!</p>
                      <p>🏔️ Network will auto-switch to Avalanche Fuji testnet</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-red-600 mb-4">❌ No compatible wallets detected</p>
                    <p className="text-gray-600 mb-4">Please install one of the following:</p>

                    
                    <div className="flex gap-4 justify-center">
                      <a 
                        href="https://core.app/" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg"
                      >
                        🏔️ Install Core Wallet
                      </a>
                      <a 
                        href="https://metamask.io/" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg"
                      >
                        🦊 Install MetaMask
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-4">
                  <p className="text-green-800 font-medium">
                    ✅ Connected to {connectedWallet} 
                    {connectedWallet === WalletType.CORE && ' 🏔️'}
                    {connectedWallet === WalletType.METAMASK && ' 🦊'}
                  </p>
                  <p className="text-green-700 text-sm font-mono">{walletAddress}</p>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
                >
                  Disconnect Wallet
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Contract Addresses - Prominent Display for Judges */}
        {connected && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              📋 Deployed Contracts - Avalanche Fuji Testnet
            </h2>
            <p className="text-gray-600 mb-6">
              Live smart contracts powering the OneTon carbon credit verification system
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                <h3 className="font-semibold text-orange-800 mb-3 flex items-center">
                  🔗 Carbon Verification Oracle
                </h3>
                <p className="text-xs font-mono break-all text-orange-700 bg-white p-3 rounded mb-3">
                  0xc195a76987dd0E62407811dc21927C322a85e9eF
                </p>
                <div className="flex space-x-2">
                  <a
                    href="https://testnet.snowtrace.io/address/0xc195a76987dd0E62407811dc21927C322a85e9eF"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-orange-600 text-white px-3 py-2 rounded text-xs text-center hover:bg-orange-700 transition-colors"
                  >
                    🔍 Explorer
                  </a>
                  <a
                    href="https://github.com/wsybok/OneTon_Chainlink/blob/main/contracts/CarbonVerificationOracle.sol"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-gray-700 text-white px-3 py-2 rounded text-xs text-center hover:bg-gray-800 transition-colors"
                  >
                    📄 Code
                  </a>
                </div>
              </div>

              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 mb-3 flex items-center">
                  🎨 Batch NFT Contract
                </h3>
                <p className="text-xs font-mono break-all text-green-700 bg-white p-3 rounded mb-3">
                  0x4134f7B9eCC847D8548176471A31D408959254f9
                </p>
                <div className="flex space-x-2">
                  <a
                    href="https://testnet.snowtrace.io/address/0x4134f7B9eCC847D8548176471A31D408959254f9"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-xs text-center hover:bg-green-700 transition-colors"
                  >
                    🔍 Explorer
                  </a>
                  <a
                    href="https://github.com/wsybok/OneTon_Chainlink/blob/main/contracts/BatchNFT.sol"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-gray-700 text-white px-3 py-2 rounded text-xs text-center hover:bg-gray-800 transition-colors"
                  >
                    📄 Code
                  </a>
                </div>
              </div>

              <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-purple-800 mb-3 flex items-center">
                  🏭 Token Factory Contract
                </h3>
                <p className="text-xs font-mono break-all text-purple-700 bg-white p-3 rounded mb-3">
                  0x0B6D191B449EBB814Eb0332490683a802947b2CA
                </p>
                <div className="flex space-x-2">
                  <a
                    href="https://testnet.snowtrace.io/address/0x0B6D191B449EBB814Eb0332490683a802947b2CA"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-purple-600 text-white px-3 py-2 rounded text-xs text-center hover:bg-purple-700 transition-colors"
                  >
                    🔍 Explorer
                  </a>
                  <a
                    href="https://github.com/wsybok/OneTon_Chainlink/blob/main/contracts/TokenFactory.sol"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-gray-700 text-white px-3 py-2 rounded text-xs text-center hover:bg-gray-800 transition-colors"
                  >
                    📄 Code
                  </a>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">⛓️</span>
                <div>
                  <h4 className="font-semibold text-blue-800">Blockchain Verification</h4>
                  <p className="text-sm text-blue-700">
                    All contracts are verified and deployed on Avalanche Fuji Testnet. 
                    Click "Explorer" to view on-chain transactions and "Code" to see smart contract source.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-orange-600 mb-2">
              Chainlink Functions Verification
            </h3>
            <p className="text-gray-600">
              Real-time verification of carbon credits using Chainlink Functions to query Gold Standard database
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-4xl mb-4">🏷️</div>
            <h3 className="text-xl font-semibold text-green-600 mb-2">
              Dynamic NFT Metadata
            </h3>
            <p className="text-gray-600">
              NFT metadata powered by live Chainlink Functions data including verification status and available credits
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-4xl mb-4">🪙</div>
            <h3 className="text-xl font-semibold text-purple-600 mb-2">
              Project Tokens
            </h3>
            <p className="text-gray-600">
              ERC-20 tokens automatically created with BatchNFTs for carbon credit trading and retirement
            </p>
          </div>
        </div>

        {/* BatchNFT Gallery */}
        {connected && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">
                🎨 BatchNFT Gallery
              </h2>
              <button
                onClick={loadGalleryNFTs}
                disabled={galleryLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
              >
                {galleryLoading ? '⏳ Loading...' : '🔄 Refresh'}
              </button>
            </div>
            
            {galleryLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Loading BatchNFTs...</p>
              </div>
            ) : galleryNFTs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {galleryNFTs.map((nft) => (
                  <div key={nft.batchId} className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                        #{nft.batchId}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        nft.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {nft.isActive ? '✅ Active' : '❌ Inactive'}
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Project {nft.projectId}
                    </h3>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Credits:</span>
                        <span className="font-medium">{nft.totalCredits} tonnes</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Issued:</span>
                        <span className="font-medium text-green-600">{nft.issuedCredits}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Retired:</span>
                        <span className="font-medium text-red-600">{nft.retiredCredits}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Available:</span>
                        <span className="font-medium text-blue-600">
                          {(parseFloat(nft.totalCredits) - parseFloat(nft.retiredCredits)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">ProjectToken:</p>
                      <p className="text-xs font-mono text-gray-700 break-all bg-gray-100 p-2 rounded">
                        {nft.projectTokenAddress}
                      </p>
                    </div>
                    
                    <div className="mt-4 flex space-x-2">
                      <button
                        onClick={() => fetchProjectDetails(nft.projectId)}
                        disabled={projectDetailsLoading}
                        className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {projectDetailsLoading ? '⏳' : '📊 View Details'}
                      </button>
                      <button
                        onClick={async () => {
                          // Navigate to view tab first
                          setActiveTab('view');
                          // Use the direct function with parameters
                          await checkTokenBalanceWithParams(nft.projectTokenAddress, walletAddress);
                        }}
                        disabled={!!txLoading}
                        className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
                      >
                        {txLoading === 'Check Token Balance' ? '⏳' : '🪙 Check Token'}
                      </button>
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-3">
                      Created: {nft.createdAt}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <div className="text-6xl mb-4">🎨</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No BatchNFTs Found</h3>
                <p className="text-gray-600 mb-4">Start by registering and verifying carbon credits, then mint your first BatchNFT!</p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => setActiveTab('register')}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
                  >
                    Register Credit
                  </button>
                  <button
                    onClick={() => setActiveTab('mint-batch')}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Mint BatchNFT
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Interactive Demo Sections */}
        {connected && (
          <div className="space-y-8">

            {/* Interactive Tabs */}
            <div className="bg-white rounded-lg shadow-lg">
              {/* Tab Headers */}
              <div className="border-b border-gray-200">
                <div className="flex flex-wrap">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-600 text-blue-600 bg-blue-50'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="mr-2">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-xl mb-6">
                      <h3 className="text-2xl font-semibold text-gray-800 mb-2">
                        🌟 Hackathon Demo: Carbon Credit Verification System
                      </h3>
                      <p className="text-gray-700 mb-4">
                        This system demonstrates real-time carbon credit verification using Chainlink Functions, 
                        dynamic NFT metadata, and automated ERC-20 token generation.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-lg">
                          <h4 className="font-semibold text-green-800 mb-2">📊 Available Demo Projects</h4>
                          <ul className="text-sm text-gray-700 space-y-1">
                            <li>• <strong>GS-15234:</strong> Forest Conservation Project</li>
                            <li>• <strong>GS-15235:</strong> Renewable Energy Initiative</li>
                          </ul>
                          <p className="text-xs text-gray-600 mt-2">
                            These projects are pre-configured in our mockup Gold Standard API
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                          <h4 className="font-semibold text-blue-800 mb-2">🔗 Chainlink Integration</h4>
                          <ul className="text-sm text-gray-700 space-y-1">
                            <li>• Real-time API verification</li>
                            <li>• Dynamic NFT metadata updates</li>
                            <li>• Decentralized oracle network</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">
                      🔄 Interactive Demo Workflow
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-4 p-4 bg-orange-50 rounded-lg">
                        <div className="bg-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div>
                        <div>
                          <h4 className="font-semibold text-orange-800 mb-2">Register Carbon Credit</h4>
                          <p className="text-orange-700 mb-2">Register a new carbon credit in the oracle system</p>
                          <button
                            onClick={() => setActiveTab('register')}
                            className="text-orange-600 hover:text-orange-800 font-medium text-sm"
                          >
                            Go to Register →
                          </button>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg">
                        <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div>
                        <div>
                          <h4 className="font-semibold text-blue-800 mb-2">Request Chainlink Verification</h4>
                          <p className="text-blue-700 mb-2">Trigger Chainlink Functions to verify credit with Gold Standard API</p>
                          <button
                            onClick={() => setActiveTab('verify')}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            Go to Verify →
                          </button>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-lg">
                        <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div>
                        <div>
                          <h4 className="font-semibold text-green-800 mb-2">Mint BatchNFT with ProjectToken</h4>
                          <p className="text-green-700 mb-2">Create NFT with live Chainlink data and automatic ERC-20 token</p>
                          <button
                            onClick={() => setActiveTab('mint-batch')}
                            className="text-green-600 hover:text-green-800 font-medium text-sm"
                          >
                            Go to Mint BatchNFT →
                          </button>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4 p-4 bg-purple-50 rounded-lg">
                        <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">4</div>
                        <div>
                          <h4 className="font-semibold text-purple-800 mb-2">Interact with ProjectTokens</h4>
                          <p className="text-purple-700 mb-2">Mint tokens to users or retire them for carbon offsetting</p>
                          <div className="flex space-x-4">
                            <button
                              onClick={() => setActiveTab('mint-tokens')}
                              className="text-purple-600 hover:text-purple-800 font-medium text-sm"
                            >
                              Mint Tokens →
                            </button>
                            <button
                              onClick={() => setActiveTab('retire')}
                              className="text-purple-600 hover:text-purple-800 font-medium text-sm"
                            >
                              Retire Tokens →
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Register Carbon Credit Tab */}
                {activeTab === 'register' && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                      📝 Register Gold Standard Project
                    </h3>
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-blue-800 text-sm">
                        💡 <strong>Project Registration:</strong> Register your carbon credit project from the Gold Standard registry 
                        to begin the verification and tokenization process.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Project Credits (tonnes CO2e)
                          </label>
                          <input
                            type="number"
                            value={registerForm.amount}
                            onChange={(e) => setRegisterForm({...registerForm, amount: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="75000"
                          />
                          <p className="text-xs text-gray-600 mt-1">Total carbon credits available from this project</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Gold Standard Project ID
                          </label>
                          <input
                            type="text"
                            value={registerForm.projectId}
                            onChange={(e) => setRegisterForm({...registerForm, projectId: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="GS-15234"
                          />
                          <p className="text-xs text-gray-600 mt-1">The source project this credit batch comes from</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Expiry Date
                          </label>
                          <input
                            type="date"
                            value={registerForm.expiryDate}
                            onChange={(e) => setRegisterForm({...registerForm, expiryDate: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <button
                          onClick={registerCarbonCredit}
                          disabled={!!txLoading}
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50"
                        >
                          {txLoading === 'Register Carbon Credit' ? '⏳ Registering Project...' : '📝 Register Project'}
                        </button>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-800 mb-2">📋 Registration Process:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Connects your carbon project to our verification system</li>
                          <li>• Prepares for real-time data validation via Chainlink</li>
                          <li>• Enables NFT and token creation for verified credits</li>
                          <li>• Establishes project ownership and tracking</li>
                        </ul>
                        
                        <div className="mt-4 p-3 bg-blue-100 rounded">
                          <h5 className="font-medium text-blue-800 mb-1">🎯 Demo Projects:</h5>
                          <div className="text-blue-700 text-sm space-y-1">
                            <p><strong>GS-15235:</strong> Wind Farm Maharashtra India (75,000 credits)</p>
                            <p><strong>GS-15236:</strong> Improved Cookstoves Cambodia</p>
                          </div>
                          <p className="text-blue-600 text-xs mt-2">
                            These projects have live API data for demonstration
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Verification Tab */}
                {activeTab === 'verify' && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                      🔗 Live Chainlink Functions Verification
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Gold Standard Project ID
                          </label>
                          <input
                            type="text"
                            value={verifyForm.projectId}
                            onChange={(e) => setVerifyForm({...verifyForm, projectId: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="GS-15234"
                          />
                          <p className="text-xs text-gray-600 mt-1">Enter the project ID you want to verify with live API data</p>
                        </div>
                        <button
                          onClick={requestVerification}
                          disabled={!!txLoading}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50"
                        >
                          {txLoading === 'Request Chainlink Verification' ? '⚡ Calling Live API...' : '⚡ Start Live Verification'}
                        </button>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-800 mb-2">🔗 Real Chainlink Functions Process:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• 📡 <strong>Decentralized Oracle Network (DON)</strong> executes request</li>
                          <li>• 🌐 <strong>Live API Call:</strong> JavaScript code queries goldstandard-mockup-api.vercel.app</li>
                          <li>• 📊 <strong>Real Data Returned:</strong> Available credits, project status, timestamp</li>
                          <li>• ⛓️ <strong>On-Chain Update:</strong> Verification result stored on Avalanche</li>
                          <li>• ⏱️ <strong>Processing Time:</strong> 1-2 minutes for network consensus</li>
                        </ul>
                        

                        
                        <div className="mt-4 p-3 bg-blue-100 rounded">
                          <h5 className="font-medium text-blue-800 mb-1">📈 Demo Projects with Live Data:</h5>
                          <div className="text-blue-700 text-xs space-y-1">
                            <p><strong>GS-15234:</strong> Solar Kenya - 35,000 credits available</p>
                            <p><strong>GS-15235:</strong> Wind India - 75,000 credits available</p>
                            <p>API responds with real project metrics and timestamps</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 🔗 Chainlink Callback Data Display */}
                    {(isPollingVerification || verificationResult) && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                          🔗 Live Chainlink Functions Response
                          {isPollingVerification && (
                            <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full animate-pulse">
                              ⏳ Waiting for callback...
                            </span>
                          )}
                        </h4>
                        
                        {isPollingVerification && !verificationResult && (
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>📡 <strong>Status:</strong> Chainlink DON processing request...</p>
                            <p>🌐 <strong>API Target:</strong> goldstandard-mockup-api.vercel.app</p>
                            <p>⏱️ <strong>Expected Time:</strong> 1-2 minutes for consensus</p>
                            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                            </div>
                          </div>
                        )}
                        
                        {verificationResult && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-white p-3 rounded border">
                                <h5 className="font-medium text-gray-700 mb-2">📊 API Response Data</h5>
                                <div className="text-sm space-y-1">
                                  <p><strong>Project ID:</strong> {verificationResult.gsId}</p>
                                  <p><strong>Credits Available:</strong> {Number(verificationResult.availableForSale).toLocaleString()}</p>
                                  <p><strong>API Timestamp:</strong> {verificationResult.timestamp}</p>
                                </div>
                              </div>
                              
                              <div className="bg-white p-3 rounded border">
                                <h5 className="font-medium text-gray-700 mb-2">⛓️ Blockchain Record</h5>
                                <div className="text-sm space-y-1">
                                  <p><strong>Request ID:</strong> 
                                    <span className="font-mono text-xs ml-1">{verificationResult.requestId}</span>
                                  </p>
                                  <p><strong>Credit ID:</strong> {verificationResult.creditId}</p>
                                  <p><strong>Status:</strong> 
                                    <span className={`ml-1 px-2 py-1 rounded text-xs ${
                                      verificationResult.verificationStatus === 1 ? 'bg-green-100 text-green-800' :
                                      verificationResult.verificationStatus === 2 ? 'bg-red-100 text-red-800' :
                                      'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {verificationResult.verificationStatus === 1 ? '✅ VERIFIED' :
                                       verificationResult.verificationStatus === 2 ? '❌ FAILED' : '⏳ PENDING'}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-green-50 p-3 rounded border border-green-200">
                              <p className="text-green-800 text-sm">
                                <strong>✅ Real Chainlink Functions Proof:</strong> This data was fetched live from the Gold Standard API 
                                by the Chainlink Decentralized Oracle Network and stored on-chain at {verificationResult.callbackTime}.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Mint BatchNFT Tab */}
                {activeTab === 'mint-batch' && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                      🎨 Mint BatchNFT with ProjectToken
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Recipient Address
                          </label>
                          <input
                            type="text"
                            value={mintBatchForm.recipient}
                            onChange={(e) => setMintBatchForm({...mintBatchForm, recipient: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            placeholder="0x..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Project ID
                          </label>
                          <input
                            type="text"
                            value={mintBatchForm.projectId}
                            onChange={(e) => setMintBatchForm({...mintBatchForm, projectId: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="GS-15234"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Total Credits
                          </label>
                          <input
                            type="number"
                            value={mintBatchForm.totalCredits}
                            onChange={(e) => setMintBatchForm({...mintBatchForm, totalCredits: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="5000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Credit ID (must be verified)
                          </label>
                          <input
                            type="number"
                            value={mintBatchForm.creditId}
                            onChange={(e) => setMintBatchForm({...mintBatchForm, creditId: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="2"
                          />
                        </div>
                        <button
                          onClick={mintBatchNFT}
                          disabled={!!txLoading}
                          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50"
                        >
                          {txLoading === 'Mint BatchNFT' ? '⏳ Minting...' : '🎨 Mint BatchNFT'}
                        </button>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-800 mb-2">This creates:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• 🎨 BatchNFT with live Chainlink metadata</li>
                          <li>• 🪙 ProjectToken (ERC-20) automatically</li>
                          <li>• 🔗 Dual-pointer synchronization</li>
                          <li>• 📊 Dynamic metadata from oracle data</li>
                        </ul>
                        <div className="mt-4 p-3 bg-yellow-100 rounded">
                          <p className="text-yellow-800 text-sm font-medium">
                            ⚠️ Requires Chainlink-verified credit
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mint Tokens Tab */}
                {activeTab === 'mint-tokens' && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                      🪙 Mint ProjectTokens
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ProjectToken Contract Address
                          </label>
                          <input
                            type="text"
                            value={mintTokenForm.tokenAddress}
                            onChange={(e) => setMintTokenForm({...mintTokenForm, tokenAddress: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            placeholder="0x..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Recipient Address
                          </label>
                          <input
                            type="text"
                            value={mintTokenForm.recipient}
                            onChange={(e) => setMintTokenForm({...mintTokenForm, recipient: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            placeholder="0x..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Amount
                          </label>
                          <input
                            type="number"
                            value={mintTokenForm.amount}
                            onChange={(e) => setMintTokenForm({...mintTokenForm, amount: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="1000"
                          />
                        </div>
                        <button
                          onClick={mintTokens}
                          disabled={!!txLoading}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50"
                        >
                          {txLoading === 'Mint Tokens' ? '⏳ Minting...' : '🪙 Mint Tokens'}
                        </button>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-800 mb-2">Token Minting:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Mints ERC-20 tokens to specified address</li>
                          <li>• Updates BatchNFT issued credits counter</li>
                          <li>• Maintains dual-pointer synchronization</li>
                          <li>• Used for token distribution</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Retire Tokens Tab */}
                {activeTab === 'retire' && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                      ♻️ Retire Tokens for Carbon Offsetting
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ProjectToken Contract Address
                          </label>
                          <input
                            type="text"
                            value={retireForm.tokenAddress}
                            onChange={(e) => setRetireForm({...retireForm, tokenAddress: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            placeholder="0x..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Amount to Retire
                          </label>
                          <input
                            type="number"
                            value={retireForm.amount}
                            onChange={(e) => setRetireForm({...retireForm, amount: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="100"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Retirement Reason
                          </label>
                          <textarea
                            value={retireForm.reason}
                            onChange={(e) => setRetireForm({...retireForm, reason: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            placeholder="Carbon offset for business operations"
                          />
                        </div>
                        <button
                          onClick={retireTokens}
                          disabled={!!txLoading}
                          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50"
                        >
                          {txLoading === 'Retire Tokens' ? '⏳ Retiring...' : '♻️ Retire Tokens'}
                        </button>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-800 mb-2">Token Retirement:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Burns tokens permanently</li>
                          <li>• Records retirement reason on-chain</li>
                          <li>• Updates BatchNFT retired credits counter</li>
                          <li>• Creates verifiable carbon offset record</li>
                        </ul>
                        <div className="mt-4 p-3 bg-red-100 rounded">
                          <p className="text-red-800 text-sm font-medium">
                            ⚠️ Retirement is permanent and irreversible
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* View Data Tab */}
                {activeTab === 'view' && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                      👁️ View System Data
                    </h3>
                    <p className="text-gray-600 mb-6">
                      🎯 Query your registered projects and NFTs using user-friendly Project IDs instead of internal system IDs
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <h4 className="font-semibold text-blue-800 mb-2">🎯 Complete Project Information</h4>
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={viewCreditForm.projectId}
                              onChange={(e) => setViewCreditForm({...viewCreditForm, projectId: e.target.value})}
                              placeholder="Project ID (e.g., GS-15234)"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                            <button 
                              onClick={checkCreditStatus}
                              disabled={!!txLoading}
                              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                            >
                              {txLoading === 'Check Project Info' ? '⏳ Loading All Data...' : '🎯 Get Complete Project Info'}
                            </button>
                          </div>
                          <p className="text-xs text-blue-700 mt-2">
                            💡 Shows Credit Status + BatchNFT + Verification Data for the project
                          </p>
                        </div>



                        <div className="bg-purple-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-purple-800 mb-2">🪙 Check Token Balance</h4>
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={viewTokenForm.tokenAddress}
                              onChange={(e) => setViewTokenForm({...viewTokenForm, tokenAddress: e.target.value})}
                              placeholder="ProjectToken Contract Address"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                            />
                            <input
                              type="text"
                              value={viewTokenForm.userAddress}
                              onChange={(e) => setViewTokenForm({...viewTokenForm, userAddress: e.target.value})}
                              placeholder="User Wallet Address"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                            />
                            <button 
                              onClick={checkTokenBalance}
                              disabled={!!txLoading}
                              className="w-full bg-purple-600 text-white px-4 py-2 rounded-md text-sm hover:bg-purple-700 disabled:opacity-50"
                            >
                              {txLoading === 'Check Token Balance' ? '⏳ Querying...' : '🪙 Check Balance & Details'}
                            </button>
                          </div>
                          <p className="text-xs text-purple-700 mt-2">
                            💡 Get token info from BatchNFT gallery or mint new tokens first
                          </p>
                        </div>

                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                          <h4 className="font-semibold text-red-800 mb-2">🏆 View Retirement History (On-Chain Verified)</h4>
                          <p className="text-xs text-red-700 mb-3">
                            ⛓️ Query smart contract directly for verified retirement certificates with blockchain proof
                          </p>
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={viewTokenForm.tokenAddress}
                              onChange={(e) => setViewTokenForm({...viewTokenForm, tokenAddress: e.target.value})}
                              placeholder="ProjectToken Contract Address"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                            />
                            <input
                              type="text"
                              value={viewTokenForm.userAddress}
                              onChange={(e) => setViewTokenForm({...viewTokenForm, userAddress: e.target.value})}
                              placeholder="User Wallet Address"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                            />
                            <button 
                              onClick={() => fetchRetirementHistory(viewTokenForm.tokenAddress, viewTokenForm.userAddress)}
                              disabled={!!txLoading}
                              className="w-full bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                            >
                              <span>⛓️</span>
                              <span>{txLoading === 'Fetching Retirement History' ? '⏳ Querying Blockchain...' : 'Query Smart Contract'}</span>
                            </button>
                          </div>
                          <div className="mt-2 text-xs text-gray-600">
                            💡 This queries the ProjectToken smart contract's retirement records directly from Avalanche Fuji
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-800 mb-2">Query Results:</h4>
                        
                        {/* Combined Project Data Display */}
                        {creditData && (
                          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h5 className="font-medium text-blue-800 mb-3 flex items-center">
                              🎯 Project {creditData.projectId} - Complete Information
                              {creditData.isVerified && <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">✅ Verified</span>}
                            </h5>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Credit Information */}
                              <div className="bg-white p-3 rounded border">
                                <h6 className="font-medium text-gray-700 mb-2">📊 Credit Registration</h6>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <p><strong>Credit ID:</strong> #{creditData.creditId}</p>
                                  <p><strong>Amount:</strong> {creditData.amount} tonnes CO2</p>
                                  <p><strong>Owner:</strong> 
                                    <span className="font-mono text-xs" title={creditData.owner}>
                                      {truncateAddress(creditData.owner)}
                                    </span>
                                  </p>
                                  <p><strong>Created:</strong> {creditData.createdAt}</p>
                                  <p><strong>Verified:</strong> {creditData.verifiedAt}</p>
                                  <p><strong>Expires:</strong> {creditData.expiryDate}</p>
                                </div>
                              </div>
                              
                              {/* Chainlink Verification Data */}
                              {creditData.verification && (
                                <div className="bg-white p-3 rounded border">
                                  <h6 className="font-medium text-gray-700 mb-2">🔗 Chainlink Verification</h6>
                                  <div className="text-sm text-gray-600 space-y-1">
                                    <p><strong>GS Project:</strong> {creditData.verification.gsId}</p>
                                    <p><strong>Credits Available:</strong> {Number(creditData.verification.availableForSale).toLocaleString()}</p>
                                    <p><strong>API Timestamp:</strong> {creditData.verification.timestamp}</p>
                                    <p><strong>Status:</strong> 
                                      <span className={`ml-1 px-2 py-1 rounded text-xs ${
                                        creditData.verification.verificationStatus === 1 ? 'bg-green-100 text-green-800' :
                                        creditData.verification.verificationStatus === 2 ? 'bg-red-100 text-red-800' :
                                        'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {creditData.verification.verificationStatus === 1 ? '✅ VERIFIED' :
                                         creditData.verification.verificationStatus === 2 ? '❌ FAILED' : '⏳ PENDING'}
                                      </span>
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* BatchNFT Information (if exists) */}
                            {batchData && (
                              <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
                                <h6 className="font-medium text-green-800 mb-2">🎨 BatchNFT #{batchData.batchId}</h6>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <p className="text-gray-600">Total Credits</p>
                                    <p className="font-medium text-green-700">{batchData.totalCredits}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600">Issued</p>
                                    <p className="font-medium text-blue-700">{batchData.issuedCredits}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600">Retired</p>
                                    <p className="font-medium text-red-700">{batchData.retiredCredits}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600">Available</p>
                                    <p className="font-medium text-purple-700">{(parseFloat(batchData.totalCredits) - parseFloat(batchData.issuedCredits)).toFixed(2)}</p>
                                  </div>
                                </div>
                                <div className="mt-2 text-xs text-gray-600">
                                  <p><strong>Token Contract:</strong> 
                                    <span className="font-mono" title={batchData.projectTokenAddress}>
                                      {truncateAddress(batchData.projectTokenAddress)}
                                    </span>
                                  </p>
                                  <p><strong>Created:</strong> {batchData.createdAt}</p>
                                </div>
                              </div>
                            )}
                            
                            {/* No BatchNFT Message */}
                            {!batchData && (
                              <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                                <p className="text-yellow-800 text-sm">
                                  ⚠️ <strong>No BatchNFT found:</strong> This project is registered but no BatchNFT has been minted yet. 
                                  Use the "🎨 Mint BatchNFT" tab to create one.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Token Data Display */}
                        {tokenData && (
                          <div className="mb-4 p-3 bg-purple-100 rounded">
                            <h5 className="font-medium text-purple-800 mb-2">🪙 {tokenData.name} ({tokenData.symbol})</h5>
                            <div className="text-sm text-purple-700 space-y-1">
                              <p><strong>Balance:</strong> {tokenData.balance}</p>
                              <p><strong>Total Supply:</strong> {tokenData.totalSupply}</p>
                              <p><strong>Total Retired:</strong> {tokenData.totalRetired}</p>
                              <p><strong>Batch ID:</strong> {tokenData.batchId}</p>
                              <p><strong>User:</strong> 
                                <span className="font-mono text-xs" title={tokenData.userAddress}>
                                  {truncateAddress(tokenData.userAddress)}
                                </span>
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Retirement History Display with Blockchain Verification */}
                        {retirementHistory.length > 0 && (
                          <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium text-red-800">🏆 Retirement History ({retirementHistory.length} record{retirementHistory.length > 1 ? 's' : ''})</h5>
                              <div className="flex items-center space-x-2 text-xs">
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">⛓️ On-Chain Verified</span>
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">📡 Live Data</span>
                              </div>
                            </div>
                            
                            {/* Blockchain Verification Header */}
                            {retirementHistory[0] && (
                              <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className="text-blue-600 text-lg">⛓️</span>
                                  <h6 className="font-semibold text-blue-800">Blockchain Verification</h6>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-blue-700">
                                  <div><strong>Network:</strong> {retirementHistory[0].network} (Chain ID: {retirementHistory[0].chainId})</div>
                                  <div><strong>Data Source:</strong> {retirementHistory[0].dataSource}</div>
                                  <div><strong>Current Block:</strong> #{retirementHistory[0].currentBlock.toLocaleString()}</div>
                                </div>
                                <div className="mt-2 flex space-x-2">
                                  <a
                                    href={`https://testnet.snowtrace.io/address/${retirementHistory[0].tokenAddress}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                                  >
                                    🔍 View Contract
                                  </a>
                                  <a
                                    href="https://github.com/wsybok/OneTon_Chainlink/blob/main/contracts/ProjectToken.sol"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-700 transition-colors"
                                  >
                                    📄 Source Code
                                  </a>
                                </div>
                              </div>
                            )}
                            
                            <div className="space-y-3 max-h-60 overflow-y-auto">
                              {retirementHistory.map((record, index) => (
                                <div key={index} className="bg-white p-4 rounded-lg border border-red-200 shadow-sm">
                                  <div className="text-sm text-red-700 space-y-2">
                                    <div className="flex justify-between items-start">
                                      <div className="flex items-center space-x-2">
                                        <span className="font-medium">Certificate #{record.retirementId}</span>
                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">✅ Verified</span>
                                      </div>
                                      <span className="text-red-600 font-bold text-lg">{record.amount} tonnes CO₂e</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div>
                                        <p><strong>🕐 Retirement Date:</strong> {record.timestamp}</p>
                                        <p><strong>🎯 Reason:</strong> <em>"{record.reason}"</em></p>
                                        <p className="text-xs text-gray-600">
                                          <strong>🌳 Impact:</strong> ~{Math.round(parseFloat(record.amount) * 2.5)} trees planted equivalent
                                        </p>
                                      </div>
                                      
                                      <div className="bg-gray-50 p-2 rounded">
                                        <p className="text-xs font-semibold text-gray-700 mb-1">⛓️ Blockchain Evidence:</p>
                                        <p className="text-xs text-gray-600"><strong>Block Timestamp:</strong> {record.blockTimestamp}</p>
                                        <p className="text-xs text-gray-600"><strong>User Address:</strong> {record.user.slice(0,6)}...{record.user.slice(-4)}</p>
                                        <p className="text-xs text-gray-600"><strong>Contract:</strong> {record.tokenAddress.slice(0,6)}...{record.tokenAddress.slice(-4)}</p>
                                        <div className="mt-1">
                                          <a
                                            href={`https://testnet.snowtrace.io/address/${record.tokenAddress}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                                          >
                                            🔗 Verify on Explorer
                                          </a>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <div className="mt-4 p-3 bg-red-100 rounded-lg">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-sm font-semibold text-red-800">
                                    📊 Total Carbon Offset: {retirementHistory.reduce((sum, record) => sum + parseFloat(record.amount), 0).toFixed(2)} tonnes CO₂e
                                  </p>
                                  <p className="text-xs text-red-600">
                                    🌍 Environmental Impact: ~{Math.round(retirementHistory.reduce((sum, record) => sum + parseFloat(record.amount), 0) * 2.5)} trees planted equivalent
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-600">✅ All records verified on-chain</p>
                                  <p className="text-xs text-gray-600">📡 Fetched live from smart contracts</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {!creditData && !batchData && !tokenData && retirementHistory.length === 0 && (
                          <div className="text-sm text-gray-500">
                            <p>Available Blockchain Queries:</p>
                            <ul className="mt-2 space-y-1">
                              <li>• <strong>Credit Status:</strong> Verification status, Chainlink data</li>
                              <li>• <strong>BatchNFT Metadata:</strong> Dynamic NFT data with oracle info</li>
                              <li>• <strong>Token Info:</strong> Balance, total supply, retirement records</li>
                              <li>• <strong>⛓️ Retirement History:</strong> On-chain verified carbon offsetting certificates</li>
                            </ul>
                            <div className="mt-4 p-3 bg-blue-100 rounded">
                              <p className="text-blue-800 text-sm">
                                💡 All data is fetched live from Avalanche Fuji smart contracts
                              </p>
                            </div>
                            <div className="mt-4 p-3 bg-green-100 rounded">
                              <p className="text-green-800 text-sm">
                                🏆 <strong>Blockchain Verified:</strong> Retirement certificates are stored permanently on-chain with explorer links!
                              </p>
                            </div>
                            <div className="mt-4 p-3 bg-purple-100 rounded">
                              <div className="flex items-center space-x-2">
                                <span className="text-purple-600 text-lg">⛓️</span>
                                <div>
                                  <p className="text-purple-800 text-sm font-semibold">Judge Verification Features:</p>
                                  <p className="text-purple-700 text-xs">
                                    • Direct smart contract queries • Explorer links • Source code access • Network verification
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Transaction Result Display */}
                {txResult && (
                  <div className={`mt-6 p-4 rounded-lg ${
                    txResult.includes('✅') 
                      ? 'bg-green-100 border border-green-300' 
                      : 'bg-red-100 border border-red-300'
                  }`}>
                    <p className={`font-medium ${
                      txResult.includes('✅') ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {txResult}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Technical Highlights - keeping from original */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-6 text-gray-800">
                ⚡ Technical Highlights
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-orange-800 mb-2">🔗 Chainlink Functions Integration</h3>
                    <ul className="text-sm text-orange-700 space-y-1">
                      <li>• Real-time API queries to Gold Standard</li>
                      <li>• Decentralized oracle network verification</li>
                      <li>• Custom JavaScript source code execution</li>
                    </ul>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-800 mb-2">🏷️ Dynamic NFT System</h3>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Metadata powered by live oracle data</li>
                      <li>• ERC-721 BatchNFT with batch management</li>
                      <li>• Automatic ProjectToken generation</li>
                    </ul>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-purple-800 mb-2">🪙 Dual-Token Architecture</h3>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>• ERC-20 ProjectTokens for trading</li>
                      <li>• Synchronized balance tracking</li>
                      <li>• Retirement mechanism for offsetting</li>
                    </ul>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-2">⛓️ Avalanche Fuji</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Fast transaction processing</li>
                      <li>• Low gas fees for demos</li>
                      <li>• EVM compatible infrastructure</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Project Details Modal */}
        {showProjectModal && projectDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">
                      🌱 {projectDetails.project?.data?.name || 'Project Details'}
                    </h2>
                    <p className="text-green-100">
                      ID: {projectDetails.project?.data?.gsId}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowProjectModal(false)}
                    className="text-white hover:text-gray-300 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Project Information */}
                {projectDetails.project?.data && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                         <div className="bg-blue-50 p-4 rounded-lg">
                       <h3 className="text-lg font-semibold text-blue-800 mb-3">📋 Project Information</h3>
                       <div className="space-y-2 text-sm">
                         <div>
                           <span className="font-medium text-gray-700">Location:</span>
                           <span className="ml-2">{projectDetails.project.data.location?.country}, {projectDetails.project.data.location?.region}</span>
                         </div>
                         <div>
                           <span className="font-medium text-gray-700">Type:</span>
                           <span className="ml-2">{projectDetails.project.data.type}</span>
                         </div>
                         <div>
                           <span className="font-medium text-gray-700">Status:</span>
                           <span className={`ml-2 px-2 py-1 rounded text-xs ${
                             projectDetails.project.data.status === 'ACTIVE' 
                               ? 'bg-green-100 text-green-800' 
                               : 'bg-gray-100 text-gray-600'
                           }`}>
                             {projectDetails.project.data.status}
                           </span>
                         </div>
                         <div>
                           <span className="font-medium text-gray-700">Developer:</span>
                           <span className="ml-2">{projectDetails.project.data.developer}</span>
                         </div>
                         <div>
                           <span className="font-medium text-gray-700">Registry Date:</span>
                           <span className="ml-2">{new Date(projectDetails.project.data.registrationDate).toLocaleDateString()}</span>
                         </div>
                       </div>
                     </div>

                                         <div className="bg-green-50 p-4 rounded-lg">
                       <h3 className="text-lg font-semibold text-green-800 mb-3">🌍 Project Details</h3>
                       <div className="space-y-2 text-sm">
                         <div>
                           <span className="font-medium text-gray-700">Methodology:</span>
                           <span className="ml-2">{projectDetails.project.data.methodology}</span>
                         </div>
                         <div>
                           <span className="font-medium text-gray-700">Current Phase:</span>
                           <span className="ml-2">{projectDetails.project.data.currentPhase}</span>
                         </div>
                         <div>
                           <span className="font-medium text-gray-700">Expected Credits:</span>
                           <span className="ml-2">{projectDetails.project.data.totalExpectedCredits?.toLocaleString()}</span>
                         </div>
                         <div className="mt-3">
                           <p className="text-gray-700">{projectDetails.project.data.description}</p>
                         </div>
                       </div>
                     </div>
                  </div>
                )}

                {/* Carbon Credits Information */}
                {projectDetails.credits?.data && (
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-orange-800 mb-3">💰 Carbon Credits Status</h3>
                                         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                       <div className="text-center">
                         <div className="text-2xl font-bold text-green-600">
                           {projectDetails.credits.data.availableForSale?.toLocaleString()}
                         </div>
                         <div className="text-sm text-gray-600">Available for Sale</div>
                       </div>
                       <div className="text-center">
                         <div className="text-2xl font-bold text-blue-600">
                           {projectDetails.credits.data.totalIssued?.toLocaleString()}
                         </div>
                         <div className="text-sm text-gray-600">Total Issued</div>
                       </div>
                       <div className="text-center">
                         <div className="text-2xl font-bold text-red-600">
                           {projectDetails.credits.data.totalRetired?.toLocaleString()}
                         </div>
                         <div className="text-sm text-gray-600">Total Retired</div>
                       </div>
                       <div className="text-center">
                         <div className="text-2xl font-bold text-purple-600">
                           ${projectDetails.credits.data.pricePerCredit}
                         </div>
                         <div className="text-sm text-gray-600">Price per Credit</div>
                       </div>
                     </div>
                     <div className="mt-4 text-sm text-gray-700">
                       <p><strong>Vintage Year:</strong> {projectDetails.credits.data.vintageYear}</p>
                       <p><strong>Certification:</strong> {projectDetails.credits.data.certificationBody}</p>
                     </div>
                    <div className="mt-4 text-xs text-gray-500">
                      Last updated: {projectDetails.credits.timestamp}
                    </div>
                  </div>
                )}

                {/* Impact Report */}
                {projectDetails.impact?.data && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-purple-800 mb-3">📊 Impact Report</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                             <div>
                         <h4 className="font-medium text-purple-700 mb-2">🌳 Environmental Impact</h4>
                         <div className="space-y-1 text-sm">
                           <div>CO2 Reduced: <span className="font-medium">{projectDetails.impact.data.environmentalImpact?.co2Reduced?.toLocaleString()} {projectDetails.impact.data.environmentalImpact?.unit}</span></div>
                           <div>Equivalent Trees: <span className="font-medium">{projectDetails.impact.data.environmentalImpact?.equivalentTrees?.toLocaleString()}</span></div>
                           <div>Cars Off Road: <span className="font-medium">{projectDetails.impact.data.environmentalImpact?.equivalentCarsOff?.toLocaleString()}</span></div>
                         </div>
                       </div>
                       <div>
                         <h4 className="font-medium text-purple-700 mb-2">👥 Social Impact</h4>
                         <div className="space-y-1 text-sm">
                           <div>Beneficiaries: <span className="font-medium">{projectDetails.impact.data.socialImpact?.beneficiaries?.toLocaleString()}</span></div>
                           <div>Jobs Created: <span className="font-medium">{projectDetails.impact.data.socialImpact?.jobsCreated}</span></div>
                           <div>Households Impacted: <span className="font-medium">{projectDetails.impact.data.socialImpact?.householdsImpacted?.toLocaleString()}</span></div>
                           <div>Women Employed: <span className="font-medium">{projectDetails.impact.data.socialImpact?.womenEmployed}</span></div>
                         </div>
                       </div>
                    </div>
                  </div>
                )}

                {/* API Integration Notice */}
                <div className="bg-gray-100 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">🔗</span>
                    <div>
                      <h4 className="font-medium text-gray-800">Gold Standard API Integration</h4>
                      <p className="text-sm text-gray-600">
                        This data is fetched in real-time from the Gold Standard mockup API using Chainlink demo credentials.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end">
                <button
                  onClick={() => setShowProjectModal(false)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Retirement Certificate Modal */}
        {showRetirementModal && retirementCertificate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
              {/* Certificate Header */}
              <div className="bg-gradient-to-r from-green-600 to-purple-600 text-white p-6 rounded-t-xl text-center">
                <div className="text-4xl mb-3">🏆</div>
                <h2 className="text-2xl font-bold mb-2">Carbon Credit Retirement Certificate</h2>
                <p className="text-green-100">Official Proof of Carbon Offsetting</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Certificate Details */}
                <div className="bg-gradient-to-br from-green-50 to-purple-50 p-6 rounded-lg border-2 border-green-200">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Certificate of Retirement</h3>
                    <p className="text-gray-600">This certifies that the following carbon credits have been permanently retired</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-3">📋 Certificate Details</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Certificate ID:</span>
                          <span className="ml-2 font-mono text-green-600">#{retirementCertificate.retirementId}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Amount Retired:</span>
                          <span className="ml-2 font-bold text-green-600">{retirementCertificate.amount} tonnes CO₂e</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Retirement Date:</span>
                          <span className="ml-2">{retirementCertificate.timestamp}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Retired By:</span>
                          <span className="ml-2 font-mono text-xs break-all">{retirementCertificate.user}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg">
                      <h4 className="font-semibold text-purple-800 mb-3">🎯 Offsetting Purpose</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Reason:</span>
                          <div className="mt-1 p-2 bg-purple-50 rounded text-purple-800 italic">
                            "{retirementCertificate.reason}"
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Token Contract:</span>
                          <span className="ml-2 font-mono text-xs break-all text-purple-600">{retirementCertificate.tokenAddress}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Environmental Impact */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-3">🌍 Environmental Impact</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">{retirementCertificate.amount}</div>
                        <div className="text-xs text-gray-600">Tonnes CO₂e Offset</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{Math.round(parseFloat(retirementCertificate.amount) * 2.5)}</div>
                        <div className="text-xs text-gray-600">Equivalent Trees Planted</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">{Math.round(parseFloat(retirementCertificate.amount) * 0.22)}</div>
                        <div className="text-xs text-gray-600">Cars Off Road (1 year)</div>
                      </div>
                    </div>
                  </div>

                  {/* Blockchain Verification */}
                  <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-2xl">⛓️</span>
                      <h4 className="font-semibold text-gray-800">Blockchain Verification</h4>
                    </div>
                    <div className="text-sm text-gray-700 space-y-1">
                      <div>
                        <span className="font-medium">Transaction Hash:</span>
                        <span className="ml-2 font-mono text-xs break-all text-blue-600">{retirementCertificate.transactionHash}</span>
                      </div>
                      <div>
                        <span className="font-medium">Blockchain:</span>
                        <span className="ml-2">Avalanche Fuji Testnet</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        This retirement is permanently recorded on the blockchain and cannot be reversed or double-counted.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Certificate Footer */}
                <div className="text-center text-sm text-gray-600">
                  <p className="mb-2">
                    🌟 <strong>Congratulations!</strong> You have successfully offset your carbon footprint.
                  </p>
                  <p>
                    This certificate serves as proof of your commitment to environmental sustainability.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  OneTon: Verified Carbon Credit NFTs
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      // Copy certificate details to clipboard
                      const certificateText = `Carbon Credit Retirement Certificate
Certificate ID: #${retirementCertificate.retirementId}
Amount: ${retirementCertificate.amount} tonnes CO₂e
Date: ${retirementCertificate.timestamp}
Reason: ${retirementCertificate.reason}
Blockchain TX: ${retirementCertificate.transactionHash}`;
                      navigator.clipboard.writeText(certificateText);
                    }}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm"
                  >
                    📋 Copy Details
                  </button>
                  <button
                    onClick={() => setShowRetirementModal(false)}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
