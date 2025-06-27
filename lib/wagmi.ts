import { createConfig, http } from 'wagmi';
import { avalancheFuji } from 'wagmi/chains';
import { metaMask, injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [avalancheFuji],
  connectors: [
    metaMask(),
    injected(),
  ],
  transports: {
    [avalancheFuji.id]: http(),
  },
}); 