import React from 'react';
import { WalletType, type WalletProvider } from '../../lib/contracts';

interface WalletSelectorProps {
  availableWallets: WalletProvider[];
  onWalletSelect: (walletType: WalletType) => void;
  loading: boolean;
}

const WalletSelector: React.FC<WalletSelectorProps> = ({
  availableWallets,
  onWalletSelect,
  loading,
}) => {
  if (availableWallets.length === 0) {
    return (
      <div className="text-center bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-4xl mb-4">😔</div>
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          No Compatible Wallets Found
        </h3>
        <p className="text-red-600 mb-4">
          Please install a compatible wallet to continue:
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="https://core.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-3 rounded-lg font-medium hover:from-orange-600 hover:to-red-700 transition-all duration-200 transform hover:scale-105"
          >
            <span className="text-xl">🏔️</span>
            <span>Install Core Wallet</span>
          </a>
          <a
            href="https://metamask.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-400 to-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:from-orange-500 hover:to-orange-700 transition-all duration-200 transform hover:scale-105"
          >
            <span className="text-xl">🦊</span>
            <span>Install MetaMask</span>
          </a>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <p>💡 <strong>Core Wallet</strong> is optimized for Avalanche and offers the best experience</p>
          <p>🌐 Both wallets will automatically switch to Avalanche Fuji testnet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">🔗</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Connect Your Wallet
        </h2>
        <p className="text-gray-600">
          Choose your preferred wallet to get started
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {availableWallets.map((wallet) => {
          const isCore = wallet.type === WalletType.CORE;
          const isMetaMask = wallet.type === WalletType.METAMASK;
          
          return (
            <button
              key={wallet.type}
              onClick={() => onWalletSelect(wallet.type)}
              disabled={loading}
              className={`
                group relative overflow-hidden rounded-xl p-6 text-left transition-all duration-300 transform
                ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-xl cursor-pointer'}
                ${isCore 
                  ? 'bg-gradient-to-br from-orange-400 via-red-500 to-pink-600 text-white' 
                  : isMetaMask
                  ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white'
                  : 'bg-gradient-to-br from-blue-400 to-purple-600 text-white'
                }
              `}
            >
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent"></div>
              </div>
              
              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">{wallet.icon}</span>
                  {isCore && (
                    <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium">
                      Recommended
                    </span>
                  )}
                </div>
                
                <h3 className="text-xl font-bold mb-1">{wallet.name}</h3>
                
                <p className="text-sm opacity-90 mb-3">
                  {isCore 
                    ? 'Native Avalanche wallet with seamless Core integration'
                    : isMetaMask
                    ? 'Popular multi-chain wallet with broad dApp support'
                    : 'Connect with your Ethereum-compatible wallet'
                  }
                </p>
                
                <div className="flex items-center text-xs opacity-75">
                  <span className="mr-2">⚡</span>
                  <span>
                    {isCore ? 'Optimized for Avalanche' : 'Avalanche Compatible'}
                  </span>
                </div>
              </div>
              
              {/* Hover effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            </button>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-blue-500 text-xl">ℹ️</span>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Getting Started:</p>
            <ul className="space-y-1 text-blue-700">
              <li>• Your wallet will automatically switch to Avalanche Fuji testnet</li>
              <li>• Get free AVAX from the <a href="https://faucet.avax.network/" target="_blank" rel="noopener noreferrer" className="underline font-medium">Avalanche Faucet</a></li>
              <li>• Interact with verified carbon credits and NFTs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletSelector; 