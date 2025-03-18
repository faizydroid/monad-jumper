// Clean implementation - replace entire file
(function() {
  console.log("🎮 Initializing clean game fixes");
  
  // Clear any previous handlers
  const originalFunctions = {
    startGame: window.startGame,
    gameOver: window.gameOver,
    postMessage: window.parent.postMessage
  };
  
  // Track game state
  let gameActive = false;
  let currentJumpCount = 0;
  
  // Helper function to send messages to parent frame
  function sendToParent(type, data) {
    try {
      originalFunctions.postMessage.call(
        window.parent, 
        { type, data: { ...data, timestamp: Date.now() } }, 
        '*'
      );
    } catch (error) {
      console.error(`Error sending ${type} message:`, error);
    }
  }
  
  // Reset all game state
  function resetGameState() {
    console.log("🎮 Complete game state reset");
    currentJumpCount = 0;
    window.__jumpCount = 0;
    window.totalJumps = 0;
    window.currentScore = 0;
    gameActive = true;
    
    sendToParent('GAME_RESET', {});
  }
  
  // Handle jump recording and transactions
  window.recordJump = function(platformType) {
    if (!gameActive) return false;
    
    currentJumpCount++;
    window.__jumpCount = currentJumpCount;
    window.totalJumps = currentJumpCount;
    
    console.log(`🎮 Jump ${currentJumpCount} recorded, sending transaction`);
    
    // Send the real jump transaction to parent
    sendToParent('JUMP', { 
      platformType, 
      jumpCount: currentJumpCount 
    });
    
    return true;
  };
  
  // Override the game start function
  window.startGame = function() {
    console.log("🎮 Game starting/restarting");
    resetGameState();
    
    if (originalFunctions.startGame) {
      return originalFunctions.startGame.apply(this, arguments);
    }
  };
  
  // Override the game over function
  window.gameOver = function(finalScore) {
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
  
  // Add restart button click handling
  function setupRestartButtonHandler() {
    document.addEventListener('click', function(e) {
      if (e.target && (
        e.target.classList.contains('restart-button') || 
        e.target.id === 'restartButton' ||
        (e.target.textContent && (
          e.target.textContent.toLowerCase().includes('play') ||
          e.target.textContent.toLowerCase().includes('restart')
        ))
      )) {
        console.log("🎮 Play/Restart button clicked");
        window.startGame();
      }
    }, true);
  }
  
  // Handle the Player.prototype.processJump method (after it's loaded)
  function setupPlayerJumpHandler() {
    // Check if Player is defined yet
    if (window.Player && window.Player.prototype && window.Player.prototype.processJump) {
      const originalProcessJump = window.Player.prototype.processJump;
      
      window.Player.prototype.processJump = function(platformType) {
        // Do gameplay mechanics
        if (originalProcessJump) {
          const result = originalProcessJump.call(this, platformType);
          
          // After mechanics, record the jump for transaction
          window.recordJump(platformType);
          
          return result;
        }
        
        // Fallback if original not available
        this.vy = this.min_vy;
        window.recordJump(platformType);
        return true;
      };
      
      console.log("🎮 Player.processJump successfully patched");
    } else {
      // Try again in a moment
      setTimeout(setupPlayerJumpHandler, 100);
    }
  }
  
  // Initialize everything
  resetGameState();
  setupRestartButtonHandler();
  setupPlayerJumpHandler();
  
  console.log("🎮 Game fixes completely applied");
})(); 