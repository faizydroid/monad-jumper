/**
 * Safely checks if window.ethereum exists and handles graceful degradation
 * This prevents the app from crashing when wallet extensions are disabled
 */
export function getSafeProvider() {
  // Return a proxy object that safely handles missing ethereum provider
  return new Proxy({}, {
    get: (target, prop) => {
      // Check if window.ethereum exists before accessing any properties
      if (window.ethereum) {
        if (typeof window.ethereum[prop] === 'function') {
          return (...args) => {
            try {
              return window.ethereum[prop](...args);
            } catch (error) {
              console.error(`Error calling ethereum.${String(prop)}:`, error);
              return Promise.reject(error);
            }
          };
        }
        return window.ethereum[prop];
      } else {
        // Handle missing provider with appropriate fallbacks
        if (prop === 'isConnected') return false;
        if (prop === 'request') {
          return () => Promise.reject(new Error('No Ethereum provider available'));
        }
        console.warn(`Attempted to access ethereum.${String(prop)} but no provider exists`);
        return undefined;
      }
    }
  });
}

/**
 * Creates a safe ethers provider that won't crash the app if wallet is disabled
 */
export function createSafeEthersProvider() {
  const { ethers } = window;
  if (!ethers) {
    console.error('Ethers.js not found');
    return null;
  }
  
  // If ethereum provider exists, use it
  if (window.ethereum) {
    try {
      return new ethers.providers.Web3Provider(window.ethereum);
    } catch (error) {
      console.error('Failed to create Web3Provider:', error);
    }
  }
  
  // Fallback to JSON RPC provider
  try {
    return new ethers.providers.JsonRpcProvider('https://monad-testnet.g.alchemy.com/v2/PTox95CrPhqgSRASB8T4ogM_2K-4_Sf5');
  } catch (error) {
    console.error('Failed to create fallback JsonRpcProvider:', error);
    return null;
  }
} 