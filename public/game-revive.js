// Add code to detect player falling and send message to parent before game over
(function() {
  console.log("🎮 Loading game revive fixes - Version 3.0 (AGGRESSIVE)");
  
  // Force debug mode on
  const DEBUG = true;
  
  // Store original functions to call them later
  const originalFunctions = {
    checkGameOver: null,
    gameOver: null,
    update: null,
    animate: null
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
  let revivePending = false;
  let reviveHandled = false;
  let gameInstance = null;
  
  // Display visual debug indicator
  const debugIndicator = document.createElement('div');
  debugIndicator.style.position = 'fixed';
  debugIndicator.style.top = '10px';
  debugIndicator.style.left = '10px';
  debugIndicator.style.background = 'rgba(255,0,0,0.7)';
  debugIndicator.style.color = 'white';
  debugIndicator.style.padding = '10px';
  debugIndicator.style.borderRadius = '5px';
  debugIndicator.style.zIndex = '999999';
  debugIndicator.style.fontFamily = 'monospace';
  debugIndicator.style.fontSize = '14px';
  debugIndicator.textContent = 'REVIVE MONITOR: ACTIVE';
  
  if (DEBUG) {
    document.body.appendChild(debugIndicator);
  }
  
  function updateDebugIndicator(text, color = 'rgba(255,0,0,0.7)') {
    if (!DEBUG || !debugIndicator) return;
    debugIndicator.textContent = 'REVIVE: ' + text;
    debugIndicator.style.background = color;
  }
  
  function debugLog(...args) {
    if (DEBUG) {
      console.log("[REVIVE]", ...args);
    }
  }
  
  // Helper function to send messages to parent
  function sendToParent(type, data) {
    try {
      debugLog(`Sending message to parent: ${type}`, data);
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type, data }, '*');
        updateDebugIndicator(`SENT ${type}`);
        return true;
      }
    } catch (e) {
      console.error("Error sending message to parent:", e);
      updateDebugIndicator(`ERROR: ${e.message}`, 'rgba(255,0,0,0.9)');
    }
    return false;
  }
  
  // Reset the game state completely
  function resetReviveState() {
    debugLog("Resetting revive state completely");
    playerFell = false;
    reviveUsed = false;
    revivePending = false;
    reviveHandled = false;
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
    
    updateDebugIndicator('RESET COMPLETE', 'rgba(0,255,0,0.7)');
    
    // Restart fall detection
    startAllFallDetectionMethods();
  }
  
  function getGameInstance() {
    // Try multiple ways to get the game instance
    if (window.game) return window.game;
    if (window.gameInstance) return window.gameInstance;
    
    // Look for objects with game-like properties
    for (const prop in window) {
      const obj = window[prop];
      if (obj && typeof obj === 'object' && obj.player && obj.canvas) {
        debugLog("Found potential game instance:", prop);
        return obj;
      }
    }
    
    return null;
  }
  
  // Start direct DOM-based fall detection
  function startDirectFallDetection() {
    if (fallDetectionInterval) {
      clearInterval(fallDetectionInterval);
    }
    
    debugLog("Starting aggressive fall detection");
    updateDebugIndicator('DETECTION ACTIVE', 'rgba(0,128,0,0.7)');
    
    fallDetectionInterval = setInterval(() => {
      try {
        // Update game instance reference
        gameInstance = getGameInstance();
        
        if (!gameInstance) {
          debugLog("No game instance found yet");
          return;
        }
        
        // If already handling a fall, don't check again
        if (revivePending || reviveHandled) {
          return;
        }
        
        // Only check if we haven't already detected a fall and haven't used a revive
        if (!playerFell && !reviveUsed && gameInstance && gameInstance.player) {
          const player = gameInstance.player;
          const canvas = gameInstance.canvas;
          
          // Get current score and jump count
          currentScore = Math.floor(gameInstance.score || 0);
          currentJumpCount = window.__jumpCount || 0;
          
          // Check if player is falling off screen
          const isFalling = player.speedY > 0; // Positive Y speed means falling
          const isOffScreen = player.y > canvas.height - (player.height || 0);
          const isGameActive = !gameInstance.gameOver && !gameInstance.isGameOver;
          
          // Add debug info to indicator
          updateDebugIndicator(`Y: ${Math.floor(player.y)}, Fall: ${isFalling}, Score: ${currentScore}`);
          
          // Check for falling condition - player is below screen and moving down
          if (isOffScreen && isFalling && isGameActive) {
            debugLog(`FALL DETECTED! Player Y: ${player.y}, Speed: ${player.speedY}, Canvas height: ${canvas.height}`);
            debugLog(`Score: ${currentScore}, Jumps: ${currentJumpCount}`);
            
            // Prevent multiple detections
            playerFell = true;
            fallDetectionAttempted = true;
            revivePending = true;
            
            // Add visible notification
            showFallNotification();
            
            // Send message to parent 
            sendToParent('PLAYER_FALLING', {
              score: currentScore,
              jumpCount: currentJumpCount,
              sessionId: gameSessionId,
              directDetection: true
            });
            
            // Try multiple methods to pause the game
            pauseGame();
          } else {
            // Track player Y position changes
            lastYPosition = player.y;
          }
        }
      } catch (e) {
        debugLog("Error in direct fall detection:", e);
        updateDebugIndicator(`ERROR: ${e.message}`, 'rgba(255,0,0,0.9)');
      }
    }, 50); // Check very frequently (20 times per second)
  }
  
  // Show a visible notification when a fall is detected
  function showFallNotification() {
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '50%';
    notification.style.left = '50%';
    notification.style.transform = 'translate(-50%, -50%)';
    notification.style.background = 'rgba(255,255,255,0.9)';
    notification.style.color = 'black';
    notification.style.padding = '20px';
    notification.style.borderRadius = '10px';
    notification.style.zIndex = '9999999';
    notification.style.fontFamily = 'Arial, sans-serif';
    notification.style.fontSize = '24px';
    notification.style.textAlign = 'center';
    notification.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
    notification.innerHTML = '<h2>Fall Detected!</h2><p>Sending to parent...</p>';
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
  
  // Try multiple methods to pause the game
  function pauseGame() {
    try {
      // Try to freeze the game loop
      window._gamePaused = true;
      
      if (gameInstance) {
        gameInstance.paused = true;
        
        // Store player's state to restore it later
        if (gameInstance.player) {
          gameInstance.player._oldSpeedY = gameInstance.player.speedY;
          gameInstance.player.speedY = 0;
          gameInstance.player._oldY = gameInstance.player.y;
          
          // Move player back up slightly so they're visible
          gameInstance.player.y = gameInstance.canvas.height - 100;
        }
        
        // Try to stop animation frame
        if (gameInstance.animationId) {
          cancelAnimationFrame(gameInstance.animationId);
        }
      }
      
      if (typeof window.pauseGame === 'function') {
        window.pauseGame();
      }
      
      // Update debug status
      updateDebugIndicator('GAME PAUSED - WAITING FOR REVIVE', 'rgba(255,165,0,0.8)');
      
    } catch (e) {
      debugLog("Error pausing game:", e);
      updateDebugIndicator(`ERROR PAUSING: ${e.message}`, 'rgba(255,0,0,0.9)');
    }
  }
  
  // Hijack the game.update method to detect falls
  function hijackGameUpdate() {
    // Try to find the game instance
    const game = getGameInstance();
    if (!game || !game.update || game._reviveUpdateHijacked) return;
    
    debugLog("Hijacking game.update method");
    
    // Store original update method
    originalFunctions.update = game.update;
    game._reviveUpdateHijacked = true;
    
    // Replace with our version
    game.update = function(deltaTime) {
      // If waiting for revive decision, don't update
      if (revivePending) {
        return;
      }
      
      // Call original update
      const result = originalFunctions.update.apply(this, arguments);
      
      // Post-update checks for fall detection
      if (this.player && !playerFell && !reviveUsed) {
        const isOffScreen = this.player.y > this.canvas.height;
        const isFalling = this.player.speedY > 0;
        
        if (isOffScreen && isFalling && !this.gameOver && !this.isGameOver) {
          debugLog("Fall detected in hijacked update method!");
          
          // Get current stats
          currentScore = Math.floor(this.score || 0);
          currentJumpCount = window.__jumpCount || 0;
          
          // Trigger revive process
          playerFell = true;
          fallDetectionAttempted = true;
          revivePending = true;
          
          // Show a notification
          showFallNotification();
          
          // Send message to parent
          sendToParent('PLAYER_FALLING', {
            score: currentScore,
            jumpCount: currentJumpCount,
            sessionId: gameSessionId,
            updateHijack: true
          });
          
          // Pause the game
          pauseGame();
        }
      }
      
      return result;
    };
  }
  
  // Hijack the animation loop
  function hijackAnimationLoop() {
    // Wait until game is initialized
    const checkForAnimateLoop = setInterval(() => {
      const game = getGameInstance();
      if (!game || game._reviveAnimateHijacked) return;
      
      // Check for animate or gameLoop method
      if (typeof game.animate === 'function') {
        debugLog("Hijacking game.animate method");
        
        // Store original
        originalFunctions.animate = game.animate;
        game._reviveAnimateHijacked = true;
        
        // Replace with our version
        game.animate = function(timestamp) {
          // If waiting for revive, pause animation
          if (revivePending) {
            return;
          }
          
          // Otherwise proceed with original animation loop
          return originalFunctions.animate.apply(this, arguments);
        };
        
        clearInterval(checkForAnimateLoop);
      }
    }, 500);
  }
  
  // Combine all fall detection methods
  function startAllFallDetectionMethods() {
    // Start interval-based detection
    startDirectFallDetection();
    
    // Hijack game update method
    setTimeout(hijackGameUpdate, 500);
    
    // Hijack animation loop
    setTimeout(hijackAnimationLoop, 500);
  }
  
  // Listen for messages from parent
  window.addEventListener('message', function(event) {
    if (event.data && typeof event.data === 'object') {
      debugLog("Received message from parent:", event.data.type);
      
      // Handle game session ID updates (from parent when game is restarted)
      if (event.data.type === 'GAME_SESSION_ID') {
        debugLog("Received new game session ID:", event.data.sessionId);
        gameSessionId = event.data.sessionId;
        window._reviveSessionId = gameSessionId;
        
        // Reset revive state for new session
        resetReviveState();
      }
      // Handle pause and resume for revive
      else if (event.data.type === 'PAUSE_GAME') {
        debugLog("Game paused for revive decision");
        updateDebugIndicator('PAUSED FOR REVIVE', 'rgba(255,165,0,0.8)');
        
        // Ensure game is paused
        pauseGame();
      }
      else if (event.data.type === 'RESUME_GAME' && event.data.revived) {
        debugLog("Game resumed after revive");
        updateDebugIndicator('REVIVED!', 'rgba(0,255,0,0.8)');
        
        window._gamePaused = false;
        playerFell = false;
        reviveUsed = true;
        revivePending = false;
        reviveHandled = true;
        
        // Get current game instance
        const game = getGameInstance();
        
        if (game) {
          game.paused = false;
          
          // Resume game state
          if (typeof game.resumeGame === 'function') {
            game.resumeGame();
          }
          
          // Add safety position adjustment to prevent immediate death
          if (game.player) {
            debugLog("Adjusting player position after revive");
            // Move player up to a safe position
            game.player.y = game.canvas.height / 2;
            game.player.speedY = -15; // Give a small upward boost
          }
          
          // Restart animation if needed
          if (typeof game.animate === 'function' && !game.animationId) {
            game.animate(performance.now());
          }
        }
      }
      else if (event.data.type === 'CANCEL_REVIVE') {
        debugLog("Revive cancelled, proceeding with game over");
        updateDebugIndicator('REVIVE CANCELLED', 'rgba(255,0,0,0.8)');
        
        // Mark as handled
        revivePending = false;
        reviveHandled = true;
        
        // Unpause the game
        window._gamePaused = false;
        
        const game = getGameInstance();
        if (game) {
          game.paused = false;
        }
        
        // Proceed with game over
        if (originalFunctions.gameOver) {
          originalFunctions.gameOver(currentScore);
        }
      }
      else if (event.data.type === 'PLAY_AGAIN') {
        debugLog("Play again requested - resetting revive state");
        resetReviveState();
      }
    }
  });
  
  // Listen for reload/play again button clicks
  document.addEventListener('click', function(e) {
    if (e.target && 
        (e.target.id === 'restart-button' || 
         e.target.id === 'playButton' ||
         e.target.className === 'restart-button' || 
         e.target.innerText === 'Play Again' ||
         e.target.innerText === 'Try Again')) {
      debugLog("Restart/Play Again button clicked");
      resetReviveState();
      
      // Notify parent about the restart
      sendToParent('GAME_RESTART', {
        timestamp: Date.now()
      });
    }
  }, true);
  
  // Intercept the checkGameOver function to detect falling
  if (typeof window.checkGameOver === 'function') {
    originalFunctions.checkGameOver = window.checkGameOver;
    
    window.checkGameOver = function() {
      // If already paused for revive, skip original function
      if (revivePending || (playerFell && !reviveUsed)) {
        return false;
      }
      
      // Call original function to get its results
      const result = originalFunctions.checkGameOver.apply(this, arguments);
      
      // Check for falling condition after original function
      const game = getGameInstance();
      if (game && 
          game.player && 
          game.player.y > game.canvas.height && 
          !game.isGameOver && 
          !playerFell && 
          !reviveUsed) {
        
        // Get current score
        currentScore = Math.floor(game.score || 0);
        currentJumpCount = window.__jumpCount || 0;
        
        debugLog(`Fall detected in checkGameOver! Score: ${currentScore}, Jumps: ${currentJumpCount}`);
        updateDebugIndicator('FALL DETECTED!', 'rgba(255,0,0,0.8)');
        
        // Only send the falling event if we haven't already used a revive
        if (!reviveUsed) {
          playerFell = true;
          fallDetectionAttempted = true;
          revivePending = true;
          
          // Show notification
          showFallNotification();
          
          // Send message to parent for revive opportunity
          sendToParent('PLAYER_FALLING', {
            score: currentScore,
            jumpCount: currentJumpCount,
            sessionId: gameSessionId,
            checkGameOver: true
          });
          
          // Pause the game
          pauseGame();
          
          // Prevent immediate game over by returning early
          return false;
        } else {
          debugLog("Revive already used in this session, proceeding with game over");
        }
      }
      
      return result;
    };
  }
  
  // Override the game over function
  if (typeof window.gameOver === 'function') {
    originalFunctions.gameOver = window.gameOver;
    
    window.gameOver = function(finalScore) {
      // If the player fell and we're waiting for revive decision, don't proceed
      if (revivePending || (playerFell && !reviveUsed)) {
        debugLog("Game over prevented while waiting for revive decision");
        return;
      }
      
      debugLog("Game over with score:", finalScore, "jumps:", currentJumpCount);
      gameActive = false;
      
      // Send final data to parent
      sendToParent('GAME_OVER', {
        finalScore: finalScore,
        jumpCount: currentJumpCount,
        sessionId: gameSessionId,
        reviveUsed: reviveUsed
      });
      
      // Call original gameOver if available
      if (originalFunctions.gameOver) {
        return originalFunctions.gameOver.apply(this, arguments);
      }
    };
  }
  
  // Initialize session ID, expose for diagnostics
  window._reviveSessionId = gameSessionId;
  window._reviveState = function() {
    return {
      playerFell,
      reviveUsed,
      revivePending,
      reviveHandled,
      currentScore,
      currentJumpCount,
      gameSessionId,
      gameActive,
      fallDetectionAttempted
    };
  };
  
  // Start all fall detection methods
  setTimeout(startAllFallDetectionMethods, 1000);
  
  debugLog("Enhanced game revive system loaded successfully");
  
  // Display startup notification
  const startupNotification = document.createElement('div');
  startupNotification.style.position = 'fixed';
  startupNotification.style.top = '50%';
  startupNotification.style.left = '50%';
  startupNotification.style.transform = 'translate(-50%, -50%)';
  startupNotification.style.background = 'rgba(0,0,0,0.8)';
  startupNotification.style.color = 'white';
  startupNotification.style.padding = '20px';
  startupNotification.style.borderRadius = '10px';
  startupNotification.style.zIndex = '9999999';
  startupNotification.style.fontFamily = 'Arial, sans-serif';
  startupNotification.style.fontSize = '20px';
  startupNotification.style.textAlign = 'center';
  startupNotification.innerHTML = '<h2>Revive System v3.0</h2><p>Aggressive fall detection enabled!</p>';
  
  document.body.appendChild(startupNotification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (startupNotification.parentNode) {
      startupNotification.parentNode.removeChild(startupNotification);
    }
  }, 3000);
})(); 