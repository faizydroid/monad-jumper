// New file to handle browser compatibility issues

/**
 * Creates a safe provider wrapper for Edge browser
 * @returns {Object} Safe provider object or original ethereum provider
 */
export function safelyAccessProvider() {
  // Edge browser compatibility fix
  if (isEdgeBrowser()) {
    try {
      // Use a simplified approach for Edge browser
      if (window.ethereum) {
        // Create a simplified version of the provider that avoids deep property access
        const simpleProvider = {
          request: window.ethereum.request && window.ethereum.request.bind(window.ethereum),
          on: window.ethereum.on && window.ethereum.on.bind(window.ethereum),
          removeListener: window.ethereum.removeListener && window.ethereum.removeListener.bind(window.ethereum),
          removeAllListeners: window.ethereum.removeAllListeners && window.ethereum.removeAllListeners.bind(window.ethereum),
          isMetaMask: !!window.ethereum.isMetaMask,
          isConnected: () => !!window.ethereum.selectedAddress,
          selectedAddress: window.ethereum.selectedAddress,
          _maxListeners: 25,
          setMaxListeners: function(n) {
            this._maxListeners = n;
            if (window.ethereum.setMaxListeners) {
              window.ethereum.setMaxListeners(n);
            }
          }
        };
        
        // Set max listeners to avoid warnings
        if (window.ethereum.setMaxListeners) {
          window.ethereum.setMaxListeners(25);
        }
        
        return simpleProvider;
      }
      return null;
    } catch (err) {
      console.error("Edge browser provider access error:", err);
      return null;
    }
  }
  
  // For other browsers, return the normal provider
  // But still increase max listeners to be safe
  if (window.ethereum && window.ethereum.setMaxListeners) {
    window.ethereum.setMaxListeners(25);
  }
  
  return window.ethereum;
}

/**
 * Detects if the current browser is Edge
 * @returns {boolean} True if Edge browser is detected
 */
export function isEdgeBrowser() {
  return navigator.userAgent.indexOf("Edg") !== -1;
}

/**
 * Sets up Edge browser compatibility fixes
 */
export function setupEdgeBrowserCompatibility() {
  // Only apply to Edge browser
  if (!isEdgeBrowser()) return;
  
  console.log("Setting up Edge browser compatibility for wallet providers");
  
  // Mark global flag for compatibility mode
  window.__EDGE_COMPATIBILITY_MODE__ = true;
  
  // Fix event listeners for Edge
  if (window.ethereum) {
    try {
      // Add max listeners limit
      if (window.ethereum.setMaxListeners) {
        window.ethereum.setMaxListeners(25);
      } else if (window.ethereum._events) {
        window.ethereum._maxListeners = 25;
      }
      
      // Track active listeners to avoid duplicates
      const activeListeners = new Map();
      
      // Only override if we haven't already done so
      if (!window.ethereum.__edgePatched) {
        const originalOn = window.ethereum.on;
        
        window.ethereum.on = function(eventName, listener) {
          console.log(`Registering listener for ${eventName} event (Edge patched)`);
          
          // Remove existing listener for this event if present
          if (activeListeners.has(eventName)) {
            const oldListener = activeListeners.get(eventName);
            if (typeof window.ethereum.removeListener === 'function') {
              window.ethereum.removeListener(eventName, oldListener);
            }
          }
          
          // Add new listener and track it
          activeListeners.set(eventName, listener);
          return originalOn.call(this, eventName, listener);
        };
        
        window.ethereum.__edgePatched = true;
      }
      
      // Inject script to prevent prototype chain recursion
      if (!document.getElementById('edge-compatibility-script')) {
        const script = document.createElement('script');
        script.id = 'edge-compatibility-script';
        script.textContent = `
          // Prevent deep recursion in Edge
          if (window.ethereum && !window.ethereum.__shimmed) {
            Object.defineProperty(window.ethereum, '__shimmed', { value: true });
            const originalGet = Object.getOwnPropertyDescriptor(Object.prototype, '__proto__').get;
            Object.defineProperty(Object.prototype, '__proto__', {
              get: function() {
                if (this === window.ethereum || this.__shimmed) {
                  return null;
                }
                return originalGet.call(this);
              },
              configurable: true
            });
          }
        `;
        document.head.appendChild(script);
      }
      
      console.log("Edge browser wallet compatibility patching complete");
    } catch (err) {
      console.error("Error patching Edge provider:", err);
    }
  }
} 