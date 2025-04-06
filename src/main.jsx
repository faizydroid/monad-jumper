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

// Firefox compatibility - handle SES lockdown errors
const isFirefox = navigator.userAgent.indexOf("Firefox") !== -1 || window.__IS_FIREFOX;
if (isFirefox) {
  console.log("Firefox detected in main.jsx - applying compatibility mode");
  
  // Add global error handler for SES errors
  window.addEventListener('error', (event) => {
    if (event.message && (
      event.message.includes('lockdown') || 
      event.message.includes('SES') ||
      event.message.includes('b_ is undefined')
    )) {
      console.warn('Prevented SES error:', event.message);
      event.preventDefault();
      return true;
    }
  }, true);

  // Ensure b_ exists to prevent vendor.js errors
  window.b_ = window.b_ || {};
}

// Create the query client
const queryClient = new QueryClient()

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

// Add a try-catch around the render to prevent crashes
try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <WagmiConfig config={config}>
          <RainbowKitProvider chains={[monadTestnet]}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </RainbowKitProvider>
        </WagmiConfig>
      </QueryClientProvider>
    </React.StrictMode>
  )
} catch (error) {
  console.error("Error rendering application:", error);
  // Display fallback UI if render fails
  document.getElementById('root').innerHTML = `
    <div style="font-family: system-ui; padding: 20px; text-align: center;">
      <h1>We're experiencing technical difficulties</h1>
      <p>Please try refreshing the page or using a different browser.</p>
      <button onclick="window.location.reload()" style="padding: 10px 20px; margin-top: 20px;">
        Refresh Page
      </button>
    </div>
  `;
} 