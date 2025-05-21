import { Player } from '/js/player.js'
import { Background } from '/js/background.js'
import { InputHandler } from '/js/input.js'
import { Platform } from '/js/platform.js'
import { Enemy } from '/js/enemy.js'

// Immediately apply mobile iframe positioning
(function() {
    // Check if we're on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Create and insert styling
        const style = document.createElement('style');
        style.textContent = `
            body, html {
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                position: fixed !important;
                width: 100% !important;
                height: 100% !important;
                max-width: 100% !important;
                max-height: 100% !important;
                touch-action: none !important;
            }
            
            #canvas1 {
                position: fixed !important;
                top: 0 !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                margin: 0 !important;
                padding: 0 !important;
                max-height: calc(100vh - 120px) !important; /* Add space for controls at bottom */
                z-index: 1 !important;
            }
            
            /* Rules for iframe */
            iframe {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                padding-bottom: 120px !important; /* Add space for controls */
                box-sizing: border-box !important;
            }
            
            /* Ensure controls stay visible */
            #mobile-controls-overlay {
                z-index: 10000 !important;
                position: fixed !important;
                bottom: 0 !important;
                left: 0 !important;
                width: 100% !important;
                pointer-events: none !important;
            }
            
            #mobile-controls {
                position: absolute !important;
                bottom: 40px !important;
                left: 0 !important;
                width: 100% !important;
                z-index: 10001 !important;
                display: flex !important;
                justify-content: space-between !important;
                padding: 0 20px !important;
            }
            
            /* Ensure buttons are not cropped */
            #mobile-controls button {
                width: 70px !important;
                height: 70px !important;
                margin-bottom: 20px !important;
                transform: translateZ(0) !important;
                position: relative !important;
                z-index: 10002 !important;
            }
        `;
        
        // Insert immediately when the file loads
        document.head.appendChild(style);
        
        // Send message to parent window as soon as possible
        setTimeout(() => {
            try {
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({
                        type: 'FIX_IFRAME_POSITION',
                        position: 'top',
                        isMobile: true,
                        immediate: true
                    }, '*');
                }
            } catch (e) {
                // Silent fail
            }
        }, 0);
    }
})();

/*
 * PERFORMANCE OPTIMIZATION:
 * 
 * 1. Replaced setInterval with requestAnimationFrame for the game loop
 *    - Better frame syncing with browser's refresh rate
 *    - More efficient CPU usage
 *    - Pauses automatically when tab is inactive
 * 
 * 2. Implemented proper deltaTime calculation
 *    - Movement is now frame-rate independent
 *    - Game speed remains consistent across different devices
 *    - All velocities are normalized by time (seconds)
 *
 * 3. Applied deltaTime scaling to all game objects:
 *    - Player movement
 *    - Platform movement
 *    - Bullet movement
 *    - Enemy movement
 *    - Game physics (gravity, etc.)
 *
 * This ensures the game runs at a consistent speed regardless of the device's
 * frame rate capability, providing a smoother experience across all devices.
 */

// Make sure window.totalJumps is initialized globally
window.totalJumps = 0;
console.log('Main.js: Jump counter initialized to', window.totalJumps);

// Find the keydown listener and replace it with this
document.addEventListener('keydown', function(e) {
    if ((e.key === ' ' || e.key === 'ArrowUp')) {
        // Increment jump counter
        window.totalJumps = (window.totalJumps || 0) + 1;
        // Remove logging for performance
    }
});

