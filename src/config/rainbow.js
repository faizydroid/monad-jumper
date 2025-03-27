import '@rainbow-me/rainbowkit/styles.css';
import { 
  getDefaultWallets,
  connectorsForWallets,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  trustWallet,
  coinbaseWallet,
  walletConnectWallet,
  braveWallet,
  rainbowWallet,
  ledgerWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { configureChains, createConfig } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { monadTestnet } from './chains';

// Get WalletConnect projectId from environment
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// Configure chains
const { chains } = configureChains(
  [monadTestnet], // Include additional chains if needed
  [publicProvider()]
);

// Create wallet connectors with mobile-friendly options
const connectors = connectorsForWallets([
  {
    groupName: 'Popular',
    wallets: [
      metaMaskWallet({ chains, projectId }),
      walletConnectWallet({ chains, projectId }),
      coinbaseWallet({ chains, appName: 'Monad Jumper' }),
      trustWallet({ chains, projectId }), // Important for Android
    ],
  },
  {
    groupName: 'More',
    wallets: [
      braveWallet({ chains }),
      rainbowWallet({ chains, projectId }),
      ledgerWallet({ chains, projectId }),
    ],
  },
]);

// Create wagmi config
const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient: publicProvider(),
});

export { chains, wagmiConfig }; 