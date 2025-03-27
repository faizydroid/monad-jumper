import { useEffect } from 'react';
import { useAccount, useConnect } from 'wagmi';

/**
 * A custom hook to ensure wallet connections persist across sessions and page loads
 */
export function useWalletPersistence() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  
  useEffect(() => {
    // Store connection on successful connection
    if (isConnected && address) {
      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('lastConnectedAddress', address);
      console.log("Wallet connection saved to localStorage", address);
    }
    
    // Try to reconnect on page load
    const attemptReconnect = async () => {
      if (!isConnected && localStorage.getItem('walletConnected') === 'true') {
        console.log("Attempting to reconnect wallet from localStorage");
        
        try {
          // Find the first available connector
          const availableConnector = connectors.find(c => c.ready);
          if (availableConnector) {
            console.log("Found available connector, connecting...");
            await connect({ connector: availableConnector });
          }
        } catch (err) {
          console.error("Auto-reconnect failed:", err);
        }
      }
    };
    
    attemptReconnect();
    
    // Handle page visibility events
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("Page became visible, checking wallet connection");
        if (!isConnected && localStorage.getItem('walletConnected') === 'true') {
          attemptReconnect();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Handle mobile focus events
    window.addEventListener('focus', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [isConnected, address, connect, connectors]);
  
  return { isConnected, address };
} 