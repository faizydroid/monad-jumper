export const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    public: { http: ['https://monad-testnet.g.alchemy.com/v2/PTox95CrPhqgSRASB8T4ogM_2K-4_Sf5'] },
    default: { http: ['https://monad-testnet.g.alchemy.com/v2/PTox95CrPhqgSRASB8T4ogM_2K-4_Sf5'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://explorer.monad.xyz' },
  },
  testnet: true,
}; 