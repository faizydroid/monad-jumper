import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import '@rainbow-me/rainbowkit/styles.css'
import { getDefaultWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { WagmiConfig, createConfig } from 'wagmi'
import { monadTestnet } from './config/chains'
import { BrowserRouter } from 'react-router-dom'
import { http } from 'viem'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Check if we're in Edge with potential wallet problems
const isEdgeWithIssues = () => {
  return navigator.userAgent.indexOf("Edg") !== -1 && 
         (!window.ethereum || !window.okxwallet);
}

// Create a client with proper configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
    mutations: {
      retry: 2,
    },
  },
})

// Configure chains with a transport
const config = createConfig({
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(monadTestnet.rpcUrls.default.http[0])
  }
})

// Get rainbowkit wallets
const { connectors } = getDefaultWallets({
  appName: 'Monad Jumper',
  projectId: import.meta.env.VITE_PROJECT_ID || '5a6a3d758f242052a2e87e42e2816833',
  chains: [monadTestnet]
})

// Handle Edge browser case
if (isEdgeWithIssues()) {
  console.warn('Edge browser detected without wallet support - entering fallback mode');
  window.__EDGE_FALLBACK_MODE__ = true;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={config}>
        <RainbowKitProvider chains={[monadTestnet]} showRecentTransactions={true}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </RainbowKitProvider>
      </WagmiConfig>
    </QueryClientProvider>
  </React.StrictMode>
) 