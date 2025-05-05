// Add code to detect player falling and send message to parent before game over
(function() {
  console.log("🎮 Loading game revive fixes - Version 2.0");
  
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
  
  // Helper function to send messages to parent
  function sendToParent(type, data) {
    try {
      debugLog(`Sending message to parent: ${type}`, data);
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
  }
  
  // Start direct DOM-based fall detection
  function startDirectFallDetection() {
    if (fallDetectionInterval) return; // Already running
    
    debugLog("Starting direct fall detection");
    fallDetectionInterval = setInterval(() => {
      try {
        // Only check if we haven't already detected a fall and haven't used a revive
        if (!playerFell && !reviveUsed && window.game && window.game.player) {
          const player = window.game.player;
          const canvas = window.game.canvas;
          
          // Get current score and jump count
          currentScore = Math.floor(window.game.score || 0);
          currentJumpCount = window.__jumpCount || 0;
          
          // Check if player is falling off screen
          if (player.y > canvas.height && !window.game.isGameOver) {
            debugLog(`Direct fall detection triggered! Player Y: ${player.y}, Canvas height: ${canvas.height}`);
            debugLog(`Score: ${currentScore}, Jumps: ${currentJumpCount}`);
            
            // Prevent multiple detections
            playerFell = true;
            fallDetectionAttempted = true;
            
            // Send message to parent 
            sendToParent('PLAYER_FALLING', {
              score: currentScore,
              jumpCount: currentJumpCount,
              sessionId: gameSessionId,
              directDetection: true
            });
            
            // Try to stop game (multiple methods)
            try {
              // Try to freeze the game loop
              window._gamePaused = true;
              
              if (window.game) {
                window.game.paused = true;
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
          } else {
            // Track player Y position changes
            lastYPosition = player.y;
          }
        }
      } catch (e) {
        debugLog("Error in direct fall detection:", e);
      }
    }, 50); // Check more frequently (20 times per second)
  }
  
  // Listen for messages from parent
  window.addEventListener('message', function(event) {
    if (event.data && typeof event.data === 'object') {
      // Handle game session ID updates (from parent when game is restarted)
      if (event.data.type === 'GAME_SESSION_ID') {
        debugLog("Received new game session ID:", event.data.sessionId);
        gameSessionId = event.data.sessionId;
        window._reviveSessionId = gameSessionId;
        
        // Reset revive state for new session
        resetReviveState();
        
        // Restart fall detection after reset
        startDirectFallDetection();
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
        
        // Unpause the game
        window._gamePaused = false;
        
        if (window.game) {
          window.game.paused = false;
        }
        
        // Proceed with game over
        if (originalFunctions.gameOver) {
          originalFunctions.gameOver(currentScore);
        }
      }
      else if (event.data.type === 'PLAY_AGAIN') {
        debugLog("Play again requested - resetting revive state");
        resetReviveState();
        
        // Restart fall detection
        startDirectFallDetection();
      }
    }
  });
  
  // Listen for reload/play again button clicks
  if (document.body) {
    document.body.addEventListener('click', function(e) {
      if (e.target && 
          (e.target.id === 'restart-button' || 
           e.target.className === 'restart-button' || 
           e.target.innerText === 'Play Again')) {
        debugLog("Restart/Play Again button clicked");
        resetReviveState();
        
        // Notify parent about the restart
        sendToParent('GAME_RESTART', {
          timestamp: Date.now()
        });
      }
    }, true);
  }
  
  // Intercept the checkGameOver function to detect falling
  if (typeof window.checkGameOver === 'function') {
    originalFunctions.checkGameOver = window.checkGameOver;
    
    window.checkGameOver = function() {
      // If already paused for revive, skip original function
      if (playerFell && !reviveUsed) {
        return false;
      }
      
      // Call original function to get its results
      const result = originalFunctions.checkGameOver.apply(this, arguments);
      
      // If we detect the player falling (not collision) and haven't already detected it
      if (window.game && 
          window.game.player && 
          window.game.player.y > window.game.canvas.height && 
          !window.game.isGameOver && 
          !playerFell) {
        
        // Get current score
        currentScore = Math.floor(window.game.score || 0);
        currentJumpCount = window.__jumpCount || 0;
        
        debugLog(`Player falling detected in checkGameOver! Score: ${currentScore}, Jumps: ${currentJumpCount}`);
        
        // Only send the falling event if we haven't already used a revive
        if (!reviveUsed) {
          playerFell = true;
          fallDetectionAttempted = true;
          
          // Send message to parent for revive opportunity
          sendToParent('PLAYER_FALLING', {
            score: currentScore,
            jumpCount: currentJumpCount,
            sessionId: gameSessionId
          });
          
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
      if (playerFell && !reviveUsed) {
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
      currentScore,
      currentJumpCount,
      gameSessionId,
      gameActive,
      fallDetectionAttempted
    };
  };
  
  // Start direct fall detection immediately
  setTimeout(startDirectFallDetection, 1000);  
  
  debugLog("Game revive fixes loaded successfully - Ready to detect falls");
})(); 