import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { 
  RainbowKitProvider, 
  getDefaultWallets
} from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { createConfig, WagmiProvider } from 'wagmi'
import { http } from 'viem'
import { monadTestnet } from './config/chains'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create query client
const queryClient = new QueryClient()

// Get project ID from env
const projectId = import.meta.env.VITE_PROJECT_ID || 
                 import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 
                 "5a6a3d758f242052a2e87e42e2816833"

// Get wallet connectors directly
const { connectors } = getDefaultWallets({
  appName: 'Monad Jumper',
  projectId: projectId,
  chains: [monadTestnet]
})

// Create wagmi config with the connectors
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
        <RainbowKitProvider chains={[monadTestnet]} modalSize="compact">
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  </React.StrictMode>
) 