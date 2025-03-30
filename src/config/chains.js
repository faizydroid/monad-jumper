const FALLBACK_RPC = 'https://testnet-rpc.monad.xyz';
const FALLBACK_CHAIN_ID = 10143;

export const monadTestnet = {
  id: Number(import.meta.env.VITE_REACT_APP_MONAD_CHAIN_ID || FALLBACK_CHAIN_ID),
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    public: { http: [import.meta.env.VITE_REACT_APP_MONAD_RPC_URL || FALLBACK_RPC] },
    default: { http: [import.meta.env.VITE_REACT_APP_MONAD_RPC_URL || FALLBACK_RPC] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://explorer.monad.xyz' },
  },
  testnet: true,
}; 