document.addEventListener('DOMContentLoaded', function() {
  // Check if the app has initialized within 3 seconds
  setTimeout(function() {
    const rootElement = document.getElementById('root');
    if (!rootElement || !rootElement.childNodes.length) {
      console.log('App failed to initialize - showing fallback UI');
      
      // Replace content with fallback UI
      document.body.innerHTML = `
        <div style="padding: 20px; font-family: sans-serif; text-align: center; background-color: #f5f5f5; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
          <h2>JumpNadsnitialization Error</h2>
          <p>We couldn't initialize the application. This might be due to a browser extension conflict.</p>
          <p>For the best experience, please try:</p>
          <ul style="text-align: left; margin: 20px 0;">
            <li>Using Firefox instead of Edge</li>
            <li>Enabling the OKX Wallet extension</li>
            <li>Clearing your browser cache</li>
          </ul>
          <button onclick="window.location.reload()" style="padding: 10px 20px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 20px;">
            Reload Application
          </button>
        </div>
      `;
    }
  }, 3000);
}); 