import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import '@rainbow-me/rainbowkit/styles.css'
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { monadTestnet } from './config/chains'
import { BrowserRouter } from 'react-router-dom'
import { http } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create ErrorBoundary component for top-level error handling
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App-level error caught:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: "20px", 
          maxWidth: "800px", 
          margin: "0 auto", 
          fontFamily: "sans-serif",
          textAlign: "center" 
        }}>
          <h1 style={{ color: "#e74c3c" }}>Something went wrong</h1>
          <p>We're sorry, but the application encountered an error.</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              background: "#3498db",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "16px",
              marginTop: "20px"
            }}
          >
            Reload Application
          </button>
          
          {process.env.NODE_ENV === 'development' && (
            <div style={{ 
              marginTop: "30px", 
              textAlign: "left", 
              background: "#f5f5f5", 
              padding: "15px",
              borderRadius: "4px",
              overflowX: "auto" 
            }}>
              <h3>Error Details:</h3>
              <p style={{ color: "#e74c3c", fontWeight: "bold" }}>
                {this.state.error && this.state.error.toString()}
              </p>
              <pre style={{ 
                whiteSpace: "pre-wrap", 
                fontSize: "14px", 
                background: "#f9f9f9", 
                padding: "10px", 
                border: "1px solid #ddd" 
              }}>
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </div>
          )}
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Check if we're in Edge with potential wallet problems
const isEdgeWithIssues = () => {
  return navigator.userAgent.indexOf("Edg") !== -1 && 
         (!window.ethereum || !window.okxwallet);
}

// Handle Edge browser case
if (isEdgeWithIssues()) {
  console.warn('Edge browser detected without wallet support - entering fallback mode');
  window.__EDGE_FALLBACK_MODE__ = true;
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

// Use the new getDefaultConfig API for RainbowKit v2
const wagmiConfig = getDefaultConfig({
  appName: 'JumpNads',
  projectId: import.meta.env.VITE_PROJECT_ID,
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(monadTestnet.rpcUrls.default.http[0])
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <RainbowKitProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </RainbowKitProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
) 