// Service worker to intercept requests for player.js and main.js
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Intercept player.js file request
  if (url.pathname.endsWith('/js/player.js')) {
    console.log('Intercepting request for player.js, redirecting to fixed version');
    event.respondWith(
      fetch('/js/fixed-player.js')
        .then(response => {
          return response;
        })
        .catch(error => {
          console.error('Error loading fixed player.js:', error);
          return fetch(event.request);
        })
    );
  }
  
  // Intercept main.js file request
  if (url.pathname.endsWith('/js/main.js')) {
    console.log('Intercepting request for main.js');
    
    event.respondWith(
      fetch(event.request)
        .then(response => {
          return response.text().then(text => {
            console.log('Processing main.js for game over handling fix');
            
            // First add game state tracking to the beginning of the Game class
            let fixedCode = text.replace(
              /export default class Game {/,
              `export default class Game {
  constructor() {
    // Game state tracking for proper game over handling
    this.hasStartedPlaying = false;
    this.gameStartTime = null;
    this.minPlayTimeForGameOver = 3000; // Minimum 3 seconds of gameplay
    this.gameOverTriggered = false;
    
    // Track player interaction
    window.addEventListener('keydown', () => {
      if (!this.hasStartedPlaying) {
        console.log('Game started - player interaction detected');
        this.hasStartedPlaying = true;
        this.gameStartTime = Date.now();
      }
    });
    
    window.addEventListener('mousedown', () => {
      if (!this.hasStartedPlaying) {
        console.log('Game started - player interaction detected');
        this.hasStartedPlaying = true;
        this.gameStartTime = Date.now();
      }
    });`
            );
            
            // Add the showGameOverScreen method to the Game class
            fixedCode = fixedCode.replace(
              /(update\([^)]*\)\s*{[^}]*})/,
              `$1
              
  // Custom method to show game over screen and trigger final transaction
  showGameOverScreen(finalScore) {
    // Only process game over if the game has been played
    const gameRunTime = this.gameStartTime ? Date.now() - this.gameStartTime : 0;
    
    console.log(\`Game over check: hasStarted=\${this.hasStartedPlaying}, runTime=\${gameRunTime}ms\`);
    
    // Validate this is a legitimate game over
    if (!this.hasStartedPlaying || gameRunTime < this.minPlayTimeForGameOver || finalScore <= 0) {
      console.log('Invalid game over detected - game not played long enough or no score');
      return;
    }
    
    console.log('Valid game over detected with score:', finalScore);
    
    // Create game over UI
    const gameOverUI = document.createElement('div');
    gameOverUI.style.position = 'absolute';
    gameOverUI.style.top = '50%';
    gameOverUI.style.left = '50%';
    gameOverUI.style.transform = 'translate(-50%, -50%)';
    gameOverUI.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    gameOverUI.style.padding = '20px';
    gameOverUI.style.borderRadius = '10px';
    gameOverUI.style.color = 'white';
    gameOverUI.style.textAlign = 'center';
    gameOverUI.style.fontFamily = 'Arial, sans-serif';
    gameOverUI.style.zIndex = '100';
    
    gameOverUI.innerHTML = \`
      <h1 style="font-size: 28px; margin-bottom: 15px;">Game Over!</h1>
      <p style="font-size: 20px; margin-bottom: 20px;">Final Score: \${finalScore}</p>
      <div>
        <button id="try-again" style="padding: 10px 20px; margin: 10px; background: #ff5555; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">Try Again</button>
        <button id="back-to-home" style="padding: 10px 20px; margin: 10px; background: #5555ff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">Back to Home</button>
      </div>
    \`;
    
    document.body.appendChild(gameOverUI);
    
    // Add button event listeners
    document.getElementById('try-again').addEventListener('click', () => {
      document.body.removeChild(gameOverUI);
      this.restart();
    });
    
    document.getElementById('back-to-home').addEventListener('click', () => {
      window.parent.postMessage({ type: 'NAVIGATE_HOME' }, '*');
    });
    
    // Trigger the bundled transaction via the global function
    if (typeof window.gameOver === 'function') {
      console.log('Calling global gameOver with final score:', finalScore);
      window.gameOver(finalScore);
    } else {
      console.error('Global gameOver function not found');
    }
  }`
            );
            
            // Replace the checkGameOver method with our fixed version
            fixedCode = fixedCode.replace(
              /checkGameOver\(\)\s*{[\s\S]*?if\s*\(\s*this\.player\.y\s*>\s*this\.canvas\.height[\s\S]*?return true;[\s\S]*?}/,
              `checkGameOver() {
    // Only check for game over if player has fallen below canvas
    if (this.player.y > this.canvas.height) {
      // Make sure this is a valid game over (not initial load)
      const gameRunTime = this.gameStartTime ? Date.now() - this.gameStartTime : 0;
      
      if (!this.hasStartedPlaying || gameRunTime < this.minPlayTimeForGameOver) {
        console.log('Ignoring initial game over - game not played yet');
        // Reset player position instead of triggering game over
        this.player.y = 0;
        return false;
      }
      
      // Set game over state
      this.isGameOver = true;
      
      // Only trigger once
      if (!this.gameOverTriggered) {
        this.gameOverTriggered = true;
        const finalScore = Math.floor(this.score);
        
        console.log('Game over triggered - player fell below canvas');
        console.log('Final score:', finalScore);
        
        // Show game over screen with delay to ensure UI is ready
        setTimeout(() => {
          this.showGameOverScreen(finalScore);
        }, 500);
      }
      
      return true;
    }
    
    return false;
  }`
            );
            
            // Return modified code
            return new Response(fixedCode, {
              headers: {
                'Content-Type': 'application/javascript',
                'Cache-Control': 'no-store'
              }
            });
          });
        })
        .catch(error => {
          console.error('Error processing main.js:', error);
          return fetch(event.request);
        })
    );
  }
}); 