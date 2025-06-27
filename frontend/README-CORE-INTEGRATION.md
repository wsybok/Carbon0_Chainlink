# Core Wallet Integration

This document explains the Core wallet integration implemented in the Carbon Credit BatchNFT frontend application.

## Overview

The frontend now supports both **Core Wallet** and **MetaMask**, with Core wallet being the recommended choice for Avalanche dApps due to its native optimization for the Avalanche ecosystem.

## Features Implemented

### 1. Multi-Wallet Detection
- Automatically detects available wallets on page load
- Supports Core wallet via `window.avalanche` provider
- Supports MetaMask via `window.ethereum` provider 
- Falls back to other EIP-1193 compatible wallets

### 2. Core Wallet Priority
- Core wallet is prioritized as the recommended option
- Native Avalanche integration provides better performance
- Automatic network switching to Avalanche Fuji testnet

### 3. Enhanced UI/UX
- Beautiful wallet selection interface with gradient cards
- Clear visual distinction between wallet types
- Installation links for users without compatible wallets
- Real-time connection status and wallet information

### 4. Network Management
- Automatic switching to Avalanche Fuji testnet (Chain ID: 1114)
- Automatic network addition if not already configured
- Error handling for network switching failures

## Technical Implementation

### Core Integration Points

According to the [Core wallet documentation](https://docs.core.app/docs/connecting-core-extension/), Core wallet:

1. **Implements EIP-6963** for multi-wallet discovery
2. **Injects via `window.avalanche`** for conflict-free access
3. **Supports standard EIP-1193** methods
4. **Auto-detects with web3 libraries** like WAGMI and RainbowKit

### Key Files

- `lib/contracts.ts` - Enhanced with multi-wallet detection and connection
- `app/page.tsx` - Updated main UI with wallet selection
- `app/components/WalletSelector.tsx` - Dedicated wallet selection component  
- `components/ui/button.tsx` - Enhanced button components for wallet UI

### Core Detection Logic

```typescript
// Check for Core wallet
if ((window as any).avalanche) {
  wallets.push({
    type: WalletType.CORE,
    provider: (window as any).avalanche,
    name: 'Core Wallet',
    icon: '🏔️'
  });
}

// Check for MetaMask  
if ((window as any).ethereum && (window as any).ethereum.isMetaMask) {
  wallets.push({
    type: WalletType.METAMASK,
    provider: (window as any).ethereum,
    name: 'MetaMask',
    icon: '🦊'
  });
}
```

### Network Switching

```typescript
// Avalanche Fuji testnet configuration
await provider.request({
  method: 'wallet_addEthereumChain',
  params: [{
    chainId: '0x45A', // 1114 in hex
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
```

## User Experience

### Wallet Selection Flow

1. **Detection Phase**: App detects available wallets on load
2. **Selection Phase**: User chooses between Core and MetaMask
3. **Connection Phase**: Selected wallet connects and requests accounts
4. **Network Phase**: Automatic switch to Avalanche Fuji if needed
5. **Ready Phase**: User can interact with carbon credit contracts

### Core Wallet Benefits

- ✅ **Optimized for Avalanche**: Built specifically for Avalanche ecosystem
- ✅ **Native Integration**: Better performance and user experience  
- ✅ **Automatic Network**: Seamless Avalanche network management
- ✅ **Lower Fees**: Optimized for AVAX transactions
- ✅ **Enhanced Security**: Avalanche-focused security features

### MetaMask Fallback

- ✅ **Broad Compatibility**: Works with many networks and dApps
- ✅ **Familiar Interface**: Most users already have MetaMask installed
- ✅ **Feature Complete**: Full support for all contract interactions
- ⚠️ **Manual Network**: May require manual network configuration

## Installation Links

- **Core Wallet**: https://core.app/
- **MetaMask**: https://metamask.io/

## Error Handling

The integration includes comprehensive error handling for:

- Wallet not installed scenarios
- User rejection of connection requests  
- Network switching failures
- Transaction failures and user cancellations
- Insufficient gas scenarios

## Testing

To test the integration:

1. Install Core wallet from https://core.app/
2. Run the frontend: `npm run dev`
3. Visit the app and test wallet connection
4. Verify automatic network switching
5. Test contract interactions with both wallets

## Standards Compliance

This integration follows:

- **EIP-1193**: Ethereum Provider JavaScript API
- **EIP-6963**: Multi Injected Provider Discovery
- **Core Documentation**: Official Core wallet integration patterns

The implementation ensures compatibility with future wallet providers that implement these standards. 