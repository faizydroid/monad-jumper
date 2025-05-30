// This script runs BEFORE everything else to detect browser compatibility
(function() {
  // Define b_ immediately to prevent undefined errors
  window.b_ = window.b_ || {};
  if (typeof globalThis !== 'undefined') {
    globalThis.b_ = globalThis.b_ || {};
  }
  
  // Detect browser types
  var isEdge = navigator.userAgent.indexOf("Edg") !== -1;
  var isFirefox = navigator.userAgent.indexOf("Firefox") !== -1;
  var hasEthereumProvider = typeof window.ethereum !== 'undefined';
  
  // Log detection info
  console.log('Browser detection:', {
    browser: isEdge ? 'Edge' : (isFirefox ? 'Firefox' : 'Other'),
    hasEthereumProvider: hasEthereumProvider,
    userAgent: navigator.userAgent
  });
  
  // Set a global flag for Firefox to be used later in the app
  window.__IS_FIREFOX = isFirefox;
  
  // Handle Firefox redirect logic - redirect straight to firefox-direct.html
  if (isFirefox) {
    // Check if this is the first visit or user has chosen a mode
    var firefoxMode = localStorage.getItem('firefox_safe_mode');
    var isFirefoxPage = window.location.pathname.endsWith('firefox-direct.html') || 
                         window.location.pathname.endsWith('firefox-entry.html');
    
    // Use the direct page as it's more reliable
    if (firefoxMode === null && !isFirefoxPage && !window.location.href.includes('localhost')) {
      // First visit, redirect to Firefox direct page
      console.log('First Firefox visit, redirecting to firefox-direct.html');
      window.location.href = '/firefox-direct.html';
      return;
    }
    
    // Apply fixes if in safe mode
    if (firefoxMode === 'true') {
      console.log('Firefox safe mode enabled - applying aggressive fixes');
      
      // Add error handling for SES lockdown issues and b_ undefined issues
      window.addEventListener('error', function(event) {
        if (event.message && (
            event.message.includes('lockdown') || 
            event.message.includes('SES') || 
            event.message.includes('Uncaught TypeError: b_ is undefined') ||
            event.message.includes('b_ is')
        )) {
          console.warn('Caught SES lockdown error:', event.message);
          event.preventDefault();
          event.stopPropagation();
          
          // Ensure b_ exists
          window.b_ = window.b_ || {};
          if (typeof globalThis !== 'undefined') {
            globalThis.b_ = globalThis.b_ || {};
          }
          
          return true; // Prevent the error from bubbling up
        }
      }, true);
      
      // Anti-lockdown protection
      if (typeof Object.defineProperty === 'function') {
        try {
          // Override defineProperty for aggressive lockdown prevention
          var originalDefineProperty = Object.defineProperty;
          Object.defineProperty = function(obj, prop, descriptor) {
            try {
              // If trying to access b_, ensure it exists
              if (prop === 'b_' && (obj === window || obj === globalThis)) {
                window.b_ = window.b_ || {};
                if (typeof globalThis !== 'undefined') {
                  globalThis.b_ = globalThis.b_ || {};
                }
              }
              
              return originalDefineProperty.call(Object, obj, prop, descriptor);
            } catch (e) {
              console.warn('Caught error in defineProperty:', e);
              return obj;
            }
          };
        } catch (e) {
          console.error('Failed to override Object.defineProperty:', e);
        }
      }
      
      // Add compatibility settings for Firefox
      localStorage.setItem('firefox_compatibility_mode', 'true');
    }
  }
  
  // If we're in Edge without ethereum provider, show static page
  if (isEdge && !hasEthereumProvider) {
    // Immediately prevent React from loading by clearing document
    document.open();
    document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>JumpNads - Edge Compatibility Mode</title>
        <style>
          body {
            font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
            background-color: #100a34;
            color: white;
            margin: 0;
            padding: 20px;
            text-align: center;
            line-height: 1.6;
          }
          
          .container {
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
          }
          
          .card {
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          }
          
          h1 {
            font-size: 32px;
            margin-bottom: 10px;
          }
          
          .button {
            display: inline-block;
            background-color: #7d4cdb;
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            text-decoration: none;
            font-weight: bold;
            margin: 10px;
          }
          
          .browser-options {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 30px;
            flex-wrap: wrap;
          }
          
          .browser-option {
            text-align: center;
            padding: 15px;
            background-color: rgba(255,255,255,0.1);
            border-radius: 8px;
            text-decoration: none;
            color: white;
            width: 120px;
          }
          
          .browser-icon {
            font-size: 32px;
            margin-bottom: 10px;
            display: block;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <h1>Browser Compatibility Issue</h1>
            <p>We've detected that you're using Microsoft Edge with disabled wallet extensions.</p>
            <p>For the best experience with JumpNads:</p>
            
            <div class="browser-options">
              <a href="https://www.mozilla.org/firefox/new/" class="browser-option">
                <span class="browser-icon">🦊</span>
                Firefox
              </a>
              <a href="https://www.google.com/chrome/" class="browser-option">
                <span class="browser-icon">🌐</span>
                Chrome
              </a>
              <a href="https://metamask.io/download/" class="browser-option">
                <span class="browser-icon">🦊</span>
                MetaMask
              </a>
            </div>
            
            <p style="margin-top: 20px;">If you're using Edge, please enable your OKX Wallet extension.</p>
            <button onclick="localStorage.setItem('force_app_load', 'true'); window.location.reload();" class="button">
              Try Loading Game Anyway
            </button>
          </div>
        </div>
      </body>
      </html>
    `);
    document.close();
    
    // Stop any further script execution
    throw new Error('EDGE_COMPATIBILITY_MODE');
  }
  
  // Check if user wants to force app loading
  if (localStorage.getItem('force_app_load') === 'true') {
    console.log('Forcing app to load despite potential compatibility issues');
    // Continue normal loading
  }
})(); 