import { ethers } from 'ethers';
import { CONTRACTS, BATCH_NFT_ABI, PROJECT_TOKEN_ABI, VERIFICATION_ORACLE_ABI } from './config';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const getProvider = () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
};

export const connectWallet = async () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = getProvider();
      if (provider) {
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        return { provider, signer, address };
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }
  throw new Error('MetaMask not found');
};

export const getBatchNFTContract = (signerOrProvider: ethers.Signer | ethers.Provider) => {
  return new ethers.Contract(CONTRACTS.BATCH_NFT, BATCH_NFT_ABI, signerOrProvider);
};

export const getProjectTokenContract = (address: string, signerOrProvider: ethers.Signer | ethers.Provider) => {
  return new ethers.Contract(address, PROJECT_TOKEN_ABI, signerOrProvider);
};

export const getVerificationOracleContract = (signerOrProvider: ethers.Signer | ethers.Provider) => {
  return new ethers.Contract(CONTRACTS.VERIFICATION_ORACLE, VERIFICATION_ORACLE_ABI, signerOrProvider);
};

export const switchToAvalancheFuji = async () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xA869' }], // 43113 in hex
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xA869',
              chainName: 'Avalanche Fuji Testnet',
              nativeCurrency: {
                name: 'AVAX',
                symbol: 'AVAX',
                decimals: 18,
              },
              rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
              blockExplorerUrls: ['https://testnet.snowtrace.io/'],
            }],
          });
        } catch (addError) {
          console.error('Error adding network:', addError);
          throw addError;
        }
      } else {
        throw switchError;
      }
    }
  }
}; 