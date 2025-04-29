import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'viem';
import { defineChain } from 'viem';

// Define Monad Testnet
export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
    public: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://explorer.monad.xyz' },
  },
  testnet: true,
});

export const wagmiConfig = getDefaultConfig({
  appName: 'Doodle Jump Game',
  projectId: import.meta.env.VITE_PROJECT_ID,
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(),
  },
});

export const { chains } = wagmiConfig; 