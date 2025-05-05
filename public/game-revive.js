// Add code to detect player falling and send message to parent before game over
(function() {
  console.log("🎮 Loading game revive fixes - Version 3.0");
  
  // More aggressive debug mode
  const DEBUG = true;
  
  // Store original functions to call them later
  const originalFunctions = {
    checkGameOver: null,
    gameOver: null
  };
  
  // Track game state
  let gameActive = true;
  let playerFell = false;
  let reviveUsed = false;
  let currentScore = 0;
  let currentJumpCount = 0;
  let gameSessionId = Date.now().toString();
  let lastYPosition = 0;
  let fallDetectionInterval = null;
  let fallDetectionAttempted = false;
  
  function debugLog(...args) {
    if (DEBUG) {
      console.log("[REVIVE]", ...args);
    }
  }

  // Force display in console that revive system is loading
  console.warn("🔄 REVIVE SYSTEM INITIALIZING - VERSION 3.0");
  console.warn("Game revive functionality is being set up...");
  
  // Helper function to send messages to parent
  function sendToParent(type, data) {
    try {
      debugLog(`Sending message to parent: ${type}`, data);
      console.warn(`📤 REVIVE: Sending ${type} message to parent`, data);
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type, data }, '*');
        return true;
      }
    } catch (e) {
      console.error("Error sending message to parent:", e);
    }
    return false;
  }
  
  // Reset the game state completely
  function resetReviveState() {
    debugLog("Resetting revive state completely");
    console.warn("🔄 REVIVE: Resetting state");
    playerFell = false;
    reviveUsed = false;
    currentScore = 0;
    currentJumpCount = 0;
    gameSessionId = Date.now().toString();
    window._reviveSessionId = gameSessionId;
    lastYPosition = 0;
    fallDetectionAttempted = false;
    
    // Clear fall detection interval if it exists
    if (fallDetectionInterval) {
      clearInterval(fallDetectionInterval);
      fallDetectionInterval = null;
    }
    
    // Start detection immediately after reset
    startDirectFallDetection();
  }
  
  // Start direct DOM-based fall detection
  function startDirectFallDetection() {
    if (fallDetectionInterval) {
      clearInterval(fallDetectionInterval);
    }
    
    console.warn("🔍 REVIVE: Starting direct fall detection");
    fallDetectionInterval = setInterval(() => {
      try {
        // Get game and player instances - try multiple ways
        const game = window.game || window.gameInstance || window.doodleJump;
        const player = game?.player;
        const canvas = game?.canvas || document.getElementById('canvas1');
        
        if (!game || !player) {
          console.warn("⚠️ REVIVE: Game or player not found, retrying...");
          return;
        }
        
        // Only check if we haven't already detected a fall and haven't used a revive
        if (!playerFell && !reviveUsed) {
          // Get current score and jump count
          currentScore = Math.floor(game.score || 0);
          currentJumpCount = window.__jumpCount || 0;
          
          // Enhanced fall detection - multiple methods
          const isFalling = player.speedY > 0; // Player is moving downward
          const isOffScreen = player.y > (canvas?.height || window.innerHeight);
          const isPlayerDead = game.isGameOver;
          
          console.log(`REVIVE DEBUG: Player Y: ${player.y}, Canvas Height: ${canvas?.height}, Falling: ${isFalling}, SpeedY: ${player.speedY}`);
          
          // Method 1: Player is off screen
          if (isOffScreen && !isPlayerDead) {
            console.warn("💥 REVIVE: Player fallen off screen! Sending PLAYER_FALLING message");
            triggerPlayerFalling(game, player, "offscreen");
          }
          // Method 2: Player is falling rapidly
          else if (isFalling && player.speedY > 25 && !isPlayerDead) {
            console.warn("💥 REVIVE: Player falling too fast! Sending PLAYER_FALLING message");
            triggerPlayerFalling(game, player, "highspeed");
          }
          // Method 3: Player is far below all platforms
          else if (isFalling && player.y > window.innerHeight * 0.8 && !isNearPlatform(game, player) && !isPlayerDead) {
            console.warn("💥 REVIVE: Player falling with no platforms below! Sending PLAYER_FALLING message");
            triggerPlayerFalling(game, player, "noplatforms");
          }
          
          // Track Y position for fall detection
          lastYPosition = player.y;
        }
      } catch (e) {
        console.error("Error in direct fall detection:", e);
      }
    }, 50); // Check more frequently (20 times per second)
  }
  
  // Check if player is near any platforms
  function isNearPlatform(game, player) {
    if (!game.platforms || !game.platforms.length) return false;
    
    // Consider platforms only below the player
    const relevantPlatforms = game.platforms.filter(p => 
      p.y > player.y && // Platform is below player
      p.y < player.y + 300 && // Platform is within reasonable distance
      Math.abs(p.x - player.x) < 100 // Platform is horizontally aligned
    );
    
    return relevantPlatforms.length > 0;
  }
  
  // Trigger player falling event
  function triggerPlayerFalling(game, player, reason) {
    if (playerFell || reviveUsed) return;
    
    playerFell = true;
    fallDetectionAttempted = true;
    
    // Send message to parent 
    sendToParent('PLAYER_FALLING', {
      score: currentScore,
      jumpCount: currentJumpCount,
      sessionId: gameSessionId,
      directDetection: true,
      reason: reason
    });
    
    // Try to stop game (multiple methods)
    try {
      // Try to freeze the game loop
      window._gamePaused = true;
      
      if (game) {
        game.paused = true;
      }
      
      if (typeof window.pauseGame === 'function') {
        window.pauseGame();
      }
      
      // Prevent player from moving further
      if (player) {
        player._oldSpeedY = player.speedY;
        player.speedY = 0;
        player._oldY = player.y;
      }
    } catch (e) {
      debugLog("Error pausing game:", e);
    }
  }
  
  // Listen for messages from parent
  window.addEventListener('message', function(event) {
    if (event.data && typeof event.data === 'object') {
      // Log all incoming messages
      console.log("📩 REVIVE: Received message from parent:", event.data.type);
      
      // Handle game session ID updates (from parent when game is restarted)
      if (event.data.type === 'GAME_SESSION_ID') {
        debugLog("Received new game session ID:", event.data.sessionId);
        gameSessionId = event.data.sessionId;
        window._reviveSessionId = gameSessionId;
        
        // Reset revive state for new session
        resetReviveState();
      }
      // Handle game restart
      else if (event.data.type === 'GAME_RESTART') {
        console.warn("🔄 REVIVE: Game restart detected");
        resetReviveState();
      }
      // Handle pause and resume for revive
      else if (event.data.type === 'PAUSE_GAME') {
        debugLog("Game paused for revive decision");
        
        // Pause game by freezing animation frame
        window._gamePaused = true;
        
        if (typeof window.pauseGame === 'function') {
          window.pauseGame();
        } else {
          debugLog("No pauseGame function found, using alternative method");
          // Alternative pause method
          if (window.game && window.game.player) {
            window.game._wasPaused = window.game.paused || false;
            window.game.paused = true;
          }
        }
      }
      else if (event.data.type === 'RESUME_GAME' && event.data.revived) {
        debugLog("Game resumed after revive");
        console.warn("🎮 REVIVE: Game resumed after successful revive!");
        window._gamePaused = false;
        playerFell = false;
        reviveUsed = true;
        
        // Resume game state
        if (typeof window.resumeGame === 'function') {
          window.resumeGame();
        } else {
          debugLog("No resumeGame function found, using alternative method");
          // Alternative resume method
          if (window.game) {
            window.game.paused = window.game._wasPaused || false;
          }
        }
        
        // Add safety position adjustment to prevent immediate death
        if (window.game && window.game.player) {
          debugLog("Adjusting player position after revive");
          // Move player up slightly to prevent immediate death
          window.game.player.y -= 200;
          window.game.player.speedY = -15; // Give a small upward boost
        }
      }
      else if (event.data.type === 'CANCEL_REVIVE') {
        debugLog("Revive cancelled, proceeding with game over");
        console.warn("❌ REVIVE: Revive cancelled, proceeding to game over");
        
        // Unpause the game
        window._gamePaused = false;
        
        if (window.game) {
          window.game.paused = false;
        }
        
        // Proceed with game over
        if (originalFunctions.gameOver) {
          originalFunctions.gameOver(currentScore);
        } else {
          // Try to find and call the game over function
          if (window.game && typeof window.game.gameOver === 'function') {
            window.game.gameOver();
          }
        }
      }
    }
  });
  
  // Initialize the system when the page loads
  function initializeReviveSystem() {
    console.warn("✅ REVIVE: Initializing system");
    
    // Try to find the original game over functions
    if (window.game) {
      if (typeof window.game.gameOver === 'function') {
        originalFunctions.gameOver = window.game.gameOver;
        
        // Override game over function
        window.game.gameOver = function(score) {
          console.warn("🎮 REVIVE: Game over function called", score);
          
          // Only show revive if it hasn't been used and player fell
          if (!reviveUsed && playerFell) {
            console.warn("🎮 REVIVE: Player eligible for revive!");
            return; // Already handled by fall detection
          }
          
          // Otherwise proceed with normal game over
          console.warn("🎮 REVIVE: No revive available, proceeding with game over");
          originalFunctions.gameOver.call(window.game, score);
        };
        
        console.warn("✅ REVIVE: Successfully overrode game over function");
      }
      
      // Try to find and override checkGameOver function if it exists
      if (typeof window.game.checkGameOver === 'function') {
        originalFunctions.checkGameOver = window.game.checkGameOver;
        
        // Override checkGameOver
        window.game.checkGameOver = function() {
          // If player fell and we haven't used a revive yet
          if (playerFell && !reviveUsed) {
            console.warn("🎮 REVIVE: Preventing game over check while waiting for revive decision");
            return false;
          }
          
          // Otherwise proceed with normal check
          return originalFunctions.checkGameOver.apply(window.game, arguments);
        };
        
        console.warn("✅ REVIVE: Successfully overrode checkGameOver function");
      }
    }
    
    // Start direct fall detection
    startDirectFallDetection();
    
    // Send ready message to parent
    sendToParent('REVIVE_SYSTEM_READY', { 
      sessionId: gameSessionId,
      timestamp: Date.now()
    });
  }
  
  // Handle game restart (create a MutationObserver to detect DOM changes that might indicate a restart)
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        // Check if any added nodes are game-related elements
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          if (node.id === 'canvas1' || node.id === 'game-container') {
            console.warn("🔄 REVIVE: Game UI reset detected, resetting revive state");
            resetReviveState();
            break;
          }
        }
      }
    });
  });
  
  // Start observing the document with the configured parameters
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Wait for document and game to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      // Try immediately
      initializeReviveSystem();
      
      // And try again after a short delay to catch late initialization
      setTimeout(initializeReviveSystem, 500);
    });
  } else {
    // Document already loaded, initialize now
    initializeReviveSystem();
    
    // And try again after a short delay
    setTimeout(initializeReviveSystem, 500);
  }
  
  // Also try when window is fully loaded
  window.addEventListener('load', function() {
    initializeReviveSystem();
  });
  
  // Additional safety - try initialization after 1 second
  setTimeout(initializeReviveSystem, 1000);
  
  // Additional safety - try initialization after 2 seconds
  setTimeout(initializeReviveSystem, 2000);
  
  // Log that we've loaded
  console.warn("🎮 REVIVE SYSTEM LOADED! - VERSION 3.0");
})(); 