// Add this at the beginning of your JS file to ensure the animation is defined
(function() {
  // Add a style element for the pulse animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0% {
        transform: scale(1);
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
      }
      50% {
        transform: scale(1.05);
        box-shadow: 0 5px 25px rgba(0,0,0,0.5);
      }
      100% {
        transform: scale(1);
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
      }
    }
  `;
  document.head.appendChild(style);
})();

// Add this at the top of the file after other imports
(function() {
  // Import Bangers font from Google Fonts
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Bangers&display=swap';
  document.head.appendChild(link);
})();

// Security: Add fetch interceptor to prevent direct API calls to Supabase
(function() {
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
        // Check if this is a direct Supabase API request
        if (typeof url === 'string' && 
            (url.includes('supabase.co/rest') || 
             url.includes('nzifipuunzaneaxdxqjm'))) {
            
            console.error('🛑 SECURITY: Blocked unauthorized direct Supabase API access');
            return Promise.reject(new Error('Direct API access is not allowed'));
        }
        
        // Proceed with original fetch for allowed requests
        return originalFetch.apply(this, arguments);
    };
})();

// Security: Add XMLHttpRequest interceptor to prevent direct API calls to Supabase
(function() {
    // Intercept XMLHttpRequest to prevent direct API access
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async = true, username = null, password = null) {
        // Check if this is a direct Supabase API request
        if (typeof url === 'string' && 
            (url.includes('supabase.co/rest') || 
             url.includes('nzifipuunzaneaxdxqjm'))) {
            
            console.error('🛑 SECURITY: Blocked unauthorized direct Supabase API access via XMLHttpRequest');
            
            // Redirect to a blocked endpoint
            return originalXhrOpen.call(this, method, '/api/blocked', async, username, password);
        }
        
        // Proceed with original open for legitimate requests
        return originalXhrOpen.call(this, method, url, async, username, password);
    };
})();

window.addEventListener('load', () => {
    // Initialize global variables
    window.gameInitialized = false;
    
    // Set mobile detection flags immediately
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isInIframe = window.self !== window.top;
    
    // Only set the forceMobileControls flag if we're on mobile or in iframe
    window.forceMobileControls = isInIframe || isMobileDevice;
    
    // Set desktop mode flag based on detection
    window.isDesktopMode = !(isInIframe || isMobileDevice);
    
    // IMPORTANT: Force cleanup of any stray mobile controls on desktop
    if (window.isDesktopMode) {
        // Create a global cleanup function 
        window.cleanupMobileControls = function() {
            console.log('Global cleanup of mobile controls in desktop mode');
            
            // Remove by ID
            const controlIds = ['mobile-controls-overlay', 'left-btn', 'right-btn', 'shoot-btn', 'mobile-controls'];
            controlIds.forEach(id => {
                const elements = document.querySelectorAll(`#${id}`);
                elements.forEach(el => el && el.remove());
            });
            
            // Remove by image source to catch any without IDs
            document.querySelectorAll('img[src*="left_arrow.png"]').forEach(el => el.remove());
            document.querySelectorAll('img[src*="right_arrow.png"]').forEach(el => el.remove());
            document.querySelectorAll('img[src*="shoot.png"]').forEach(el => el.remove());
        };
        
        // Run initial cleanup
        window.cleanupMobileControls();
        
        // Set interval to periodically check and remove controls in desktop mode
        setInterval(window.cleanupMobileControls, 2000);
    }
    
    const canvas = document.querySelector('#canvas1')
    const ctx = canvas.getContext('2d')
    
    // Create function to add standalone controls for iframe display
    function addStandaloneControls() {
        // STRICT CHECK - only show controls on mobile devices or in iframe
        const isInIframe = window.self !== window.top;
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Intentionally NOT using touch detection which can trigger on desktop
        // Only show standalone controls if in iframe or on mobile device based on user agent
        if (!isInIframe && !isMobileDevice) {
            console.log('Skipping standalone controls on desktop device');
            return null;
        }
        
        // Create a simple controls overlay just for display
        const controlsOverlay = document.createElement('div');
        controlsOverlay.id = 'iframe-controls-display';
        controlsOverlay.style.position = 'fixed';
        controlsOverlay.style.bottom = '20px';
        controlsOverlay.style.left = '0';
        controlsOverlay.style.width = '100%';
        controlsOverlay.style.display = 'flex';
        controlsOverlay.style.justifyContent = 'space-between';
        controlsOverlay.style.padding = '0 20px';
        controlsOverlay.style.zIndex = '9999';
        
                 // Add the buttons with better positioning
         const buttonContainer = document.createElement('div');
         buttonContainer.style.display = 'flex';
         buttonContainer.style.width = '100%';
         buttonContainer.style.justifyContent = 'space-between';
         buttonContainer.style.alignItems = 'center';
         buttonContainer.style.maxWidth = '400px';
         buttonContainer.style.margin = '0 auto';
        
        // Left button
        const leftBtn = document.createElement('img');
        leftBtn.src = '/icon/left_arrow.png';
        leftBtn.alt = 'Left';
        leftBtn.style.width = '70px';
        leftBtn.style.height = '70px';
        
        // Shoot button
        const shootBtn = document.createElement('img');
        shootBtn.src = '/icon/shoot.png';
        shootBtn.alt = 'Shoot';
        shootBtn.style.width = '70px';
        shootBtn.style.height = '70px';
        
        // Right button
        const rightBtn = document.createElement('img');
        rightBtn.src = '/icon/right_arrow.png';
        rightBtn.alt = 'Right';
        rightBtn.style.width = '70px';
        rightBtn.style.height = '70px';
        
        // Add buttons to container
        buttonContainer.appendChild(leftBtn);
        buttonContainer.appendChild(shootBtn);
        buttonContainer.appendChild(rightBtn);
        
        // Add container to overlay
        controlsOverlay.appendChild(buttonContainer);
        
        // Add overlay to document
        document.body.appendChild(controlsOverlay);
        
        return controlsOverlay;
    }
    
    // Check if we're in an iframe and show controls immediately ONLY if on mobile
    if (window.parent !== window) {
        // Check if we're on a mobile device
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobileDevice) {
            const iframeControls = addStandaloneControls();
            
            // Hide these controls when game starts
            window.addEventListener('gamestart', function() {
                if (iframeControls) {
                    iframeControls.style.display = 'none';
                }
                
                // Ensure mobile controls are shown when in iframe on mobile
                if (window.gameInstance) {
                    // Force mobile mode in iframe context to ensure controls show up
                    window.gameInstance.isMobile = true;
                    window.forceMobileControls = true; // Force mobile controls in iframe
                    
                    // Ensure controls are visible
                    const mobileControls = document.getElementById('mobile-controls-overlay');
                    if (!mobileControls) {
                        window.gameInstance.addOnScreenControls();
                    } else {
                        mobileControls.style.display = 'block';
                    }
                }
            });
        } else {
            console.log("Desktop iframe detected - not showing mobile controls");
        }
        
    }
    
    // Make canvas responsive to screen size
    const updateCanvasSize = () => {
        // Set a good aspect ratio while maximizing screen usage
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Use a fixed aspect ratio (532:850 ≈ 0.625)
        const aspectRatio = 0.625;
        
        // Check if we're on mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Calculate dimensions to maintain aspect ratio
        let canvasWidth, canvasHeight;
        
        if (windowWidth * aspectRatio <= windowHeight) {
            // Width is the limiting factor
            canvasWidth = Math.min(windowWidth, 532);
            canvasHeight = canvasWidth / aspectRatio;
        } else {
            // Height is the limiting factor
            canvasHeight = Math.min(windowHeight, 850);
            canvasWidth = canvasHeight * aspectRatio;
        }
        
        // Set canvas dimensions
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        // On mobile, fix the canvas to the top of the screen with space for controls
        if (isMobile) {
            // Add fixed positioning styles
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '50%';
            canvas.style.transform = 'translateX(-50%)';
            canvas.style.maxHeight = 'calc(100vh - 120px)'; // Reserve space for controls
            canvas.style.margin = '0';
            canvas.style.zIndex = '1';
            canvas.style.boxSizing = 'border-box';
            
            // Ensure mobile controls are visible and not cropped
            const controlsOverlay = document.getElementById('mobile-controls-overlay');
            if (controlsOverlay) {
                controlsOverlay.style.zIndex = '10000';
                controlsOverlay.style.position = 'fixed';
                controlsOverlay.style.bottom = '0';
            }
            
            // Ensure the mobile controls container is properly positioned
            const controlsContainer = document.getElementById('mobile-controls');
            if (controlsContainer) {
                controlsContainer.style.position = 'absolute';
                controlsContainer.style.bottom = '40px';
                controlsContainer.style.zIndex = '10001';
            }
            
            // Add styles to ensure the containing element doesn't offset the canvas
            const canvasContainer = canvas.parentElement;
            if (canvasContainer) {
                canvasContainer.style.padding = '0';
                canvasContainer.style.margin = '0';
                canvasContainer.style.position = 'fixed';
                canvasContainer.style.top = '0';
                canvasContainer.style.left = '0';
                canvasContainer.style.width = '100%';
                canvasContainer.style.height = '100%';
                canvasContainer.style.overflow = 'hidden';
            }
            
            // Add CSS to ensure body and html don't cause scrolling or margin issues
            const style = document.createElement('style');
            style.textContent = `
                body, html {
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                    position: fixed !important;
                    width: 100% !important;
                    height: 100% !important;
                    max-width: 100% !important;
                    max-height: 100% !important;
                }
                
                #canvas1 {
                    position: fixed !important;
                    top: 0 !important;
                    left: 50% !important;
                    transform: translateX(-50%) !important;
                    margin: 0 !important;
                    max-height: 100vh !important;
                    z-index: 1 !important;
                }
                
                /* Fix iframe positioning for containing page */
                @media (max-width: 768px) {
                    iframe {
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100vw !important;
                        height: 100vh !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        z-index: 1 !important;
                    }
                }
            `;
            document.head.appendChild(style);
            
            // Send message to parent page to fix iframe position if possible
            try {
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({
                        type: 'FIX_IFRAME_POSITION',
                        position: 'top',
                        isMobile: true
                    }, '*');
                }
            } catch (e) {
                // Silently fail if cross-origin issues prevent messaging
            }
        }
        
        // Log the new dimensions
        console.log(`Canvas resized to: ${canvasWidth}x${canvasHeight}`);
    };
    
    // Initial sizing
    updateCanvasSize();
    
    // Handle window resize
    window.addEventListener('resize', function() {
        // Update canvas size
        updateCanvasSize();
        
        // Check if in desktop mode and clean up controls if needed
        if (window.isDesktopMode && typeof window.cleanupMobileControls === 'function') {
            window.cleanupMobileControls();
        }
        
        // Notify game instance of resize if available
        if (window.gameInstance && typeof window.gameInstance.detectMobile === 'function') {
            // Re-detect mobile/desktop mode
            window.gameInstance.detectMobile();
            
            // Clean up controls if we're in desktop mode
            if (window.isDesktopMode) {
                window.gameInstance.ensureNoMobileControls();
            }
        }
    });

    class Game {
        constructor(width, height) {
            this.width = width
    shouldShowControls = window.gameInstance.detectMobile();
  } else {
    // Fallback check - ONLY iframe or user agent, no dimension or touch capability checks
    const isInIframe = window.self !== window.top;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    shouldShowControls = isInIframe || isMobileUA;
  }
  
  // If not a mobile device or inside an iframe, don't create controls
  if (!shouldShowControls) {
    console.log("Skipping mobile controls on desktop device");
    return null;
  }
  
  console.log("Creating completely stable controls");
  
  // Remove ANY existing controls to start fresh
  document.querySelectorAll('#left-btn, #right-btn, #shoot-btn, #mobile-controls-overlay, #stable-controls').forEach(el => {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  });
  
  // Create a completely new overlay directly on document.body with maximum z-index
  const overlay = document.createElement('div');
  overlay.id = 'ultra-stable-controls';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2147483647;
    background: transparent;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    contain: strict;
  `;
  
  // Create buttons with absolute placement
  const leftBtn = document.createElement('img');
  leftBtn.src = '/icon/left_arrow.png';
  leftBtn.id = 'left-btn';
  leftBtn.style.cssText = `
    position: absolute;
    left: 20px;
    bottom: 30px;
    width: 70px;
    height: 70px;
    pointer-events: auto;
    touch-action: manipulation;
    z-index: 2147483647;
  `;
  
  const shootBtn = document.createElement('img');
  shootBtn.src = '/icon/shoot.png';
  shootBtn.id = 'shoot-btn';
  shootBtn.style.cssText = `
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: 30px;
    width: 70px;
    height: 70px;
    pointer-events: auto;
    touch-action: manipulation;
    z-index: 2147483647;
  `;
  
  const rightBtn = document.createElement('img');
  rightBtn.src = '/icon/right_arrow.png';
  rightBtn.id = 'right-btn';
  rightBtn.style.cssText = `
    position: absolute;
    right: 20px;
    bottom: 30px;
    width: 70px;
    height: 70px;
    pointer-events: auto;
    touch-action: manipulation;
    z-index: 2147483647;
  `;
  
  // Add event listeners to each button
  leftBtn.addEventListener('touchstart', e => {
    e.preventDefault();
    e.stopPropagation();
    leftBtn.style.opacity = '0.7';
    if (window.gameInstance && window.gameInstance.player) {
      window.gameInstance.player.moveLeft();
    }
  }, {passive: false});
  
  leftBtn.addEventListener('touchend', e => {
    e.preventDefault();
    e.stopPropagation();
    leftBtn.style.opacity = '1';
    if (window.gameInstance && window.gameInstance.player) {
      window.gameInstance.player.stopMoving();
    }
  }, {passive: false});
  
  rightBtn.addEventListener('touchstart', e => {
    e.preventDefault();
    e.stopPropagation();
    rightBtn.style.opacity = '0.7';
    if (window.gameInstance && window.gameInstance.player) {
      window.gameInstance.player.moveRight();
    }
  }, {passive: false});
  
  rightBtn.addEventListener('touchend', e => {
    e.preventDefault();
    e.stopPropagation();
    rightBtn.style.opacity = '1';
    if (window.gameInstance && window.gameInstance.player) {
      window.gameInstance.player.stopMoving();
    }
  }, {passive: false});
  
  shootBtn.addEventListener('touchstart', e => {
    e.preventDefault();
    e.stopPropagation();
    shootBtn.style.opacity = '0.7';
    if (window.gameInstance && window.gameInstance.player) {
      window.gameInstance.player.shootTop();
    }
  }, {passive: false});
  
  shootBtn.addEventListener('touchend', e => {
    e.preventDefault();
    e.stopPropagation();
    shootBtn.style.opacity = '1';
  }, {passive: false});
  
  // Add touchmove handlers to maintain button actions during drag
  leftBtn.addEventListener('touchmove', e => {
    e.preventDefault();
    e.stopPropagation();
    if (window.gameInstance && window.gameInstance.player) {
      window.gameInstance.player.moveLeft();
    }
  }, {passive: false});
  
  rightBtn.addEventListener('touchmove', e => {
    e.preventDefault();
    e.stopPropagation();
    if (window.gameInstance && window.gameInstance.player) {
      window.gameInstance.player.moveRight();
    }
  }, {passive: false});
  
  // Add buttons to the overlay
  overlay.appendChild(leftBtn);
  overlay.appendChild(shootBtn);
  overlay.appendChild(rightBtn);
  
  // Add the overlay to document.body after removing any existing one
  const existingOverlay = document.getElementById('ultra-stable-controls');
  if (existingOverlay && existingOverlay.parentNode) {
    existingOverlay.parentNode.removeChild(existingOverlay);
  }
  
  // Append to body directly, not to any game container
  document.body.appendChild(overlay);
  
  // Forcibly maintain the button positions through a continuous check
  const positionInterval = setInterval(() => {
    if (!document.getElementById('ultra-stable-controls')) {
      clearInterval(positionInterval);
      return;
    }
    
    // Force buttons to stay in the exact positions
    leftBtn.style.bottom = '30px';
    leftBtn.style.left = '20px';
    
    shootBtn.style.bottom = '30px';
    shootBtn.style.left = '50%';
    shootBtn.style.transform = 'translateX(-50%)';
    
    rightBtn.style.bottom = '30px';
    rightBtn.style.right = '20px';
  }, 100);
  
  return {
    overlay,
    leftBtn,
    shootBtn,
    rightBtn
  };
}

  // Execute immediately when the document loads
document.addEventListener('DOMContentLoaded', function() {
  // Force the creation of stable controls
  createStableControlOverlay();
  
  // Set up a monitor for jump count to ensure mobile transactions are not lost
  const monitorJumpCount = function() {
    if (window.__jumpCount && window.__jumpCount > 0) {
      // Ensure the jump count is sent to the parent window periodically
      if (typeof sendMessageToParent === 'function') {
        sendMessageToParent({
          type: 'JUMP_PERFORMED',
          jumpCount: window.__jumpCount,
          timestamp: Date.now(),
          fromMobile: true,
          isMobileDevice: true
        });
        
        console.log(`🔄 Sending periodic jump count update: ${window.__jumpCount} jumps`);
      }
    }
  };
  
  // Start a 3-second interval to monitor and transmit jump count
  const jumpMonitorInterval = setInterval(monitorJumpCount, 3000);
  
  // Store the interval ID so it can be cleared if needed
  window.__jumpMonitorInterval = jumpMonitorInterval;
  
  // Also recreate controls on resize and orientation change
  window.addEventListener('resize', createStableControlOverlay);
  window.addEventListener('orientationchange', function() {
    setTimeout(createStableControlOverlay, 300);
  });
});

// Block any game screenshake from affecting the document body
if (window.juiceEffects && window.juiceEffects.screenShake) {
  const originalScreenShake = window.juiceEffects.screenShake;
  window.juiceEffects.screenShake = function(intensity, duration) {
    // Only apply shake to canvas element, not body
    const canvas = document.getElementById('canvas1');
    if (canvas) {
      const originalTransform = canvas.style.transform;
      const shakeAmount = Math.min(intensity || 5, 10);
      
      // Apply shake directly to canvas
      canvas.style.transform = `translate(${Math.random() * shakeAmount - shakeAmount/2}px, ${Math.random() * shakeAmount - shakeAmount/2}px)`;
      
      // Reset after duration
      setTimeout(() => {
        canvas.style.transform = originalTransform;
      }, duration || 300);
    }
  };
}

function createStableControlOverlay() {
  console.log("Checking whether to create stable controls...");
  
  // First check: if we're in desktop mode, don't create controls
  if (window.isDesktopMode === true) {
    console.log("Desktop mode detected - not creating stable controls");
    
    // Clean up any existing controls
    if (typeof window.cleanupMobileControls === 'function') {
      window.cleanupMobileControls();
    } else {
      // Fallback cleanup
      document.querySelectorAll('#left-btn, #right-btn, #shoot-btn, #mobile-controls-overlay, #stable-controls, #ultra-stable-controls').forEach(el => {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
      document.querySelectorAll('img[src*="left_arrow.png"], img[src*="right_arrow.png"], img[src*="shoot.png"]').forEach(el => {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
    }
    return null;
  }
  
  // Second check: if game instance is available, use its detection method
  let shouldShowControls = false;
  if (window.gameInstance && typeof window.gameInstance.detectMobile === 'function') {
    shouldShowControls = window.gameInstance.detectMobile();
  } else {
    // Fallback check - ONLY iframe or user agent, no dimension or touch capability checks
    const isInIframe = window.self !== window.top;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    shouldShowControls = isInIframe || isMobileUA;
  }
  
  // If not a mobile device or inside an iframe, don't create controls
  if (!shouldShowControls) {
    console.log("Skipping mobile controls on desktop device");
    return null;
  }
  
  console.log("Creating completely stable controls");
  
  // Remove ANY existing controls to start fresh
  document.querySelectorAll('#left-btn, #right-btn, #shoot-btn, #mobile-controls-overlay, #stable-controls').forEach(el => {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  });
}