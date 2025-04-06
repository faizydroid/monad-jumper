/**
 * Monad Jumper - Browser Compatibility Layer
 * 
 * This script provides compatibility fixes for various browsers,
 * especially for Firefox which has issues with SES (Secure ECMAScript) lockdown errors.
 */

(function() {
  // Define b_ immediately at the global scope to prevent undefined errors
  window.b_ = window.b_ || {};
  globalThis.b_ = globalThis.b_ || {};
  
  // Detect browser
  const isFirefox = navigator.userAgent.indexOf('Firefox') > -1;
  const isEdge = navigator.userAgent.indexOf('Edg') > -1;
  
  // Set global flag for use throughout the app
  window.__BROWSER_INFO = {
    isFirefox,
    isEdge,
    hasEthereum: typeof window.ethereum !== 'undefined'
  };
  
  console.log('Browser compatibility layer initialized:', window.__BROWSER_INFO);
  
  // Firefox-specific fixes - applied aggressively before page load
  if (isFirefox) {
    console.log('Applying Firefox compatibility fixes');
    
    // Intercept error events before they bubble up
    window.addEventListener('error', function(event) {
      if (event.message && (
        event.message.includes('lockdown') ||
        event.message.includes('SES') ||
        event.message.includes('TypeError: b_ is undefined') ||
        event.message.includes('b_ is') ||
        event.message.includes('Uncaught TypeError')
      )) {
        console.warn('Suppressed Firefox SES error:', event.message);
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
    }, true);
    
    // Create proxy for b_ to handle any property access
    const bProxy = new Proxy({}, {
      get: function(target, prop) {
        console.log(`Accessing b_.${String(prop)}`);
        return target[prop] !== undefined ? target[prop] : {};
      },
      set: function(target, prop, value) {
        console.log(`Setting b_.${String(prop)}`);
        target[prop] = value;
        return true;
      }
    });
    
    // Replace b_ with our proxy
    window.b_ = bProxy;
    globalThis.b_ = bProxy;
    
    // Monkey patch Object.defineProperty to handle lockdown attempts
    const originalDefineProperty = Object.defineProperty;
    Object.defineProperty = function(obj, prop, descriptor) {
      try {
        return originalDefineProperty(obj, prop, descriptor);
      } catch (e) {
        if (e.toString().includes('lockdown') || e.toString().includes('SES')) {
          console.warn('Suppressed defineProperty error:', e);
          return obj;
        }
        throw e;
      }
    };
    
    // Fix for missing CSS files - create a dynamic link if needed
    document.addEventListener('DOMContentLoaded', function() {
      // Check if styles.css exists
      fetch('/assets/styles.OeNpxWPo.css')
        .then(response => {
          if (!response.ok && response.status === 404) {
            console.log('styles.css not found, creating fallback');
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/assets/styles.css';
            document.head.appendChild(link);
          }
        })
        .catch(() => {
          // On error, add fallback stylesheet
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = '/assets/styles.css';
          document.head.appendChild(link);
        });
      
      // Create favicon link if missing
      if (!document.querySelector('link[rel="icon"]')) {
        const faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        faviconLink.href = '/images/favicon.ico';
        document.head.appendChild(faviconLink);
      }
    });
    
    // Create a special handler for vendor.js
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
      const element = originalCreateElement.call(document, tagName);
      
      if (tagName.toLowerCase() === 'script') {
        const originalSetAttribute = element.setAttribute;
        element.setAttribute = function(name, value) {
          if (name === 'src' && value && value.includes('vendor')) {
            console.log('Intercepting vendor script load:', value);
            // Add an event listener to inject b_ object after script loads
            element.addEventListener('load', function() {
              console.log('Vendor script loaded, ensuring b_ exists');
              window.b_ = window.b_ || bProxy;
              globalThis.b_ = globalThis.b_ || bProxy;
            });
          }
          return originalSetAttribute.call(this, name, value);
        };
      }
      
      return element;
    };
  }
  
  // Apply general fixes for all browsers
  // Set the b_ object again right before DOMContentLoaded
  document.addEventListener('DOMContentLoaded', function() {
    window.b_ = window.b_ || {};
    globalThis.b_ = globalThis.b_ || {};
  });
})(); 