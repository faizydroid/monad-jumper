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

// Define b_ immediately to prevent undefined errors
window.b_ = window.b_ || {};
if (typeof globalThis !== 'undefined') {
  globalThis.b_ = globalThis.b_ || {};
}

// Firefox SES compatibility function
function setupFirefoxCompatibility() {
  // Define b_ repeatedly to ensure it exists at all times
  window.b_ = window.b_ || {};
  globalThis.b_ = globalThis.b_ || {};
  
  // Check if we're in Firefox
  const isFirefox = navigator.userAgent.indexOf("Firefox") !== -1 || window.__IS_FIREFOX;
  
  if (!isFirefox) return;
  
  console.log("Firefox detected in main.jsx - applying advanced compatibility mode");
  
  // Add global error handler for SES errors
  window.addEventListener('error', (event) => {
    if (event.message && (
      event.message.includes('lockdown') || 
      event.message.includes('SES') ||
      event.message.includes('b_ is undefined') ||
      event.message.includes('Uncaught TypeError')
    )) {
      console.warn('Prevented SES error in main.jsx:', event.message);
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
  }, true);

  // Create proxy for b_ to handle any property access
  const bProxy = new Proxy({}, {
    get: function(target, prop) {
      return target[prop] !== undefined ? target[prop] : {};
    },
    set: function(target, prop, value) {
      target[prop] = value;
      return true;
    }
  });
  
  // Replace b_ with our proxy
  window.b_ = bProxy;
  globalThis.b_ = bProxy;
  
  // Create a MutationObserver to watch for vendor.js script
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          if (node.tagName === 'SCRIPT' && node.src && node.src.includes('vendor')) {
            console.log('Detected vendor.js script, ensuring b_ exists');
            // Ensure b_ exists before and after script loads
            window.b_ = window.b_ || bProxy;
            globalThis.b_ = globalThis.b_ || bProxy;
            
            node.addEventListener('load', () => {
              window.b_ = window.b_ || bProxy;
              globalThis.b_ = globalThis.b_ || bProxy;
            });
          }
        }
      }
    });
  });
  
  // Start observing the document
  observer.observe(document, { childList: true, subtree: true });
}

// Run Firefox compatibility setup
setupFirefoxCompatibility();

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

// Define a global handler for unhandled errors
window.addEventListener('unhandledrejection', function(event) {
  console.warn('Unhandled promise rejection:', event.reason);
  
  // Prevent crashing the app on unhandled promises
  event.preventDefault();
  
  return true;
});

// Add a try-catch around the render to prevent crashes
try {
  // Ensure b_ exists one more time before rendering
  window.b_ = window.b_ || {};
  globalThis.b_ = globalThis.b_ || {};
  
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