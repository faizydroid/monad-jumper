import {
  getDefaultWallets,
  connectorsForWallets,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  trustWallet,
  rainbowWallet,
  braveWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { monadTestnet } from '../config/chains';

const WalletProviders = ({ children }) => {
  // Get project ID from env variable
  const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
  
  if (!projectId) {
    console.error("WalletConnect Project ID is not defined in environment variables!");
  }
  
  // Configure chains with proper RPC URLs
  const { chains, publicClient } = configureChains(
    [monadTestnet],
    [publicProvider()]
  );
  
  // Explicitly define wallets with mobile support
  const connectors = connectorsForWallets([
    {
      groupName: 'Recommended',
      wallets: [
        metaMaskWallet({ projectId, chains }),
        walletConnectWallet({ projectId, chains }),
        coinbaseWallet({ appName: 'Monad Jumper', chains }),
        trustWallet({ projectId, chains }),
        rainbowWallet({ projectId, chains }),
        braveWallet({ chains }),
      ],
    },
  ]);

  // Create wagmi config with mobile-optimized parameters
  const wagmiConfig = createConfig({
    autoConnect: true,
    connectors,
    publicClient
  });

  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider 
        chains={chains} 
        modalSize="compact"
        initialChain={monadTestnet}
        appInfo={{
          appName: 'Monad Jumper',
          learnMoreUrl: 'https://monadjumper.vercel.app/',
        }}
      >
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  );
};

export default WalletProviders; 