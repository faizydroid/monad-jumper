/**
 * Monad Jumper - Browser Compatibility Layer
 * 
 * This script provides compatibility fixes for various browsers,
 * especially for Firefox which has issues with SES (Secure ECMAScript) lockdown errors.
 */

(function() {
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
  
  // Firefox-specific fixes
  if (isFirefox) {
    console.log('Applying Firefox compatibility fixes');
    
    // Catch lockdown errors
    window.addEventListener('error', function(event) {
      if (event.message && (
        event.message.includes('lockdown') ||
        event.message.includes('SES') ||
        event.message.includes('TypeError: b_ is undefined')
      )) {
        console.warn('Suppressed Firefox SES error:', event.message);
        event.preventDefault();
        return true;
      }
    }, true);
    
    // Ensure the b_ object exists since it's referenced in vendor.js
    window.b_ = window.b_ || {};
    
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
  }
})(); 