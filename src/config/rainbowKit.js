import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultWallets,
  connectorsForWallets,
  darkTheme,
  Chain
} from '@rainbow-me/rainbowkit';
import { monadTestnet } from './chains';
import {
  metaMaskWallet,
  trustWallet,
  coinbaseWallet,
  rainbowWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// Configure wallets with mobile-first approach
const walletConnectors = connectorsForWallets([
  {
    groupName: 'Recommended',
    wallets: [
      metaMaskWallet({ projectId, chains: [monadTestnet] }),
      trustWallet({ projectId, chains: [monadTestnet] }),
      coinbaseWallet({ chains: [monadTestnet], appName: 'Monad Jumper' }),
      rainbowWallet({ projectId, chains: [monadTestnet] }),
      walletConnectWallet({ projectId, chains: [monadTestnet] })
    ]
  }
]);

const rainbowKitTheme = darkTheme({
  accentColor: '#646cff',
  accentColorForeground: 'white',
  borderRadius: 'large',
  fontStack: 'system',
  overlayBlur: 'small'
});

export { walletConnectors, rainbowKitTheme }; 