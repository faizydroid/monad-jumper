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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiConfig config={config}>
      <RainbowKitProvider chains={[monadTestnet]}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </RainbowKitProvider>
    </WagmiConfig>
  </React.StrictMode>
) 