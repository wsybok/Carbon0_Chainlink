import { ethers } from 'ethers';

// Contract addresses (from deployment)
export const CONTRACT_ADDRESSES = {
  ORACLE: '0xc195a76987dd0E62407811dc21927C322a85e9eF',
  BATCH_NFT: '0x4134f7B9eCC847D8548176471A31D408959254f9',
  TOKEN_FACTORY: '0x0B6D191B449EBB814Eb0332490683a802947b2CA',
};

// Wallet types
export enum WalletType {
  METAMASK = 'MetaMask',
  CORE = 'Core',
  UNKNOWN = 'Unknown'
}

// Wallet provider interface
export interface WalletProvider {
  type: WalletType;
  provider: any;
  name: string;
  icon?: string;
}

// Simplified ABIs for the functions we need
export const ORACLE_ABI = [
  'function registerCarbonCredit(uint256 _amount, string memory _projectId, bytes32 _verificationHash, uint256 _expiryDate) external returns (uint256)',
  'function requestVerification(uint256 _creditId) external returns (bytes32)',
  'function getCarbonCredit(uint256 _creditId) external view returns (tuple(uint256 amount, string projectId, bytes32 verificationHash, uint256 expiryDate, bool isVerified, address owner, uint256 createdAt, uint256 verifiedAt))',
  'function getVerificationRequest(bytes32 _requestId) external view returns (tuple(bytes32 requestId, uint256 creditId, bool fulfilled, string gsId, uint256 availableForSale, string timestamp, uint8 verificationStatus))',
  'function creditToRequest(uint256 _creditId) external view returns (bytes32)',
  'function nextCreditId() external view returns (uint256)'
];

export const BATCH_NFT_ABI = [
  'function mintBatchWithToken(address to, string memory projectId, uint256 totalCredits, uint256 creditId) external returns (uint256 batchId, address tokenAddress)',
  'function getBatchMetadata(uint256 batchId) external view returns (tuple(string projectId, uint256 totalCredits, uint256 issuedCredits, uint256 retiredCredits, address projectTokenAddress, uint256 creditId, bool isActive, uint256 createdAt, address projectOwner))',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function batchToTokenContract(uint256 batchId) external view returns (address)',
  'function nextBatchId() external view returns (uint256)'
];

export const PROJECT_TOKEN_ABI = [
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function mint(address to, uint256 amount) external',
  'function retire(uint256 amount, string memory reason) external',
  'function totalRetired() external view returns (uint256)',
  'function batchId() external view returns (uint256)'
];

// Helper function to detect available wallets
export function detectWallets(): WalletProvider[] {
  if (typeof window === 'undefined') return [];
  
  const wallets: WalletProvider[] = [];
  
  // Debug: Log all available providers
  console.log('🔍 Debugging wallet detection...');
  console.log('window.avalanche:', (window as any).avalanche);
  console.log('window.ethereum:', (window as any).ethereum);
  console.log('window.ethereum?.isMetaMask:', (window as any).ethereum?.isMetaMask);
  console.log('window.ethereum?.isCore:', (window as any).ethereum?.isCore);
  
  // Check for Core wallet - Method 1: window.avalanche (primary method)
  if ((window as any).avalanche) {
    console.log('✅ Core wallet detected via window.avalanche');
    wallets.push({
      type: WalletType.CORE,
      provider: (window as any).avalanche,
      name: 'Core Wallet',
      icon: '🏔️'
    });
  }
  
  // Check for Core wallet - Method 2: window.ethereum.isCore (fallback method)
  if ((window as any).ethereum?.isCore && !wallets.some(w => w.type === WalletType.CORE)) {
    console.log('✅ Core wallet detected via window.ethereum.isCore');
    wallets.push({
      type: WalletType.CORE,
      provider: (window as any).ethereum,
      name: 'Core Wallet',
      icon: '🏔️'
    });
  }
  
  // Check for MetaMask - independent of Core wallet detection
  if ((window as any).ethereum?.isMetaMask) {
    console.log('✅ MetaMask detected');
    wallets.push({
      type: WalletType.METAMASK,
      provider: (window as any).ethereum,
      name: 'MetaMask',
      icon: '🦊'
    });
  }
  
  // Check for other Ethereum providers (fallback) - only if no specific wallets detected
  if ((window as any).ethereum && !wallets.some(w => w.type === WalletType.METAMASK || w.type === WalletType.CORE)) {
    console.log('✅ Generic Ethereum wallet detected');
    wallets.push({
      type: WalletType.UNKNOWN,
      provider: (window as any).ethereum,
      name: 'Ethereum Wallet',
      icon: '💰'
    });
  }
  
  console.log('🎯 Detected wallets:', wallets.map(w => w.name));
  return wallets;
}

// Helper function to detect Core wallet specifically with EIP-6963
export function detectCoreWalletEIP6963(): Promise<WalletProvider | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    const timeout = setTimeout(() => {
      console.log('⏰ EIP-6963 Core wallet detection timeout');
      resolve(null);
    }, 1000);

    const handleAnnouncement = (event: any) => {
      console.log('📢 EIP-6963 provider announced:', event.detail);
      
      if (event.detail?.info?.name?.toLowerCase().includes('core')) {
        console.log('✅ Core wallet detected via EIP-6963');
        clearTimeout(timeout);
        window.removeEventListener('eip6963:announceProvider', handleAnnouncement);
        
        resolve({
          type: WalletType.CORE,
          provider: event.detail.provider,
          name: 'Core Wallet',
          icon: '🏔️'
        });
      }
    };

    window.addEventListener('eip6963:announceProvider', handleAnnouncement);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
  });
}

