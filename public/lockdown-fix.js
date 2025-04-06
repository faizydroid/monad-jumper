/**
 * SES Lockdown Fix for Firefox
 * 
 * This script specifically targets the Firefox SES lockdown issues
 * that are causing problems with the vendor.js file
 */

(function() {
  // Immediately define b_ to prevent errors
  window.b_ = window.b_ || {};
  globalThis.b_ = globalThis.b_ || {};
  
  // Only run in Firefox browsers
  if (navigator.userAgent.indexOf('Firefox') === -1) {
    return;
  }
  
  console.log('SES Lockdown Fix activated');
  
  // Monitor for extensions trying to inject the lockdown-install.js script
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          
          // Check if a script element was added
          if (node.tagName === 'SCRIPT') {
            // Check if it's the lockdown script
            if (node.src && (
              node.src.includes('lockdown-install.js') || 
              node.src.includes('ses') ||
              node.src.includes('moz-extension'))
            ) {
              console.log('Detected SES lockdown script:', node.src);
              
              // Attempt to neutralize it
              try {
                console.log('Neutralizing lockdown script');
                node.onload = function() {
                  console.log('Lockdown script loaded - ensuring b_ exists');
                  window.b_ = window.b_ || {};
                  globalThis.b_ = globalThis.b_ || {};
                };
                
                // Override any globalThis lockdown functions that might be called
                if (typeof globalThis.lockdown === 'function') {
                  const originalLockdown = globalThis.lockdown;
                  globalThis.lockdown = function(...args) {
                    console.log('Intercepted lockdown call');
                    // Instead of actually running lockdown, we'll just return safely
                    return { success: true };
                  };
                }
              } catch (e) {
                console.warn('Error neutralizing lockdown:', e);
              }
            }
          }
        }
      }
    });
  });
  
  // Start observing the document
  observer.observe(document, { childList: true, subtree: true });
  
  // Try to prevent errors in vendor.js
  document.addEventListener('DOMContentLoaded', function() {
    // If vendor.js is already loaded, make sure b_ exists
    console.log('DOM loaded - ensuring b_ exists');
    window.b_ = window.b_ || {};
    globalThis.b_ = globalThis.b_ || {};
  });
})(); 