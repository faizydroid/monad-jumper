// This script runs before React loads and fixes Edge-specific issues
(function() {
  // Check if we're in Edge with potential wallet problems
  function isEdgeWithIssues() {
    return navigator.userAgent.indexOf("Edg") !== -1 && 
           (!window.ethereum || window.ethereum._state?.accounts?.length === 0);
  }
  
  // If we're in problematic Edge, apply immediate fixes
  if (isEdgeWithIssues()) {
    console.log('🔧 Edge browser detected with potential wallet issues - applying emergency fixes');
    
    // Create a mock ethereum provider to prevent errors
    window.ethereum = window.ethereum || {
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
        // Don't actually register handlers
        return;
      },
      removeListener: function() {
        return;
      }
    };
    
    // Add a global flag so our app knows we're in fallback mode
    window.__EDGE_FALLBACK_MODE__ = true;
    
    // Create a style element to ensure UI elements are visible
    const style = document.createElement('style');
    style.textContent = `
      #root, body, html { display: block !important; visibility: visible !important; }
      .container, .app, main, header, .wallet-error { display: block !important; opacity: 1 !important; }
    `;
    document.head.appendChild(style);
    
    // Add a banner after a short delay to notify the user
    setTimeout(() => {
      const banner = document.createElement('div');
      banner.style.cssText = 'position:fixed; top:0; left:0; right:0; background:#f44336; color:white; padding:10px; text-align:center; z-index:9999;';
      banner.innerHTML = `
        <b>Limited Functionality Mode:</b> Browser wallet issues detected. 
        <a href="https://metamask.io/download/" style="color:white;text-decoration:underline;">Install MetaMask</a> or 
        <a href="/" style="color:white;text-decoration:underline;">try Firefox</a> for full features.
        <button onclick="this.parentNode.remove()" style="margin-left:10px;border:none;background:white;color:#f44336;padding:2px 8px;border-radius:4px;cursor:pointer;">✕</button>
      `;
      document.body.appendChild(banner);
    }, 2000);
  }
})(); 