import { getDefaultWallets } from '@rainbow-me/rainbowkit';
import { monadTestnet } from './chains';

export const { wallets } = getDefaultWallets({
  appName: 'Monad Jumper',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  chains: [monadTestnet]
});

export const wagmiConfig = {
  autoConnect: true,
  connectors: wallets,
  provider: ({ chainId }) => {
    return new providers.JsonRpcProvider(
      chainId === monadTestnet.id 
        ? monadTestnet.rpcUrls.default.http[0]
        : undefined
    )
  }
}; 