import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { RainbowKitProvider, getDefaultWallets } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { createConfig, WagmiProvider } from 'wagmi'
import { http } from 'viem'
import { monadTestnet } from './config/chains'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create query client for wagmi v2
const queryClient = new QueryClient()

// Create config for wagmi
const config = createConfig({
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(monadTestnet.rpcUrls.default.http[0])
  }
})

// Get RainbowKit wallets
const { wallets } = getDefaultWallets({
  appName: 'Monad Jumper',
  projectId: import.meta.env.VITE_PROJECT_ID || import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  chains: [monadTestnet]
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