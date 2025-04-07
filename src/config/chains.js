import { defineChain } from 'viem';

// Define Monad Testnet with multiple RPC endpoints for better fallback
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
    default: {
      http: [
        'https://testnet-rpc.monad.xyz',
        'https://rpc.ankr.com/monad_testnet',
        'https://thirdweb.monad-testnet.titanrpc.io',
        'https://rpc.monad.testnet.gateway.fm'
      ]
    },
    public: {
      http: [
        'https://testnet-rpc.monad.xyz',
        'https://rpc.ankr.com/monad_testnet',
        'https://thirdweb.monad-testnet.titanrpc.io',
        'https://rpc.monad.testnet.gateway.fm'
      ]
    },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://explorer.monad.xyz' },
  },
  testnet: true,
}); 