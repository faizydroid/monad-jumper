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

const root = ReactDOM.createRoot(document.getElementById('root'))

try {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
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

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1>Something went wrong.</h1>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
} 