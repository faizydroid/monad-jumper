/**
 * Safely checks if window.ethereum exists and handles graceful degradation
 * This prevents the app from crashing when wallet extensions are disabled
 */

// Cache providers to avoid redundant creation
let cachedProvider = null;
let cachedFallbackProvider = null;

export function getSafeProvider() {
  // Return cached provider if available
  if (cachedProvider) {
    return cachedProvider;
  }

  // Check if we're in Edge with potential wallet problems
  const isEdgeWithIssues = () => {
    return navigator.userAgent.indexOf("Edg") !== -1 && 
           (!window.ethereum || !window.okxwallet);
  }

  // If in Edge with issues, return a mock provider
  if (isEdgeWithIssues()) {
    // Create mock provider only once
    if (!cachedProvider) {
      cachedProvider = {
        isMetaMask: false,
        _isMockProvider: true,
        request: function(args) {
          console.log('Mock provider request:', args);
          if (args.method === 'eth_chainId') {
            return Promise.resolve('0x278f');  // Monad testnet chainId
          }
          if (args.method === 'eth_accounts' || args.method === 'eth_requestAccounts') {
            return Promise.resolve([]);
          }
          return Promise.reject(new Error('Not connected'));
        },
        on: function(event, handler) {
          console.log('Mock ethereum.on:', event);
          return;
        },
        removeListener: function() {
          return;
        }
      };
    }
    return cachedProvider;
  }

  // Return a proxy object that safely handles missing ethereum provider
  cachedProvider = new Proxy({}, {
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
  
  return cachedProvider;
}

/**
 * Creates a safe ethers provider that won't crash the app if wallet is disabled
 */
export function createSafeEthersProvider() {
  // Return cached provider if available
  if (cachedFallbackProvider) {
    return cachedFallbackProvider;
  }
  
  const { ethers } = window;
  if (!ethers) {
    console.error('Ethers.js not found');
    return null;
  }
  
  try {
    // If in Edge with issues, use fallback RPC
    if (navigator.userAgent.indexOf("Edg") !== -1 && (!window.ethereum || !window.okxwallet)) {
      cachedFallbackProvider = new ethers.providers.JsonRpcProvider('https://monad-testnet.g.alchemy.com/v2/PTox95CrPhqgSRASB8T4ogM_2K-4_Sf5');
      console.log('Created fallback JSON-RPC provider for Edge browser');
      return cachedFallbackProvider;
    }
    
    // If ethereum provider exists, use it
    if (window.ethereum) {
      cachedFallbackProvider = new ethers.providers.Web3Provider(window.ethereum);
      console.log('Created Web3Provider with existing window.ethereum');
      return cachedFallbackProvider;
    }
    
    // Fallback to JSON RPC provider
    cachedFallbackProvider = new ethers.providers.JsonRpcProvider('https://monad-testnet.g.alchemy.com/v2/PTox95CrPhqgSRASB8T4ogM_2K-4_Sf5');
    console.log('Created fallback JSON-RPC provider');
    return cachedFallbackProvider;
  } catch (error) {
    console.error('Failed to create any provider:', error);
    return null;
  }
} 