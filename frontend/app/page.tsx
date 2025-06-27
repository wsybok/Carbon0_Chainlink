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
    expiryDate: '',
  });

  const [verifyForm, setVerifyForm] = useState({
    creditId: '2',
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
    creditId: '2',
  });

  const [viewBatchForm, setViewBatchForm] = useState({
    batchId: '1',
  });

  const [viewTokenForm, setViewTokenForm] = useState({
    tokenAddress: '',
    userAddress: '',
  });

  // View data results
  const [creditData, setCreditData] = useState<any>(null);
  const [batchData, setBatchData] = useState<any>(null);
  const [tokenData, setTokenData] = useState<any>(null);

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
      const { oracle } = getContracts(signer);
      
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
    await executeTransaction('Request Chainlink Verification', async () => {
      const { signer } = await getWeb3(connectedWallet || undefined);
      const { oracle } = getContracts(signer);
      
      const tx = await oracle.requestVerification(parseInt(verifyForm.creditId));
      await tx.wait();
      return tx;
    });
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
    await executeTransaction('Retire Tokens', async () => {
      const { signer } = await getWeb3(connectedWallet || undefined);
      const projectToken = getProjectTokenContract(retireForm.tokenAddress, signer);
      
      const amount = ethers.parseUnits(retireForm.amount, 18);
      
      const tx = await projectToken.retire(amount, retireForm.reason);
      await tx.wait();
      return tx;
    });
  };

  // View Data functions
  const checkCreditStatus = async () => {
    try {
      setTxLoading('Check Credit Status');
      const { signer } = await getWeb3(connectedWallet || undefined);
      const { oracle } = getContracts(signer);
      
      const creditId = parseInt(viewCreditForm.creditId);
      
      // Check if credit ID is valid (greater than 0 and less than nextCreditId)
      const nextCreditId = await oracle.nextCreditId();
      if (creditId < 1 || creditId >= Number(nextCreditId)) {
        setCreditData(null);
        setTxResult(`❌ Credit ID ${creditId} does not exist. Valid range: 1 to ${Number(nextCreditId) - 1}`);
        return;
      }
      
      const credit = await oracle.getCarbonCredit(creditId);
      
      // Also get verification request if exists
      let verificationData = null;
      try {
        const requestId = await oracle.creditToRequest(creditId);
        if (requestId !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
          verificationData = await oracle.getVerificationRequest(requestId);
        }
      } catch (error) {
        console.log('No verification request found for this credit');
      }
      
      setCreditData({
        creditId,
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
          verificationStatus: verificationData.verificationStatus
        } : null
      });
      
      setTxResult(`✅ Credit status retrieved successfully!`);
    } catch (error: any) {
      console.error('Check credit status failed:', error);
      setCreditData(null);
      
      // Better error handling
      if (error.code === 'CALL_EXCEPTION') {
        setTxResult(`❌ Credit ID ${viewCreditForm.creditId} does not exist or is invalid`);
      } else if (error.message.includes('network')) {
        setTxResult(`❌ Network error: Please check your connection and try again`);
      } else {
        setTxResult(`❌ Failed to get credit status: ${error.reason || error.message}`);
      }
    } finally {
      setTxLoading('');
    }
  };

  const viewBatchNFT = async () => {
    try {
      setTxLoading('View BatchNFT');
      const { signer } = await getWeb3(connectedWallet || undefined);
      const { batchNFT } = getContracts(signer);
      
      const batchId = parseInt(viewBatchForm.batchId);
      
      // Check if batch ID is valid (greater than 0 and less than nextBatchId)
      const nextBatchId = await batchNFT.nextBatchId();
      if (batchId < 1 || batchId >= Number(nextBatchId)) {
        setBatchData(null);
        setTxResult(`❌ BatchNFT ID ${batchId} does not exist. Valid range: 1 to ${Number(nextBatchId) - 1}`);
        return;
      }
      
      const batch = await batchNFT.getBatchMetadata(batchId);
      
      // Try to get tokenURI, but handle gracefully if it fails
      let tokenURI = 'Not available';
      try {
        tokenURI = await batchNFT.tokenURI(batchId);
      } catch (uriError) {
        console.log('TokenURI not available for this batch');
      }
      
      setBatchData({
        batchId,
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
      
      setTxResult(`✅ BatchNFT data retrieved successfully!`);
    } catch (error: any) {
      console.error('View BatchNFT failed:', error);
      setBatchData(null);
      
      // Better error handling
      if (error.code === 'CALL_EXCEPTION') {
        setTxResult(`❌ BatchNFT ID ${viewBatchForm.batchId} does not exist. Please check the batch ID and try again.`);
      } else if (error.message.includes('network')) {
        setTxResult(`❌ Network error: Please check your connection and try again`);
      } else if (error.message.includes('missing revert data')) {
        setTxResult(`❌ BatchNFT ID ${viewBatchForm.batchId} has not been minted yet`);
      } else {
        setTxResult(`❌ Failed to get BatchNFT data: ${error.reason || error.message}`);
      }
    } finally {
      setTxLoading('');
    }
  };

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

  const tabs = [
    { id: 'overview', label: '📋 Overview', icon: '📋' },
    { id: 'register', label: '📝 Register Credit', icon: '📝' },
    { id: 'verify', label: '🔗 Verify with Chainlink', icon: '🔗' },
    { id: 'mint-batch', label: '🎨 Mint BatchNFT', icon: '🎨' },
    { id: 'mint-tokens', label: '🪙 Mint Tokens', icon: '🪙' },
    { id: 'retire', label: '♻️ Retire Tokens', icon: '♻️' },
    { id: 'view', label: '👁️ View Data', icon: '👁️' },
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
            🌱 Carbon Credit BatchNFT System
          </h1>
          <p className="text-gray-600 text-lg mb-6">
            Verified by Chainlink Functions | Tokenized with BatchNFTs | Powered by ProjectTokens
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

        {/* Interactive Demo Sections */}
        {connected && (
          <div className="space-y-8">
            {/* Contract Addresses */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                📋 Deployed Contracts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-orange-800 mb-2">Verification Oracle</h3>
                  <p className="text-xs font-mono break-all text-orange-600">
                    0xc195a76987dd0E62407811dc21927C322a85e9eF
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">Batch NFT</h3>
                  <p className="text-xs font-mono break-all text-green-600">
                    0x4134f7B9eCC847D8548176471A31D408959254f9
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-800 mb-2">Token Factory</h3>
                  <p className="text-xs font-mono break-all text-purple-600">
                    0x0B6D191B449EBB814Eb0332490683a802947b2CA
                  </p>
                </div>
              </div>
            </div>

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
                    <h3 className="text-2xl font-semibold text-gray-800 mb-4">
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
                      📝 Register Carbon Credit
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Amount (tonnes CO2)
                          </label>
                          <input
                            type="number"
                            value={registerForm.amount}
                            onChange={(e) => setRegisterForm({...registerForm, amount: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="10000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Project ID
                          </label>
                          <input
                            type="text"
                            value={registerForm.projectId}
                            onChange={(e) => setRegisterForm({...registerForm, projectId: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="GS-15234"
                          />
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
                          {txLoading === 'Register Carbon Credit' ? '⏳ Registering...' : '📝 Register Carbon Credit'}
                        </button>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-800 mb-2">What this does:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Registers a new carbon credit in the oracle</li>
                          <li>• Creates a unique credit ID</li>
                          <li>• Sets up verification tracking</li>
                          <li>• Required before Chainlink verification</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Verification Tab */}
                {activeTab === 'verify' && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                      🔗 Request Chainlink Functions Verification
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Credit ID to Verify
                          </label>
                          <input
                            type="number"
                            value={verifyForm.creditId}
                            onChange={(e) => setVerifyForm({...verifyForm, creditId: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="2"
                          />
                        </div>
                        <button
                          onClick={requestVerification}
                          disabled={!!txLoading}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50"
                        >
                          {txLoading === 'Request Chainlink Verification' ? '⏳ Requesting...' : '🔗 Request Verification'}
                        </button>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-800 mb-2">Chainlink Functions Process:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Sends request to Chainlink DON</li>
                          <li>• Executes JavaScript code to query Gold Standard API</li>
                          <li>• Returns: GS Project ID, Available Credits, Timestamp</li>
                          <li>• Updates verification status on-chain</li>
                          <li>• Takes 1-2 minutes to complete</li>
                        </ul>
                      </div>
                    </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="bg-orange-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-orange-800 mb-2">🔍 Check Credit Status</h4>
                          <div className="flex space-x-2">
                            <input
                              type="number"
                              value={viewCreditForm.creditId}
                              onChange={(e) => setViewCreditForm({...viewCreditForm, creditId: e.target.value})}
                              placeholder="Credit ID"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                            <button 
                              onClick={checkCreditStatus}
                              disabled={!!txLoading}
                              className="bg-orange-600 text-white px-4 py-2 rounded-md text-sm hover:bg-orange-700 disabled:opacity-50"
                            >
                              {txLoading === 'Check Credit Status' ? '⏳' : 'Check'}
                            </button>
                          </div>
                        </div>

                        <div className="bg-green-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-green-800 mb-2">🎨 View BatchNFT</h4>
                          <div className="flex space-x-2">
                            <input
                              type="number"
                              value={viewBatchForm.batchId}
                              onChange={(e) => setViewBatchForm({...viewBatchForm, batchId: e.target.value})}
                              placeholder="Batch ID"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                            <button 
                              onClick={viewBatchNFT}
                              disabled={!!txLoading}
                              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
                            >
                              {txLoading === 'View BatchNFT' ? '⏳' : 'View'}
                            </button>
                          </div>
                        </div>

                        <div className="bg-purple-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-purple-800 mb-2">🪙 Check Token Balance</h4>
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={viewTokenForm.tokenAddress}
                              onChange={(e) => setViewTokenForm({...viewTokenForm, tokenAddress: e.target.value})}
                              placeholder="Token Address"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                            />
                            <input
                              type="text"
                              value={viewTokenForm.userAddress}
                              onChange={(e) => setViewTokenForm({...viewTokenForm, userAddress: e.target.value})}
                              placeholder="User Address"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                            />
                            <button 
                              onClick={checkTokenBalance}
                              disabled={!!txLoading}
                              className="w-full bg-purple-600 text-white px-4 py-2 rounded-md text-sm hover:bg-purple-700 disabled:opacity-50"
                            >
                              {txLoading === 'Check Token Balance' ? '⏳ Checking...' : 'Check Balance'}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-800 mb-2">Query Results:</h4>
                        
                        {/* Credit Data Display */}
                        {creditData && (
                          <div className="mb-4 p-3 bg-orange-100 rounded">
                            <h5 className="font-medium text-orange-800 mb-2">📊 Credit #{creditData.creditId}</h5>
                            <div className="text-sm text-orange-700 space-y-1">
                              <p><strong>Amount:</strong> {creditData.amount} tonnes CO2</p>
                              <p><strong>Project:</strong> {creditData.projectId}</p>
                              <p><strong>Status:</strong> {creditData.isVerified ? '✅ Verified' : '⏳ Pending'}</p>
                              <p><strong>Owner:</strong> {creditData.owner}</p>
                              <p><strong>Created:</strong> {creditData.createdAt}</p>
                              <p><strong>Verified:</strong> {creditData.verifiedAt}</p>
                              {creditData.verification && (
                                <div className="mt-2 p-2 bg-orange-200 rounded">
                                  <p className="font-medium">Chainlink Data:</p>
                                  <p>GS ID: {creditData.verification.gsId}</p>
                                  <p>Available: {creditData.verification.availableForSale}</p>
                                  <p>Status: {creditData.verification.verificationStatus === 1 ? 'Verified' : creditData.verification.verificationStatus === 2 ? 'Failed' : 'Pending'}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Batch Data Display */}
                        {batchData && (
                          <div className="mb-4 p-3 bg-green-100 rounded">
                            <h5 className="font-medium text-green-800 mb-2">🎨 BatchNFT #{batchData.batchId}</h5>
                            <div className="text-sm text-green-700 space-y-1">
                              <p><strong>Project:</strong> {batchData.projectId}</p>
                              <p><strong>Total Credits:</strong> {batchData.totalCredits}</p>
                              <p><strong>Issued:</strong> {batchData.issuedCredits}</p>
                              <p><strong>Retired:</strong> {batchData.retiredCredits}</p>
                              <p><strong>Token Address:</strong> {batchData.projectTokenAddress}</p>
                              <p><strong>Credit ID:</strong> {batchData.creditId}</p>
                              <p><strong>Active:</strong> {batchData.isActive ? 'Yes' : 'No'}</p>
                              <p><strong>Created:</strong> {batchData.createdAt}</p>
                            </div>
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
                              <p><strong>User:</strong> {tokenData.userAddress}</p>
                            </div>
                          </div>
                        )}

                        {!creditData && !batchData && !tokenData && (
                          <div className="text-sm text-gray-500">
                            <p>Available Queries:</p>
                            <ul className="mt-2 space-y-1">
                              <li>• <strong>Credit Status:</strong> Verification status, Chainlink data</li>
                              <li>• <strong>BatchNFT Metadata:</strong> Dynamic NFT data with oracle info</li>
                              <li>• <strong>Token Info:</strong> Balance, total supply, retirement records</li>
                            </ul>
                            <div className="mt-4 p-3 bg-blue-100 rounded">
                              <p className="text-blue-800 text-sm">
                                💡 Use existing deployed contracts or create new ones through the demo
                              </p>
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
      </div>
    </div>
  );
}
