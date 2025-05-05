// Add code to detect player falling and send message to parent before game over
(function() {
  console.log("🎮 Loading game revive fixes");
  
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
  
  // Helper function to send messages to parent
  function sendToParent(type, data) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type, data }, '*');
        return true;
      }
    } catch (e) {
      console.error("Error sending message to parent:", e);
    }
    return false;
  }
  
  // Listen for messages from parent
  window.addEventListener('message', function(event) {
    if (event.data && typeof event.data === 'object') {
      // Handle pause and resume for revive
      if (event.data.type === 'PAUSE_GAME') {
        console.log("🎮 Game paused for revive decision");
        
        // Pause game by freezing animation frame
        window._gamePaused = true;
        
        if (typeof window.pauseGame === 'function') {
          window.pauseGame();
        }
      }
      else if (event.data.type === 'RESUME_GAME' && event.data.revived) {
        console.log("🎮 Game resumed after revive");
        window._gamePaused = false;
        playerFell = false;
        reviveUsed = true;
        
        // Resume game state
        if (typeof window.resumeGame === 'function') {
          window.resumeGame();
        } 
        
        // Add safety position adjustment to prevent immediate death
        if (window.game && window.game.player) {
          // Move player up slightly to prevent immediate death
          window.game.player.y -= 200;
          window.game.player.speedY = -15; // Give a small upward boost
        }
      }
      else if (event.data.type === 'CANCEL_REVIVE') {
        console.log("🎮 Revive cancelled, proceeding with game over");
        
        // Proceed with game over
        if (originalFunctions.gameOver) {
          originalFunctions.gameOver(currentScore);
        }
      }
    }
  });
  
  // Intercept the checkGameOver function to detect falling
  if (typeof window.checkGameOver === 'function') {
    originalFunctions.checkGameOver = window.checkGameOver;
    
    window.checkGameOver = function() {
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
        
        console.log(`🎮 Player falling detected! Score: ${currentScore}, Jumps: ${currentJumpCount}`);
        
        // Only send the falling event if we haven't already used a revive
        if (!reviveUsed) {
          playerFell = true;
          
          // Send message to parent for revive opportunity
          sendToParent('PLAYER_FALLING', {
            score: currentScore,
            jumpCount: currentJumpCount
          });
          
          // Prevent immediate game over by returning early
          return false;
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
        console.log("🎮 Game over prevented while waiting for revive decision");
        return;
      }
      
      console.log("🎮 Game over with score:", finalScore, "jumps:", currentJumpCount);
      gameActive = false;
      
      // Send final data to parent
      sendToParent('GAME_OVER', {
        finalScore: finalScore,
        jumpCount: currentJumpCount
      });
      
      // Call original gameOver if available
      if (originalFunctions.gameOver) {
        return originalFunctions.gameOver.apply(this, arguments);
      }
    };
  }
  
  console.log("🎮 Game revive fixes loaded successfully");
})(); 