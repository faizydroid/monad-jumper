import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { RainbowKitProvider, getDefaultWallets, connectorsForWallets } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { createConfig, WagmiProvider } from 'wagmi'
import { http } from 'viem'
import { monadTestnet } from './config/chains'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// Import additional wallet connectors
import { 
  metaMaskWallet, 
  walletConnectWallet,
  okxWallet,
  coinbaseWallet,
  trustWallet
} from '@rainbow-me/rainbowkit/wallets'

// Create query client
const queryClient = new QueryClient()

// Get the project ID from environment variables
const projectId = import.meta.env.VITE_PROJECT_ID || import.meta.env.VITE_WALLETCONNECT_PROJECT_ID

// Set up available wallets with proper configuration
const connectors = connectorsForWallets([
  {
    groupName: 'Recommended',
    wallets: [
      metaMaskWallet({ projectId, chains: [monadTestnet] }),
      okxWallet({ projectId, chains: [monadTestnet] }),
      coinbaseWallet({ appName: 'Monad Jumper', chains: [monadTestnet] }),
      walletConnectWallet({ projectId, chains: [monadTestnet] }),
      trustWallet({ projectId, chains: [monadTestnet] })
    ]
  }
])

// Create wagmi config
const config = createConfig({
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(monadTestnet.rpcUrls.default.http[0])
  },
  connectors
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <RainbowKitProvider chains={[monadTestnet]}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  </React.StrictMode>
) 