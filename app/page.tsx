'use client';

import React, { useState } from 'react';

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        setLoading(true);
        await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
        setWalletAddress(accounts[0]);
        setConnected(true);
      } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Failed to connect wallet');
      } finally {
        setLoading(false);
      }
    } else {
      alert('Please install MetaMask');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            CarbonToken
          </h1>
          <div className="flex items-center justify-center space-x-4 mb-4">
            <span className="text-2xl">🔗</span>
            <p className="text-2xl text-orange-600 font-semibold">
              Powered by Chainlink Functions
            </p>
          </div>
          <p className="text-xl text-gray-600 mb-4">
            Real-time carbon credit verification & tokenization
          </p>
          <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4 max-w-3xl mx-auto">
            <p className="text-yellow-800 font-medium">
              🏆 Chainlink Hackathon Demo - Avalanche Fuji Testnet
            </p>
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

        {/* Wallet Connection */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-semibold mb-6 text-center">Connect Your Wallet</h2>
          {!connected ? (
            <div className="text-center">
              <button
                onClick={connectWallet}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-medium text-lg disabled:opacity-50 transform transition hover:scale-105"
              >
                {loading ? 'Connecting...' : '🦊 Connect MetaMask'}
              </button>
              <p className="text-gray-500 mt-4">
                Make sure you're on Avalanche Fuji Testnet
              </p>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="text-green-600 text-xl font-medium">✅ Wallet Connected</div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Connected Address:</p>
                <p className="font-mono text-sm break-all">{walletAddress}</p>
              </div>
              <p className="text-blue-600 font-medium">🌐 Avalanche Fuji Testnet</p>
            </div>
          )}
        </div>

        {/* Demo Sections */}
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

            {/* Workflow Demo */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-6 text-gray-800">
                🔄 Demo Workflow
              </h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4 p-4 bg-orange-50 rounded-lg">
                  <div className="bg-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div>
                  <div>
                    <h3 className="font-semibold text-orange-800 mb-2">Request Chainlink Functions Verification</h3>
                    <p className="text-orange-700 mb-3">
                      Submit a carbon credit for real-time verification using Chainlink Functions to query the Gold Standard API
                    </p>
                    <div className="bg-white p-3 rounded border border-orange-200">
                      <p className="text-sm font-medium text-gray-700">Try with:</p>
                      <p className="text-sm text-gray-600">Credit ID: 12345, GS ID: GS001</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-lg">
                  <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div>
                  <div>
                    <h3 className="font-semibold text-green-800 mb-2">Mint Batch NFT with ProjectToken</h3>
                    <p className="text-green-700 mb-3">
                      Create a Batch NFT that automatically generates a corresponding ERC-20 ProjectToken. NFT metadata includes live Chainlink Functions data.
                    </p>
                    <div className="bg-white p-3 rounded border border-green-200">
                      <p className="text-sm font-medium text-gray-700">Example:</p>
                      <p className="text-sm text-gray-600">Project: FOREST-001, Credits: 1000</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-purple-50 rounded-lg">
                  <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div>
                  <div>
                    <h3 className="font-semibold text-purple-800 mb-2">Trade & Retire Tokens</h3>
                    <p className="text-purple-700 mb-3">
                      Use ProjectTokens for trading or retire them for carbon offsetting. All actions are tracked on-chain with dual-pointer synchronization.
                    </p>
                    <div className="bg-white p-3 rounded border border-purple-200">
                      <p className="text-sm font-medium text-gray-700">Features:</p>
                      <p className="text-sm text-gray-600">Transfer, Retire, Real-time Balance Updates</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Highlights */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-6 text-gray-800">
                ⚡ Technical Highlights
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="border-l-4 border-orange-500 pl-4">
                    <h3 className="font-semibold text-orange-800">Chainlink Functions Integration</h3>
                    <p className="text-sm text-gray-600">
                      Real-time API calls to Gold Standard database for carbon credit verification
                    </p>
                  </div>
                  <div className="border-l-4 border-green-500 pl-4">
                    <h3 className="font-semibold text-green-800">Dynamic NFT Metadata</h3>
                    <p className="text-sm text-gray-600">
                      NFT metadata updates automatically with live Chainlink Functions data
                    </p>
                  </div>
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold text-blue-800">Dual-Pointer Architecture</h3>
                    <p className="text-sm text-gray-600">
                      Perfect synchronization between BatchNFT and ProjectToken contracts
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h3 className="font-semibold text-purple-800">Dynamic Token Creation</h3>
                    <p className="text-sm text-gray-600">
                      TokenFactory creates ProjectTokens on-demand during NFT minting
                    </p>
                  </div>
                  <div className="border-l-4 border-red-500 pl-4">
                    <h3 className="font-semibold text-red-800">Carbon Credit Retirement</h3>
                    <p className="text-sm text-gray-600">
                      On-chain tracking of retired credits for transparent carbon offsetting
                    </p>
                  </div>
                  <div className="border-l-4 border-yellow-500 pl-4">
                    <h3 className="font-semibold text-yellow-800">Avalanche Integration</h3>
                    <p className="text-sm text-gray-600">
                      Fast and low-cost transactions on Avalanche Fuji testnet
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                🔗 Explore Further
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a
                  href="https://testnet.snowtrace.io/address/0x4134f7B9eCC847D8548176471A31D408959254f9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg border border-blue-200 transition-colors"
                >
                  <h3 className="font-semibold text-blue-800 mb-2">View BatchNFT on SnowTrace</h3>
                  <p className="text-sm text-blue-600">Explore the BatchNFT contract on Avalanche explorer</p>
                </a>
                <a
                  href="https://testnet.snowtrace.io/address/0xc195a76987dd0E62407811dc21927C322a85e9eF"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-orange-50 hover:bg-orange-100 p-4 rounded-lg border border-orange-200 transition-colors"
                >
                  <h3 className="font-semibold text-orange-800 mb-2">View Oracle on SnowTrace</h3>
                  <p className="text-sm text-orange-600">Check Chainlink Functions verification oracle</p>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 text-center text-gray-500">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <span className="text-2xl">🔗</span>
            <p className="text-lg font-medium">
              Powered by Chainlink Functions for real-time carbon credit verification
            </p>
          </div>
          <p className="text-sm mb-2">
            Demo for Chainlink Hackathon • Built with Next.js, TypeScript & Tailwind CSS
          </p>
          <p className="text-xs text-gray-400">
            Avalanche Fuji Testnet • Smart Contracts deployed and verified
          </p>
        </div>
      </div>
    </div>
  );
} 