// Helper function to get the preferred wallet provider
export function getPreferredProvider(): any {
  const wallets = detectWallets();
  
  // Prefer Core wallet if available
  const coreWallet = wallets.find(w => w.type === WalletType.CORE);
  if (coreWallet) {
    return coreWallet.provider;
  }
  
  // Fall back to MetaMask
  const metaMask = wallets.find(w => w.type === WalletType.METAMASK);
  if (metaMask) {
    return metaMask.provider;
  }
  
  // Use any available provider
  if (wallets.length > 0) {
    return wallets[0].provider;
  }
  
  return null;
}

// Helper function to get contract instances
export function getContracts(signer: ethers.Signer) {
  return {
    oracle: new ethers.Contract(CONTRACT_ADDRESSES.ORACLE, ORACLE_ABI, signer),
    batchNFT: new ethers.Contract(CONTRACT_ADDRESSES.BATCH_NFT, BATCH_NFT_ABI, signer),
  };
}

export function getProjectTokenContract(address: string, signer: ethers.Signer) {
  return new ethers.Contract(address, PROJECT_TOKEN_ABI, signer);
}

// Helper function to get provider and signer with wallet selection
export async function getWeb3(preferredWallet?: WalletType) {
  const wallets = detectWallets();
  
  if (wallets.length === 0) {
    throw new Error('No compatible wallets found. Please install MetaMask or Core Wallet.');
  }
  
  let selectedWallet: WalletProvider;
  
  if (preferredWallet) {
    const wallet = wallets.find(w => w.type === preferredWallet);
    if (!wallet) {
      throw new Error(`${preferredWallet} wallet not found`);
    }
    selectedWallet = wallet;
  } else {
    // Use preferred order: Core > MetaMask > Others
    selectedWallet = wallets.find(w => w.type === WalletType.CORE) ||
                    wallets.find(w => w.type === WalletType.METAMASK) ||
                    wallets[0];
  }

  const provider = new ethers.BrowserProvider(selectedWallet.provider);
  const signer = await provider.getSigner();
  
  return { provider, signer, walletType: selectedWallet.type, walletName: selectedWallet.name };
}

// Helper function for connecting to a specific wallet
export async function connectWallet(walletType: WalletType): Promise<{ address: string; walletName: string }> {
  const wallets = detectWallets();
  const wallet = wallets.find(w => w.type === walletType);
  
  if (!wallet) {
    throw new Error(`${walletType} wallet not found`);
  }
  
  try {
    // Request account access
    const accounts = await wallet.provider.request({ method: 'eth_requestAccounts' });
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found');
    }
    
    return {
      address: accounts[0],
      walletName: wallet.name
    };
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('User rejected wallet connection');
    }
    throw error;
  }
}

// Helper function to switch to Avalanche Fuji network
export async function switchToAvalancheFuji(provider: any) {
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xa869' }], // 43113 in hex (Avalanche Fuji)
    });
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to the wallet
    if (switchError.code === 4902) {
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0xa869',
              chainName: 'Avalanche Fuji Testnet',
              nativeCurrency: {
                name: 'AVAX',
                symbol: 'AVAX',
                decimals: 18,
              },
              rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
              blockExplorerUrls: ['https://testnet.snowtrace.io/'],
            },
          ],
        });
      } catch (addError) {
        throw new Error('Failed to add Avalanche Fuji network');
      }
    } else {
      throw new Error('Failed to switch to Avalanche Fuji network');
    }
  }
}

// Helper function to format expiry date for contract
export function formatExpiryDate(dateString: string): number {
  if (!dateString) {
    // Default to 1 year from now
    return Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
  }
  return Math.floor(new Date(dateString).getTime() / 1000);
}

// Helper function to parse contract errors
export function parseContractError(error: any): string {
  // Handle user rejection (code 4001 is standard MetaMask user rejection)
  if (error.code === 4001 || error.code === 'ACTION_REJECTED' || 
      (error.message && error.message.includes('user rejected')) ||
      (error.message && error.message.includes('User denied')) ||
      (error.reason === 'rejected')) {
    return 'Transaction cancelled by user';
  }
  
  // Handle other specific contract errors
  if (error.reason) {
    if (error.reason.includes('Carbon credit not verified')) {
      return 'Carbon credit not verified by Chainlink Functions';
    }
    if (error.reason.includes('Chainlink verification not completed')) {
      return 'Chainlink verification not completed';
    }
    if (error.reason.includes('exceed Chainlink verified available amount')) {
      return 'Requested credits exceed Chainlink verified available amount';
    }
    return error.reason;
  }
  
  if (error.message) {
    if (error.message.includes('Carbon credit not verified')) {
      return 'Carbon credit not verified by Chainlink Functions';
    }
    if (error.message.includes('Chainlink verification not completed')) {
      return 'Chainlink verification not completed';
    }
    if (error.message.includes('exceed Chainlink verified available amount')) {
      return 'Requested credits exceed Chainlink verified available amount';
    }
    if (error.message.includes('insufficient funds')) {
      return 'Insufficient funds for gas fees';
    }
    if (error.message.includes('network')) {
      return 'Network error - please check your connection';
    }
    return error.message;
  }
  
  return 'Unknown error occurred';
} 