import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@rainbow-me/rainbowkit/styles.css'
import './index.css'
import App from './App'
import {
  getDefaultWallets,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { monadTestnet } from './config/chains'
import { ErrorBoundary } from 'react-error-boundary'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '5a6a3d758f242052a2e87e42e2816833'

const { wallets } = getDefaultWallets({
  appName: 'Monad Jumper',
  projectId,
  chains: [monadTestnet],
})

const wagmiConfig = createConfig({
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(monadTestnet.rpcUrls.default.http[0])
  },
  connectors: wallets,
  ssr: false,
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 30000,
    },
  },
})

// Error Fallback component
const ErrorFallback = ({ error, resetErrorBoundary }) => {
  return (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center',
      color: '#fff',
      backgroundColor: '#242424',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <h1 style={{ marginBottom: '20px' }}>Something went wrong</h1>
      <pre style={{ marginBottom: '20px', color: '#ff6b6b' }}>
        {error.message}
      </pre>
      <button
        onClick={resetErrorBoundary}
        style={{
          padding: '10px 20px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Try again
      </button>
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))

try {
  root.render(
    <React.StrictMode>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => window.location.reload()}
        onError={(error, info) => {
          console.error('Error caught by boundary:', error, info)
        }}
      >
        <BrowserRouter>
          <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
              <RainbowKitProvider chains={[monadTestnet]} showRecentTransactions={true}>
                <App />
              </RainbowKitProvider>
            </QueryClientProvider>
          </WagmiProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  )
} catch (error) {
  console.error('Render error:', error)
} 