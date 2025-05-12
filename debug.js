// Debug utility file to determine which App.jsx is being loaded
console.log("Debug script loaded");

// Add a global watcher to track component mounts
window.addEventListener('DOMContentLoaded', () => {
    console.log("DOM content loaded");
    
    // Check if root App.jsx console logs appear
    console.log("Checking for root App.jsx logs in console...");
    
    // Create a button to force mobile mode
    const forceMobileButton = document.createElement('button');
    forceMobileButton.textContent = 'Force Mobile Mode';
    forceMobileButton.style.position = 'fixed';
    forceMobileButton.style.top = '10px';
    forceMobileButton.style.right = '10px';
    forceMobileButton.style.zIndex = '9999';
    forceMobileButton.style.padding = '10px';
    forceMobileButton.style.background = '#ff5252';
    forceMobileButton.style.color = 'white';
    forceMobileButton.style.border = 'none';
    forceMobileButton.style.borderRadius = '4px';
    
    forceMobileButton.addEventListener('click', () => {
        console.log("Force mobile button clicked");
        
        // Set all mobile flags
        window.__FORCE_MOBILE_VIEW__ = true;
        localStorage.setItem('isMobileDevice', 'true');
        sessionStorage.setItem('isMobileDevice', 'true');
        
        // Create marker element
        const marker = document.createElement('div');
        marker.id = '__force_mobile_view__';
        marker.style.display = 'none';
        document.body.appendChild(marker);
        
        // Set URL parameter
        const url = new URL(window.location.href);
        url.searchParams.set('isMobile', 'true');
        url.searchParams.set('forceReload', Date.now().toString());
        
        // Force reload
        window.location.href = url.toString();
    });
    
    // Add button to document
    document.body.appendChild(forceMobileButton);
    
    // Create info panel
    const infoPanel = document.createElement('div');
    infoPanel.style.position = 'fixed';
    infoPanel.style.bottom = '10px';
    infoPanel.style.left = '10px';
    infoPanel.style.background = 'rgba(0,0,0,0.7)';
    infoPanel.style.color = 'white';
    infoPanel.style.padding = '10px';
    infoPanel.style.borderRadius = '4px';
    infoPanel.style.fontSize = '12px';
    infoPanel.style.zIndex = '9999';
    infoPanel.style.maxWidth = '300px';
    
    // Update info panel with useful debug information
    function updateInfoPanel() {
        infoPanel.innerHTML = `
            <h4>Debug Info</h4>
            <ul style="padding-left: 20px; margin: 5px 0;">
                <li>Window Width: ${window.innerWidth}px</li>
                <li>Window Height: ${window.innerHeight}px</li>
                <li>User Agent: ${navigator.userAgent.substring(0, 50)}...</li>
                <li>FORCE_MOBILE_VIEW: ${window.__FORCE_MOBILE_VIEW__ ? 'true' : 'false'}</li>
                <li>isMobile localStorage: ${localStorage.getItem('isMobileDevice') || 'not set'}</li>
                <li>isMobile URL param: ${new URLSearchParams(window.location.search).get('isMobile') || 'not set'}</li>
                <li>Mobile container: ${document.querySelector('.mobile-container') ? 'exists' : 'not found'}</li>
            </ul>
        `;
    }
    
    // Update info initially and on resize
    updateInfoPanel();
    window.addEventListener('resize', updateInfoPanel);
    
    // Add panel to document
    document.body.appendChild(infoPanel);
    
    // Set interval to check for mobile container
    const checkInterval = setInterval(() => {
        const mobileContainer = document.querySelector('.mobile-container');
        if (mobileContainer) {
            console.log("Mobile container found:", mobileContainer);
            clearInterval(checkInterval);
        }
        
        // Update info panel
        updateInfoPanel();
    }, 1000);
}); 