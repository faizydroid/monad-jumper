export const monadTestnet = {
  id: Number(import.meta.env.VITE_REACT_APP_MONAD_CHAIN_ID),
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    public: { http: [import.meta.env.VITE_REACT_APP_MONAD_RPC_URL] },
    default: { http: [import.meta.env.VITE_REACT_APP_MONAD_RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://explorer.monad.xyz' },
  },
  testnet: true,
}; 