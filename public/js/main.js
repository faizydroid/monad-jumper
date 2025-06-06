import { Player } from '/js/player.js'
import { Background } from '/js/background.js'
import { InputHandler } from '/js/input.js'
import { Platform } from '/js/platform.js'
import { Enemy } from '/js/enemy.js'

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
    
    const canvas = document.querySelector('#canvas1')
    const ctx = canvas.getContext('2d')
    
    // Make canvas responsive to screen size
    const updateCanvasSize = () => {
        // Set a good aspect ratio while maximizing screen usage
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Use a fixed aspect ratio (532:850 ≈ 0.625)
        const aspectRatio = 0.625;
        
        // Check if we're on a mobile device
        const isMobile = window.innerWidth <= 768 || 
                    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                    (typeof window.orientation !== 'undefined');
        
        // Calculate dimensions to maintain aspect ratio
        let canvasWidth, canvasHeight;
        
        if (isMobile) {
            // For mobile, prioritize using full height of the screen
            canvasHeight = windowHeight;
            canvasWidth = canvasHeight * aspectRatio;
            
            // If width exceeds window width, adjust accordingly
            if (canvasWidth > windowWidth) {
                canvasWidth = windowWidth;
                canvasHeight = canvasWidth / aspectRatio;
            }
        } else {
            // For desktop, maintain aspect ratio while fitting screen
        if (windowWidth * aspectRatio <= windowHeight) {
            // Width is the limiting factor
            canvasWidth = Math.min(windowWidth, 532);
            canvasHeight = canvasWidth / aspectRatio;
        } else {
            // Height is the limiting factor
            canvasHeight = Math.min(windowHeight, 850);
            canvasWidth = canvasHeight * aspectRatio;
            }
        }
        
        // Set canvas dimensions
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        // Make canvas visible after sizing
        canvas.style.display = 'block';
        
        // Log the new dimensions
        console.log(`Canvas resized to: ${canvasWidth}x${canvasHeight}, isMobile: ${isMobile}`);
    };
    
    // Initial sizing
    updateCanvasSize();
    
    // Handle window resize
    window.addEventListener('resize', updateCanvasSize);

    class Game {
        constructor(width, height) {
            this.width = width
            this.height = height
            this.canvas = canvas
            this.vy = 0
            this.gameOver = false
            this.gameStart = false
            this.deathReason = null  // Add property to track cause of death
            this.platforms = []
            this.enemies = []
            this.level = 0
            this.score = 0
            this.enemyChance = 0
            this.enemyMaxChance = 50
            this.object_vx = 3
            this.object_max_vx = 6
            this.platform_gap = 100
            this.platform_max_gap = 175
            this.blue_white_platform_chance = 0
            this.blue_white_platform_max_chance = 85
            this.gameId = Date.now().toString(); // Add unique game ID for tracking revive state
            this.gameOverButtons = {
                tryAgain: {
                    x: canvas.width / 2 - 60, // Center the larger image
                    y: canvas.height / 2 + 180, // Move further down
                    width: 120, // Increase size
                    height: 120, // Increase size
                    text: 'Try Again'
                }
            };
            this.hasUsedRevive = false; // Flag to track if player has used a revive in the current game
            this.showingReviveMenu = false; // Flag to track if revive menu is being shown
            this.reviveTransactionPending = false; // Flag to track if revive transaction is in progress
            this.reviveCountdown = 0; // Countdown timer for revive
            this.reviveContractAddress = "0xe56a5d27bd9d27fcdf6beaab97a5faa8fcb53cf9"; // Revive contract address

            // Initialize click handler in constructor
            canvas.addEventListener('click', (event) => this.handleGameOverClick(event));
            
            // Add touch handler for mobile devices - for game over buttons only
            canvas.addEventListener('touchstart', (event) => {
                // Only handle events for game over buttons
                if (this.gameOver || this.showingReviveMenu || this.showingReviveErrorScreen) {
                    event.preventDefault();
                    
                    // Check if we're on mobile or if there's an explicit mobile flag
                    const isMobileEvent = this.isMobile || 
                                         window.__FORCE_MOBILE_VIEW__ || 
                                         (typeof window.isMobile === 'boolean' && window.isMobile);
                                         
                    // Get the touch position
                    const touch = event.touches[0];
                    
                    // Create a synthetic click event to reuse the existing handler
                    const clickEvent = {
                        clientX: touch.clientX,
                        clientY: touch.clientY,
                        isMobile: isMobileEvent
                    };
                    
                    // Tag this event to distinguish from desktop events
                    clickEvent.__fromTouchEvent = true;
                    
                    // Reuse the same click handler for touch events
                    this.handleGameOverClick(clickEvent);
                }
                // Let other touch events propagate naturally for desktop controls
            }, { passive: false });
            
            this.animationId = null;
            this.loading = false;
            this.loadingProgress = 0;

            this.debugPanel = new DebugPanel(this);
            this.isGameOver = false;

            // Add transaction tracking
            this.pendingJumps = [];
            this.jumpTimestamps = [];
            window.__jumpCount = 0;
            
            console.log("🎮 Game initialized with transaction tracking");

            // Initialize game state
            this.initializeGame();

            // Always initialize the jump counter when a new game starts
            window.totalJumps = 0;
            console.log("Game created - Jump counter reset to 0");

            // Add mobile controls initialization
            this.isMobile = this.detectMobile();
            this.gyroEnabled = false;
            this.gyroData = { beta: 0 }; // For storing device tilt data
            
            // Initialize mobile controls if on mobile device
            if (this.isMobile) {
                this.initMobileControls();
            }

            // Load reload button image
            this.reloadImage = new Image();
            this.reloadImage.src = '/images/reload.png';
            this.reloadImage.onload = () => {
                console.log('Reload button image loaded successfully');
            };

            // Add object pools for performance optimization
            this.enemyPool = [];
            this.maxPoolSize = 20;
            
            // Add frame throttling for less powerful devices
            this.lastFrameTime = 0;
            this.targetFPS = 60;
            this.frameInterval = 1000 / this.targetFPS;
            
            // Pre-calculate reused values
            this.halfWidth = this.width / 2;
            this.halfHeight = this.height / 2;
            
            // Add off-screen culling boundaries
            this.cullMargin = 100; // Objects 100px off screen will be ignored for rendering

            // Add property to store player wallet address
            this.playerWalletAddress = '';  // Will be populated from parent window
            
            // Listen for wallet address update
            window.addEventListener('message', (event) => {
                if (event.data?.type === 'WALLET_ADDRESS') {
                    this.playerWalletAddress = event.data.address;
                    
                    // When we get a wallet address and a game is already in progress, 
                    // request revive reset to ensure player can use revive in this game
                    if (this.gameStart && !this.gameOver) {
                        this.requestAutomaticReviveReset();
                    }
                }
                
                // Listen for revive reset confirmation
                if (event.data?.type === 'REVIVE_RESET_RESULT') {
                    if (event.data.success) {
                        // Revive was reset successfully
                        this.hasUsedRevive = false;
                        
                        // Update reset status display if showing
                        if (this.resetAttempted) {
                            this.resetSuccess = true;
                            
                            // Redraw the screen if we're showing the error screen
                            if (this.showingReviveErrorScreen) {
                                const ctx = this.canvas.getContext('2d');
                                this.drawReviveErrorScreen(ctx);
                            }
                        }
                        
                        // If we were showing an error about needing admin reset, close it
                        if (this.showingReviveErrorScreen && this.needsAdminReset) {
                            this.showingReviveErrorScreen = false;
                            this.needsAdminReset = false;
                            
                            // Check if we were in game over state
                            if (this.isGameOver) {
                                // Show revive menu again since status has been reset
                                this.showingReviveMenu = true;
                                this.gameOver = false;
                            }
                        }
                    }
                }
                
                // Handle revive status check response
                if (event.data?.type === 'REVIVE_STATUS_RESULT') {
                    // If showing the error screen, update our UI
                    if (this.showingReviveErrorScreen && this.resetAttempted) {
                        this.resetSuccess = !event.data.hasUsedRevive;
                        
                        // If reset was successful, enable the revive option again
                        if (this.resetSuccess && this.isGameOver) {
                            setTimeout(() => {
                                this.showingReviveErrorScreen = false;
                                this.needsAdminReset = false;
                                this.showingReviveMenu = true;
                                this.gameOver = false;
                                
                                // Redraw the game
                                const ctx = this.canvas.getContext('2d');
                                this.draw(ctx);
                            }, 2000); // Give player time to see success message
                        } else {
                            // Just update the UI with the result
                            const ctx = this.canvas.getContext('2d');
                            this.drawReviveErrorScreen(ctx);
                        }
                    }
                }
            });
            
            // Generate a unique game session token
            this.generateGameSessionToken();
        }
    
        initializeGame() {
            // Add initial platforms
            this.add_platforms(0, this.height-15)
            this.add_broken_platforms(0, this.height-15)
            this.add_spring_platforms(0, this.height-15)
            this.add_platforms(-this.height, -15)
            this.add_broken_platforms(-this.height, -15)  
            this.add_spring_platforms(-this.height, -15)

            // Initialize player and background
            this.background = new Background(this)
            this.player = new Player(this)
            
            // Only create ONE input handler
            this.inputHandler = new InputHandler(this)
        }
    
        update(deltaTime = 1.0) {
            // Fixed update with consistent time step based on deltaTime parameter

            if (this.gameOver || !this.gameStart) {
                return;
            }

            // Update background with deltaTime
            this.background.update(deltaTime);
            
            // Update platforms with deltaTime - optimize loop
            const platformCount = this.platforms.length;
            for (let i = 0; i < platformCount; i++) {
                this.platforms[i].update(deltaTime);
            }
            
            // Update player with deltaTime - handle both mobile and desktop
            if (this.isMobile && this.gyroEnabled) {
                this.player.update(this.inputHandler, this.gyroData, deltaTime);
            } else {
                this.player.update(this.inputHandler, deltaTime);
            }
            
            // Update enemies with deltaTime - optimize loop
            const enemyCount = this.enemies.length;
            for (let i = 0; i < enemyCount; i++) {
                this.enemies[i].update(deltaTime);
            }

            // Remove deleted objects - this is required for game logic
            this.platforms = this.platforms.filter(platform => !platform.markedForDeletion);
            this.enemies = this.enemies.filter(enemy => {
                if (enemy.markedForDeletion) {
                    if (this.enemyPool.length < this.maxPoolSize) {
                        enemy.markedForDeletion = false;
                        this.enemyPool.push(enemy);
                    }
                    return false;
                }
                return true;
            });

            // Check game over condition
            this.checkGameOver();
            
            // Memory management - offload to less frequent intervals
            if (this._frameCount === undefined) this._frameCount = 0;
            this._frameCount++;
            
            // Only check platform count every 30 frames
            if (this._frameCount % 30 === 0 && this.platforms.length > 100) {
                this.platforms.splice(0, this.platforms.length - 100);
            }
        }
    
        draw(context) {
            // Always draw background
            this.background.draw(context);

            if (this.loading) {
                this.drawLoadingScreen(context);
                return;
            }

            if (!this.gameStart) {
                // Draw start screen
                this.drawStartButton(context);
                return;
            }

            // Only draw visible platforms with culling
            const viewport = {top: -this.cullMargin, bottom: this.height + this.cullMargin};
            const platformCount = this.platforms.length;
            for (let i = 0; i < platformCount; i++) {
                const platform = this.platforms[i];
                // Only draw platforms that are on or near the screen
                if (platform.y < viewport.bottom && platform.y + platform.height > viewport.top) {
                    platform.draw(context);
                }
            }
            
            this.player.draw(context);
            
            // Only draw visible enemies with culling
            const enemyCount = this.enemies.length;
            for (let i = 0; i < enemyCount; i++) {
                const enemy = this.enemies[i];
                // Only draw enemies that are on or near the screen
                if (enemy.y < viewport.bottom && enemy.y + enemy.height > viewport.top) {
                    enemy.draw(context);
                }
            }

            // Use cached text settings for consistent performance
            if (!this.scoreTextFormat) {
                this.scoreTextFormat = {
                    style: "black",
                    font: '24px Bangers, cursive',
                    align: 'start'
                };
            }
            
            // Draw score with cached text settings
            context.fillStyle = this.scoreTextFormat.style;
            context.font = this.scoreTextFormat.font;
            context.textAlign = this.scoreTextFormat.align;
            context.fillText(`Score: ${Math.floor(this.score)}`, 20, 25);
            
            // Draw jumps counter on the right side
            context.textAlign = 'end';
            context.fillText(`Jumps: ${window.__jumpCount || 0}`, this.width - 20, 25);
            // Reset text alignment
            context.textAlign = this.scoreTextFormat.align;

            // Draw debug panel
            if (this.debugPanel && typeof this.debugPanel.draw === 'function') {
                this.debugPanel.draw(context);
            }

            // Check if a direct purchase is in progress
            if (this.directPurchaseInProgress) {
                this.drawDirectPurchaseLoading(context);
                return;
            }

            // Draw revive error screen if needed
            if (this.showingReviveErrorScreen) {
                this.drawReviveErrorScreen(context);
            }
            // Draw revive menu if needed
            else if (this.showingReviveMenu) {
                this.drawReviveMenu(context);
            }
            // Draw game over screen if needed
            else if (this.gameOver) {
                this.drawGameOverScreen(context);
            }
        }

        add_enemy() {
            // Play virus sound first (3 seconds before enemy appears)
            try {
                if (window.audioManager && typeof window.audioManager.play === 'function') {
                    window.audioManager.play('virus', 0.7);
            } else {
                    // Fallback to direct Audio API
                    const virusSound = new Audio('sound effects/virus.mp3');
                    virusSound.volume = 0.7;
                    virusSound.play().catch(e => console.log("Error playing virus sound:", e));
                }
            } catch (e) {
                console.error("Error playing virus sound:", e);
            }
            
            // Delay the actual virus creation by 3 seconds
            setTimeout(() => {
                // Use object pooling for enemies
                if (this.enemyPool.length > 0) {
                    const enemy = this.enemyPool.pop();
                    // Reset enemy position and state
                    enemy.x = Math.random() * (this.width - 60);
                    enemy.y = -200; // Place further above the screen
                    enemy.speedY = 1.5; // Set downward speed
                    enemy.soundPlayed = true; // No need to play sound again
                    enemy.reachedPosition = false; // Reset position reached flag
                    this.enemies.push(enemy);
                } else {
                    // Create new enemy if pool is empty
                    const newEnemy = new Enemy(this);
                    this.enemies.push(newEnemy);
                }
            }, 3000); // 3 seconds delay
        }

        add_platforms(lowerY, upperY) {
            const platformHeight = 30; // INCREASED FROM ORIGINAL VALUE
            
            do{
                let type = 'green'
                if(Math.random() < (this.blue_white_platform_chance/100)){
                    type = (Math.random() < 0.5)  ? 'blue' : 'white'
                }
                
                // Small chance of adding a spring platform instead
                if(Math.random() < 0.08) { // 8% chance for spring platform
                    type = 'spring';
                }
                
                this.platforms.unshift(new Platform(this, lowerY, upperY, type))
            }
            while(this.platforms[0].y >= lowerY)
        }

        add_broken_platforms(lowerY, upperY) {
            let num = Math.floor(Math.random() * (5 - 0 + 1)) + 0

            for(let i=0; i<num; i++){
                this.platforms.push(new Platform(this, lowerY, upperY, 'brown'))
            }
        }
        
        // Add spring platforms randomly
        add_spring_platforms(lowerY, upperY) {
            // Add 1-2 spring platforms in this section
            let num = Math.floor(Math.random() * 2) + 1;
            
            for(let i=0; i<num; i++){
                this.platforms.push(new Platform(this, lowerY, upperY, 'spring'))
            }
        }

        change_difficulty() {
            this.level++
            if(this.platform_max_gap > this.platform_gap){
                this.platform_gap += 5
            }
            if(this.blue_white_platform_max_chance > this.blue_white_platform_chance){
                this.blue_white_platform_chance += 1
            }
            if(this.level%8 == 0 && this.object_max_vx > this.object_vx){
                this.object_vx++
            }
            if(this.level%5 == 0 && this.enemyMaxChance > this.enemyChance){
                this.enemyChance += 5
            }
        }

        gameOver() {
            // Make sure we only process this once
            if (this.isGameOver) return;
            
            this.gameOver = true;
            this.isGameOver = true;
            
            // Get the final jump count from either the window counter or local counter
            this.finalJumpCount = window.__jumpCount || window.totalJumps || 0;
            
            console.log(`Game over with ${this.finalJumpCount} jumps and score: ${this.score}`);
            
            // Track the death reason if not already set (default to fall)
            if (!this.deathReason) {
                this.deathReason = "fall";
            }
            
            // Create a final game token with score included only at game over time
            let finalToken = null;
            
            try {
                if (this.sessionToken) {
                    // Clone the session token and add final score
                    finalToken = {
                        ...this.sessionToken,
                        finalScore: this.score,
                        finalJumps: this.finalJumpCount,
                        finishTime: Date.now()
                    };
                } else {
                    // If session token is missing, create a fallback token
                    console.warn("Session token missing at game over, creating fallback");
                    finalToken = {
                        token: Math.random().toString(36).substring(2) + Date.now().toString(36),
                        timestamp: Date.now(),
                        gameId: this.gameId,
                        playerAddress: this.playerWalletAddress || '',
                        finalScore: this.score,
                        finalJumps: this.finalJumpCount,
                        finishTime: Date.now(),
                        fallback: true
                    };
                }
            } catch (tokenError) {
                console.error("Error creating game over token:", tokenError);
                // Last resort fallback
                finalToken = {
                    token: "fallback_" + Date.now(),
                    gameId: this.gameId,
                    finalScore: this.score,
                    finalJumps: this.finalJumpCount,
                    timestamp: Date.now(),
                    fallback: true
                };
            }
            
            // Create string representation for transmission
            let tokenString = "";
            try {
                tokenString = JSON.stringify(finalToken);
            } catch (jsonError) {
                console.error("Error stringifying token:", jsonError);
                // Create a simpler token as absolute last resort
                tokenString = JSON.stringify({
                    token: "emergency_" + Date.now(),
                    score: this.score,
                    timestamp: Date.now(),
                    gameId: this.gameId
                });
            }
            
            // Store token in global memory for access outside iframe
            try {
                window.__GAME_SECURE_TOKEN = finalToken;
            } catch (globalError) {
                console.warn("Could not store token in window object");
            }
            
            // Send a message to the parent window with the final score and jump count
            sendMessageToParent({
                type: 'gameOver',
                score: this.score,
                jumps: this.finalJumpCount,
                gameId: this.gameId,
                sessionToken: tokenString,
                deathReason: this.deathReason,
                reviveCancelled: !!this.reviveCancelled,
                hasUsedRevive: !!this.hasUsedRevive,
                timestamp: Date.now(),
                highScore: true // Always mark as potential high score to be checked by parent
            });
            
            // Invalidate the current token after use
            this.sessionToken = null;
        }

        drawButton(button) {
            ctx.fillStyle = '#ff6b6b';
            ctx.strokeStyle = '#ff5252';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(button.x, button.y, button.width, button.height, 25);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(button.text, button.x + button.width/2, button.y + button.height/2);
        }

        handleGameOverClick(event) {
            if (!this.gameOver && !this.showingReviveMenu && !this.showingReviveErrorScreen) return;

            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (event.clientX - rect.left) * scaleX;
            const y = (event.clientY - rect.top) * scaleY;

            // Handle revive error screen buttons
            if (this.showingReviveErrorScreen) {
                // Handle admin reset button click
                if (this.needsAdminReset && this.adminResetButton &&
                    x >= this.adminResetButton.x && x <= this.adminResetButton.x + this.adminResetButton.width &&
                    y >= this.adminResetButton.y && y <= this.adminResetButton.y + this.adminResetButton.height) {
                    
                    if (!this.adminResetRequested) {
                        this.requestAdminReset();
                        return;
                    }
                }
                
                // Handle manual reset button click
                if (this.needsAdminReset && this.manualResetButton &&
                    x >= this.manualResetButton.x && x <= this.manualResetButton.x + this.manualResetButton.width &&
                    y >= this.manualResetButton.y && y <= this.manualResetButton.y + this.manualResetButton.height) {
                    
                    this.tryManualReset();
                    return;
                }
                
                // Handle continue button click
                if (this.continueButton &&
                    x >= this.continueButton.x && x <= this.continueButton.x + this.continueButton.width &&
                    y >= this.continueButton.y && y <= this.continueButton.y + this.continueButton.height) {
                    
                    // Close the error screen and show game over
                    this.showingReviveErrorScreen = false;
                    this.gameOver = true;
                    return;
                }
                
                return;
            }

            if (this.showingReviveMenu) {
                // Handle revive menu buttons
                const buyRevive = this.reviveButtons.buyRevive;
                const cancel = this.reviveButtons.cancel;
                
                if (x >= buyRevive.x && x <= buyRevive.x + buyRevive.width &&
                    y >= buyRevive.y && y <= buyRevive.y + buyRevive.height) {
                    this.purchaseRevive();
                    return;
                }
                
                if (x >= cancel.x && x <= cancel.x + cancel.width &&
                    y >= cancel.y && y <= cancel.y + cancel.height) {
                    // First, mark that we're cancelling to prevent any transactions
                    this.reviveCancelled = true;
                    this.showingReviveMenu = false;
                    this.gameOver = true; // Proceed to game over
                    
                    // Calculate the final jump count
                    const finalJumpCount = window.__jumpCount || 0;
                    
                    // Send a message to parent window about revive being cancelled
                    // Include the jump count to ensure it gets recorded
                    sendMessageToParent({
                        type: 'REVIVE_CANCELLED',
                        gameId: this.gameId,
                        timestamp: Date.now(),
                        jumps: finalJumpCount,
                        score: this.score,
                        shouldRecordJumps: true,
                        shouldSaveHighScore: true, // Flag to indicate this score should be considered for high score
                    });
                    
                    // Send the gameOver message to ensure jump transactions are processed
                    sendMessageToParent({
                        type: 'gameOver',
                        score: this.score,
                        jumps: finalJumpCount,
                        gameId: this.gameId,
                        deathReason: this.deathReason || "fall",
                        reviveCancelled: true,
                        hasUsedRevive: false,
                        timestamp: Date.now(),
                        highScore: true // Mark as potential high score
                    });
                    
                    return;
                }
                
                return;
            }

            // Handle game over buttons if not showing revive menu
            const tryAgain = this.gameOverButtons.tryAgain;
            if (x >= tryAgain.x && x <= tryAgain.x + tryAgain.width &&
                y >= tryAgain.y && y <= tryAgain.y + tryAgain.height) {
                
                // Send special message to parent window
                sendMessageToParent({
                        type: 'GAME_RELOAD_CLICKED',
                        timestamp: Date.now()
                });
                
                this.reset();
                return;
            }
        }

        reset() {
            // Generate a new game ID for this session
            this.gameId = Date.now().toString();
            
            // Reset game state without stopping animation
            this.gameOver = false;
            this.gameStart = true;
            this.score = 0;
            this.level = 0;
            this.enemyChance = 0;
            this.object_vx = 3;
            this.platform_gap = 100;
            this.blue_white_platform_chance = 0;
            this.deathReason = null; // Reset death reason
            this.hasUsedRevive = false; // Reset revive flag
            this.showingReviveMenu = false; // Reset revive menu flag
            this.showingReviveErrorScreen = false; // Reset error screen flag
            this.needsAdminReset = false; // Reset admin reset flag
            this.adminResetRequested = false; // Reset admin reset request flag
            
            // IMPORTANT: Reset ALL jump counters
            window.__jumpCount = 0;
            window.totalJumps = 0;
            this.finalJumpCount = 0;
            this.isGameOver = false;
            
            // Clear existing entities
            this.platforms = [];
            this.enemies = [];
            
            // Reset player position - position in the upper 30% of the screen
            this.player.x = this.width / 2 - this.player.width / 2;
            this.player.y = this.height * 0.3 - this.player.height;
            this.player.vy = this.player.min_vy;
            this.player.vx = 0;
            this.player.bullets = [];
            
            // Reset the player's jumped platforms set
            if (this.player.jumpedPlatforms) {
                this.player.jumpedPlatforms.clear();
            }
            
            // Add initial platforms
            this.add_platforms(0, this.height-15);
            this.add_broken_platforms(0, this.height-15);
            this.add_platforms(-this.height, -15);
            this.add_broken_platforms(-this.height, -15);

            // Reset transaction tracking
            this.pendingJumps = [];
            this.jumpTimestamps = [];

            // Reset the jump count sent flag
            this.jumpCountSent = false;
            
            // Notify parent that a new game has started (for UI updates only)
            sendMessageToParent({
                type: 'NEW_GAME_STARTED',
                gameId: this.gameId
            });
        }

        // Add a new method to automatically request revive reset
        requestAutomaticReviveReset() {
            // Just track this locally, don't send blockchain messages
            this.hasUsedRevive = false;
            console.log("Automatic reset of revive status requested (local only)");
        }

        animate() {
            // Use requestAnimationFrame with proper deltaTime calculation
            let lastTime = performance.now();
            
            const gameLoop = (timestamp) => {
                // Calculate the delta time in seconds
                const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.05); // Cap at 50ms (20fps)
                lastTime = timestamp;
                
                // Skip frame if delta is too small (improves performance on high refresh displays)
                if (deltaTime < 0.004) { // Skip frames faster than ~250fps
                    requestAnimationFrame(gameLoop);
                    return;
                }
                
                // Only update if game is active
                if (this.gameStart && !this.gameOver) {
                    try {
                        this.update(deltaTime);
                    } catch (e) {
                        // Silent catch without logging to avoid perf issues
                    }
                }
                
                // Draw everything
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            this.draw(ctx);
                
                // Continue the loop
                this.animationId = requestAnimationFrame(gameLoop);
            };
            
            // Start the animation loop
            this.animationId = requestAnimationFrame(gameLoop);
        }

        drawLoadingScreen(context) {
            // Semi-transparent background
            context.fillStyle = 'rgba(0, 0, 0, 0.7)';
            context.fillRect(0, 0, this.width, this.height);
            
            // Loading text
            context.fillStyle = 'white';
            context.font = '32px Arial';
            context.textAlign = 'center';
            context.fillText('Loading...', this.width/2, this.height/2 - 50);
            
            // Loading bar background
            context.fillStyle = '#333';
            const barWidth = 300;
            const barHeight = 20;
            context.fillRect(
                this.width/2 - barWidth/2,
                this.height/2 - barHeight/2,
                barWidth,
                barHeight
            );
            
            // Loading bar progress
            context.fillStyle = '#4CAF50';
            context.fillRect(
                this.width/2 - barWidth/2,
                this.height/2 - barHeight/2,
                barWidth * (this.loadingProgress / 100),
                barHeight
            );
        }

        startLoading() {
            this.loading = true;
            this.loadingProgress = 0;
            this.simulateLoading();
        }

        simulateLoading() {
            if (this.loadingProgress < 100) {
                this.loadingProgress += 2;
                setTimeout(() => {
                    this.simulateLoading();
                }, 50);
            } else {
                this.loading = false;
                this.reset();
            }
        }

        drawGameOverScreen() {
            // Use the correct context reference
            const ctx = this.canvas.getContext('2d');
            
            // Semi-transparent background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Game Over text with Bangers font
            ctx.fillStyle = 'white';
            ctx.font = '65px Bangers, cursive';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 80);
            
            // Cause of death with orange text
            ctx.fillStyle = '#FFA500';
            ctx.font = '30px Bangers, cursive';
            
            // Get death message from the deathReason property
            let deathMessage = "BAD LUCK!";
            if (this.deathReason === "collision") {
                deathMessage = "KILLED BY MONSTER";
            } else if (this.deathReason === "fall") {
                deathMessage = "DEATH BY FALLING";
            }
            
            ctx.fillText(deathMessage, this.canvas.width / 2, this.canvas.height / 2 - 40);
            
            // Score label in white (centered)
            ctx.fillStyle = 'white';
            ctx.font = '38px Bangers, cursive';
            ctx.fillText('SCORE', this.canvas.width / 2, this.canvas.height / 2 + 10);
            
            // Score value in red BELOW the label
            ctx.fillStyle = 'red';
            ctx.font = '50px Bangers, cursive'; // Slightly larger font for the number
            ctx.fillText(Math.floor(this.score).toString(), this.canvas.width / 2, this.canvas.height / 2 + 50);
            
            // Jumps label in white (centered)
            ctx.fillStyle = 'white';
            ctx.font = '38px Bangers, cursive';
            ctx.fillText('JUMPS', this.canvas.width / 2, this.canvas.height / 2 + 90);
            
            // Jumps value in red BELOW the label
            ctx.fillStyle = 'red';
            ctx.font = '50px Bangers, cursive'; // Slightly larger font for the number
            const jumpCount = (this.finalJumpCount || window.__jumpCount || window.totalJumps || 0).toString();
            ctx.fillText(jumpCount, this.canvas.width / 2, this.canvas.height / 2 + 130);
            
            // Transaction message
            ctx.fillStyle = '#ede4ca';
            ctx.font = '16px Arial, cursive';
            ctx.fillText('Approve transaction in your wallet and continue to play', this.canvas.width / 2, this.canvas.height / 2 + 170);
            
            // Draw reload button
            const tryAgain = this.gameOverButtons.tryAgain;
            if (this.reloadImage && this.reloadImage.complete) {
                ctx.drawImage(this.reloadImage, tryAgain.x, tryAgain.y, tryAgain.width, tryAgain.height);
            } else {
                // Fallback if image isn't loaded
                ctx.fillStyle = '#ff6b6b';
                ctx.beginPath();
                ctx.arc(tryAgain.x + tryAgain.width/2, tryAgain.y + tryAgain.height/2, tryAgain.width/2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        drawBubblePanel(ctx, x, y, width, height) {
            const radius = 30;
            const triangleSize = 15;
            
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            
            // Draw pointer on the left side
            ctx.lineTo(x + width/4 + triangleSize, y + height);
            ctx.lineTo(x + width/4, y + height + triangleSize);
            ctx.lineTo(x + width/4 - triangleSize, y + height);
            
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
            ctx.fill();
            
            // Add stroke
            ctx.strokeStyle = '#E0E0E0';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        drawWavyBanner(ctx, x, y, width, height) {
            const waveHeight = 10;
            const segments = 12;
            const segmentWidth = width / segments;
            
            ctx.beginPath();
            ctx.moveTo(x, y + waveHeight);
            
            // Top wavy edge
            for (let i = 0; i < segments; i++) {
                const curveX = x + (i + 0.5) * segmentWidth;
                const curveY = y + (i % 2 === 0 ? 0 : waveHeight * 2);
                const endX = x + (i + 1) * segmentWidth;
                const endY = y + waveHeight;
                ctx.quadraticCurveTo(curveX, curveY, endX, endY);
            }
            
            // Right side
            ctx.lineTo(x + width, y + height - waveHeight);
            
            // Bottom wavy edge
            for (let i = segments; i > 0; i--) {
                const curveX = x + (i - 0.5) * segmentWidth;
                const curveY = y + height - (i % 2 === 0 ? 0 : waveHeight * 2);
                const endX = x + (i - 1) * segmentWidth;
                const endY = y + height - waveHeight;
                ctx.quadraticCurveTo(curveX, curveY, endX, endY);
            }
            
            // Left side
            ctx.lineTo(x, y + waveHeight);
            ctx.closePath();
            ctx.fill();
        }

        setCartoonFont(ctx, size) {
            ctx.font = `bold ${size}px "Comic Sans MS", "Chalkboard SE", "Marker Felt", cursive`;
        }

        drawStar(ctx, cx, cy, outerRadius, points, innerRatio) {
            ctx.beginPath();
            ctx.fillStyle = 'rgba(255, 255, 100, 0.8)';
            
            for (let i = 0; i < points * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : outerRadius * innerRatio;
                const angle = (Math.PI * 2) * (i / (points * 2)) - Math.PI/2;
                const x = cx + Math.cos(angle) * radius;
                const y = cy + Math.sin(angle) * radius;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            ctx.closePath();
            ctx.fill();
        }

        drawPopText(ctx, text, x, y) {
            // Text shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.fillText(text, x + 3, y + 3);
            
            // Main text
            ctx.fillStyle = '#FF5A5F';
            ctx.fillText(text, x, y);
            
            // Highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillText(text, x - 2, y - 2);
        }

        drawWavyLine(ctx, x, y, width, amplitude, color) {
            const segments = 20;
            const segmentWidth = width / segments;
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            
            for (let i = 0; i < segments; i++) {
                const curveX = x + (i + 0.5) * segmentWidth;
                const curveY = y + (i % 2 === 0 ? -amplitude : amplitude);
                const endX = x + (i + 1) * segmentWidth;
                const endY = y;
                ctx.quadraticCurveTo(curveX, curveY, endX, endY);
            }
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        drawSpeechBubble(ctx, x, y, width, height) {
            const radius = 15;
            const triangleSize = 15;
            
            // Draw rounded rectangle
            ctx.fillStyle = '#FFEB3B'; // Yellow for visibility
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            
            // Draw pointer on the left side
            ctx.lineTo(x + width/4 + triangleSize, y + height);
            ctx.lineTo(x + width/4, y + height + triangleSize);
            ctx.lineTo(x + width/4 - triangleSize, y + height);
            
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
            ctx.fill();
            
            // Add stroke
            ctx.strokeStyle = '#E0E0E0';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        drawBouncyButton(ctx, x, y, width, height) {
            // Draw main button body
            const radius = 20;
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
            ctx.fill();
            
            // Add highlight at top
            const gradientHeight = height * 0.4;
            const gradient = ctx.createLinearGradient(0, y, 0, y + gradientHeight);
            gradient.addColorStop(0, 'rgba(255,255,255,0.4)');
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + gradientHeight);
            ctx.lineTo(x, y + gradientHeight);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
            ctx.fill();
        }

        restartGame() {
            console.log('RESTART GAME called - resetting everything');
            
            // Reset all game state
            this.isGameOver = false;
            this.gameOver = false;
            
            // Reset score and counters
            this.score = 0;
            window.totalJumps = 0;
            window.__jumpCount = 0;
            
            // Reset player position - place in upper 30% of screen
            this.player.y = this.height * 0.3 - this.player.height;
            this.player.x = this.width / 2 - this.player.width / 2;
            
            // Clear all platforms
            this.platforms = [];
            
            // Add new platforms
            this.add_platforms(0, this.height-15);
            this.add_broken_platforms(0, this.height-15);
            this.add_platforms(-this.height, -15);
            this.add_broken_platforms(-this.height, -15);
            
            // Clear enemies
            this.enemies = [];
            
            // Set game to running state directly
            this.gameStart = true;
            
            console.log('Game fully reset, starting new game');
        }

        checkGameOver() {
            if ((this.player.y > this.canvas.height || this.player.collision()) && !this.isGameOver) {
                // Determine the death reason
                if (this.player.collision()) {
                    this.deathReason = "collision";
                    
                    // Play collision sound
                    try {
                        if (window.audioManager && typeof window.audioManager.play === 'function') {
                            window.audioManager.play('collision', 0.7);
                        }
                    } catch(e) {
                        // Silent fail
                    }
                } else if (this.player.y > this.canvas.height) {
                    this.deathReason = "fall";
                    
                    // Play fall sound
                    try {
                        if (window.audioManager && typeof window.audioManager.play === 'function') {
                            window.audioManager.play('fall', 0.7);
                        }
                    } catch(e) {
                        // Silent fail
                    }
                } else {
                    this.deathReason = "unknown";
                }

                // Get final score and jump count
                const finalScore = Math.floor(this.score);
                const jumpCount = window.__jumpCount || 0;
                
                // Set game over state first
                this.isGameOver = true;
                
                // Check if player can use a revive (only available once per game)
                // First use our internal check to avoid blockchain calls if we know it's been used
                if (!this.checkReviveUsage()) {
                    this.showingReviveMenu = true;
                    
                    // Play revive offer sound if available
                    try {
                        if (window.audioManager && typeof window.audioManager.play === 'function') {
                            window.audioManager.play('powerUp', 0.5);
                        }
                    } catch(e) {
                        // Silent fail
                    }
                    
                    return true;
                }
                
                // If player has already used a revive or doesn't want to use one, proceed to game over
                this.gameOver = true;
                
                // Store the fact that we sent the game over message
                this.gameOverMessageSent = true;
                
                // Play game over sound
                try {
                    if (window.audioManager && typeof window.audioManager.play === 'function') {
                        window.audioManager.play('gameOver', 0.7);
                    }
                } catch(e) {
                    // Silent fail
                }
                
                // Send game over message
                try {
                    // Use a unique ID to prevent duplicate transactions
                    const gameOverId = Date.now().toString();
                    
                    // Send a single message with a transaction flag
                    sendMessageToParent({
                        type: 'GAME_OVER',
                        transactionRequired: true,
                        gameOverId: gameOverId,
                            data: {
                                score: finalScore,
                                jumpCount: jumpCount,
                            finalScore: finalScore,
                            jumps: jumpCount,
                                timestamp: Date.now(),
                            reason: this.deathReason,
                            saveId: gameOverId
                            }
                    });
                    } catch (error) {
                    // Silent fail
                }
                
                return true;
            }
            return false;
        }

        startGame() {
            if (!this.gameStart) {
                // Generate a new game ID for this session
                this.gameId = Date.now().toString();
                
                window.totalJumps = 0; // Reset jump counter using window variable
                this.gameStart = true;
                this.gameOver = false;
                this.isGameOver = false;
                this.score = 0;
                this.hasUsedRevive = false; // Ensure revive is reset
                this.showingReviveErrorScreen = false; // Reset error screen
                this.needsAdminReset = false; // Reset admin reset flag
                this.adminResetRequested = false; // Reset admin reset request flag
                
                // Notify parent that a new game has started (for UI updates only, not blockchain)
                sendMessageToParent({
                    type: 'NEW_GAME_STARTED',
                    gameId: this.gameId
                });
                
                // Play background music when game starts
                if (window.audioManager) {
                    window.audioManager.playBackgroundMusic();
                } else {
                    // Fallback if audioManager is not available
                    const bgMusic = document.getElementById('bg-music');
                    if (bgMusic) {
                        bgMusic.play().catch(err => {
                            // Silent fail
                        });
                    }
                }
            }
        }
 

        drawStartButton(context) {
            // Hide the canvas initially
            this.canvas.style.display = 'none';
            
            // Show the start screen
            const startScreen = document.getElementById('startScreen');
            startScreen.style.display = 'block';
            
            // Create or update loading bar immediately
            let loadingBar = document.getElementById('playButtonLoadingBar');
            if (!loadingBar) {
                // Create container for loading elements
                const loadingContainer = document.createElement('div');
                loadingContainer.id = 'playButtonLoadingContainer';
                loadingContainer.style.display = 'flex';
                loadingContainer.style.flexDirection = 'column';
                loadingContainer.style.alignItems = 'center';
                loadingContainer.style.marginTop = '30px';
                loadingContainer.style.width = '100%';
                
                // Loading text with animated dots
                const loadingText = document.createElement('div');
                loadingText.id = 'loadingText';
                loadingText.innerHTML = 'Preparing to Jump';
                loadingText.style.color = 'white';
                loadingText.style.fontSize = '22px';
                loadingText.style.fontFamily = '"Bangers", cursive';
                loadingText.style.marginBottom = '15px';
                loadingText.style.textShadow = '0 2px 4px rgba(0,0,0,0.5), 0 0 10px rgba(255,255,255,0.2)';
                
                // Create outer loading bar container with improved styling
                const loadingBarContainer = document.createElement('div');
                loadingBarContainer.style.width = '280px';
                loadingBarContainer.style.height = '24px';
                loadingBarContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                loadingBarContainer.style.borderRadius = '12px';
                loadingBarContainer.style.overflow = 'hidden';
                loadingBarContainer.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 0 6px rgba(0, 0, 0, 0.3)';
                loadingBarContainer.style.border = '2px solid rgba(255, 255, 255, 0.4)';
                loadingBarContainer.style.position = 'relative';
                
                // Create inner loading bar with gradient and glow effect
                loadingBar = document.createElement('div');
                loadingBar.id = 'playButtonLoadingBar';
                loadingBar.style.width = '0%';
                loadingBar.style.height = '100%';
                loadingBar.style.background = 'linear-gradient(to right, #ff9a9e, #ff6b6b)';
                loadingBar.style.borderRadius = '10px';
                loadingBar.style.transition = 'width 0.5s cubic-bezier(0.33, 1, 0.68, 1)';
                loadingBar.style.boxShadow = '0 0 10px rgba(255, 107, 107, 0.7)';
                loadingBar.style.position = 'relative';
                loadingBar.style.zIndex = '1';
                
                // Add shimmering effect overlay
                const shimmer = document.createElement('div');
                shimmer.style.position = 'absolute';
                shimmer.style.top = '0';
                shimmer.style.left = '-100%';
                shimmer.style.width = '100%';
                shimmer.style.height = '100%';
                shimmer.style.background = 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%)';
                shimmer.style.zIndex = '2';
                shimmer.style.animation = 'shimmer 1.5s infinite';
                loadingBar.appendChild(shimmer);
                
                // Add tiny dot particles that move with the loading bar
                for (let i = 0; i < 5; i++) {
                    const particle = document.createElement('div');
                    particle.style.position = 'absolute';
                    particle.style.width = '4px';
                    particle.style.height = '4px';
                    particle.style.borderRadius = '50%';
                    particle.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                    particle.style.top = `${Math.random() * 100}%`;
                    particle.style.left = `${Math.random() * 100}%`;
                    particle.style.zIndex = '3';
                    particle.style.animation = `float ${1 + Math.random()}s infinite ease-in-out alternate`;
                    loadingBar.appendChild(particle);
                }
                
                // Add animated dots to loading text
                const dotsContainer = document.createElement('span');
                dotsContainer.id = 'loadingDots';
                dotsContainer.innerHTML = '.';
                dotsContainer.style.animation = 'loadingDots 1.5s infinite';
                loadingText.appendChild(dotsContainer);
                
                // Add keyframes animations for all the effects
                const style = document.createElement('style');
                style.textContent = `
                    @keyframes shimmer {
                        0% { transform: translateX(0%); }
                        100% { transform: translateX(200%); }
                    }
                    
                    @keyframes float {
                        0% { transform: translateY(0px); }
                        100% { transform: translateY(5px); }
                    }
                    
                    @keyframes loadingDots {
                        0% { content: '.'; }
                        33% { content: '..'; }
                        66% { content: '...'; }
                        100% { content: '.'; }
                    }
                    
                    @keyframes loadingBarProgress {
                        0% { width: 0%; }
                        15% { width: 10%; }
                        25% { width: 20%; }
                        50% { width: 50%; }
                        75% { width: 75%; }
                        90% { width: 90%; }
                        100% { width: 100%; }
                    }
                    
                    @keyframes pulseGlow {
                        0% { box-shadow: 0 0 10px rgba(255, 107, 107, 0.7); }
                        50% { box-shadow: 0 0 20px rgba(255, 107, 107, 0.9), 0 0 30px rgba(255, 107, 107, 0.5); }
                        100% { box-shadow: 0 0 10px rgba(255, 107, 107, 0.7); }
                    }
                    
                    @keyframes playButtonPulse {
                        0% { transform: scale(1); box-shadow: 0 8px 0 rgba(220, 50, 50, 0.5), 0 12px 20px rgba(0, 0, 0, 0.2); }
                        50% { transform: scale(1.05); box-shadow: 0 12px 0 rgba(220, 50, 50, 0.4), 0 16px 25px rgba(0, 0, 0, 0.3); }
                        100% { transform: scale(1); box-shadow: 0 8px 0 rgba(220, 50, 50, 0.5), 0 12px 20px rgba(0, 0, 0, 0.2); }
                    }
                    
                    #loadingDots::after {
                        content: '';
                        animation: loadingDots 1.5s infinite;
                    }
                `;
                document.head.appendChild(style);
                
                // Assemble the loading bar
                loadingBarContainer.appendChild(loadingBar);
                loadingContainer.appendChild(loadingText);
                loadingContainer.appendChild(loadingBarContainer);
                startScreen.appendChild(loadingContainer);
                
                // Animate the loading bar with easing
                setTimeout(() => {
                    if (loadingBar) {
                        loadingBar.style.animation = 'loadingBarProgress 2s cubic-bezier(0.33, 1, 0.68, 1) forwards, pulseGlow 1.5s infinite';
                    }
                }, 50);
            }
            
            // Check if play button already exists
            let playButton = document.getElementById('playButton');
            
            // Only create button if it doesn't exist
            if (!playButton) {
                // Create the play button but keep it hidden initially
                playButton = document.createElement('button');
                playButton.id = 'playButton';
                playButton.textContent = 'PLAY!';
                
                // Create game controls guide
                const controlsGuide = document.createElement('div');
                controlsGuide.id = 'controlsGuide';
                controlsGuide.innerHTML = 
                    '<img src="/images/arrow.png" alt="Left/Right Arrows" style="height: 30px; vertical-align: middle; margin-right: 10px;"> MOVE | ' + 
                    '<img src="/images/spacebar.png" alt="Spacebar" style="height: 30px; vertical-align: middle; margin: 0 10px;"> SHOOT';
                controlsGuide.style.fontFamily = '"Bangers", cursive';
                controlsGuide.style.fontSize = '18px';
                controlsGuide.style.color = 'white';
                controlsGuide.style.textAlign = 'center';
                controlsGuide.style.marginTop = '60px';
                controlsGuide.style.textShadow = '0 1px 3px rgba(0, 0, 0, 0.5)';
                controlsGuide.style.opacity = '0';
                controlsGuide.style.display = 'flex';
                controlsGuide.style.alignItems = 'center';
                controlsGuide.style.justifyContent = 'center';
                controlsGuide.style.gap = '10px';
                controlsGuide.style.letterSpacing = '1px';
                
                // Add controls visual guide image
                const controlsImage = document.createElement('img');
                controlsImage.src = '/images/guide.png';
                controlsImage.alt = 'Keyboard Controls Guide';
                controlsImage.style.maxWidth = '150px';
                controlsImage.style.margin = '15px auto';
                controlsImage.style.display = 'block';
                controlsImage.style.opacity = '0';
                controlsImage.style.transition = 'opacity 0.8s ease';
                
                playButton.style.display = 'none'; // Initially hidden
                playButton.style.opacity = '0';
                playButton.style.fontSize = '32px';
                playButton.style.fontFamily = '"Bangers", cursive';
                playButton.style.padding = '15px 50px';
                playButton.style.width = '200px';
                
                // Modern button styling
                playButton.style.background = 'linear-gradient(to bottom, #ff6b6b, #ff5252)';
                playButton.style.color = 'white';
                playButton.style.border = 'none';
                playButton.style.borderRadius = '30px';
                playButton.style.marginTop = '30px';
                playButton.style.cursor = 'pointer';
                playButton.style.position = 'relative';
                playButton.style.boxShadow = '0 8px 0 rgba(220, 50, 50, 0.5), 0 12px 20px rgba(0, 0, 0, 0.2)';
                playButton.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
                playButton.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                playButton.style.animation = 'playButtonPulse 1.5s infinite';
                
                // Add hover effect
                playButton.onmouseover = () => {
                    playButton.style.background = 'linear-gradient(to bottom, #ff5252, #ff3838)';
                    playButton.style.transform = 'translateY(-2px)';
                    playButton.style.boxShadow = '0 10px 0 rgba(220, 50, 50, 0.5), 0 15px 25px rgba(0, 0, 0, 0.25)';
                };
                
                playButton.onmouseout = () => {
                    playButton.style.background = 'linear-gradient(to bottom, #ff6b6b, #ff5252)';
                    playButton.style.transform = 'translateY(0)';
                playButton.style.boxShadow = '0 8px 0 rgba(220, 50, 50, 0.5), 0 12px 20px rgba(0, 0, 0, 0.2)';
                };
                
                // Active state
                playButton.onmousedown = () => {
                    playButton.style.transform = 'translateY(4px)';
                    playButton.style.boxShadow = '0 4px 0 rgba(220, 50, 50, 0.5), 0 8px 10px rgba(0, 0, 0, 0.2)';
                };
                
                playButton.onmouseup = () => {
                    playButton.style.transform = 'translateY(-2px)';
                    playButton.style.boxShadow = '0 10px 0 rgba(220, 50, 50, 0.5), 0 15px 25px rgba(0, 0, 0, 0.25)';
                };
                
                startScreen.appendChild(playButton);
                startScreen.appendChild(controlsGuide); // Add guide below button
                startScreen.appendChild(controlsImage); // Add image below guide
                
                // Add click handler
                playButton.onclick = () => {
                    // Hide the start screen
                    startScreen.style.display = 'none';
                    
                    // Show the canvas
                    this.canvas.style.display = 'block';
                    
                    // Start the game
                    this.startGame();
                };
                
                // Show the play button after 2 seconds (when loading animation finishes)
                setTimeout(() => {
                    // Hide loading container
                    const loadingContainer = document.getElementById('playButtonLoadingContainer');
                    if (loadingContainer) {
                        loadingContainer.style.opacity = '1';
                        loadingContainer.style.transition = 'opacity 0.5s ease';
                        loadingContainer.style.opacity = '0';
                        
                        setTimeout(() => {
                            loadingContainer.style.display = 'none';
                        }, 500);
                    }
                    
                    // Show play button with fade-in effect
                    playButton.style.display = 'block';
                    playButton.style.opacity = '0';
                    setTimeout(() => {
                        playButton.style.transition = 'opacity 0.8s ease, transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                        playButton.style.opacity = '1';
                        
                        // Also show controls guide
                        controlsGuide.style.display = 'block';
                        controlsGuide.style.transition = 'opacity 0.8s ease';
                        controlsGuide.style.opacity = '1';
                        
                        // Show keyboard controls image
                        controlsImage.style.display = 'block';
                        controlsImage.style.opacity = '1';
                        
                        // Add a bouncy entrance effect
                        playButton.style.transform = 'scale(0.8)';
                        setTimeout(() => {
                            playButton.style.transform = 'scale(1.1)';
                            setTimeout(() => {
                                playButton.style.transform = 'scale(1)';
                            }, 150);
                        }, 50);
                    }, 50);
                }, 2000);
            }
            
            // Remove any existing connect wallet message if present
            const connectMessage = document.getElementById('connectWalletMessage');
            if (connectMessage) {
                connectMessage.remove();
            }
        }

        // Play again overlay removed to prevent buttons showing outside the iframe

        // Add this new method to track each jump
        recordJumpTransaction() {
            const jumpData = {
                timestamp: Date.now(),
                jumpNumber: ++window.__jumpCount
            };
            
            this.pendingJumps.push(jumpData);
            this.jumpTimestamps.push(jumpData.timestamp);
            
            // Avoid excessive logging during gameplay
            
            // Notify parent of the jump for UI updates using safe function
            // Optimization: Only send message every 5 jumps to reduce overhead
            if (window.__jumpCount % 5 === 0 || window.__jumpCount <= 3) {
            sendMessageToParent({
                type: 'JUMP_PERFORMED',
                data: {
                    jumpCount: window.__jumpCount,
                    timestamp: jumpData.timestamp
                }
            });
            }
        }

        jump() {
            if (this.canJump) {
                // Existing jump code...
                
                // Track jump
                window.__jumpCount = (window.__jumpCount || 0) + 1;
                console.log('🦘 Jump recorded:', window.__jumpCount);
                
                // Notify parent of jump using safe function
                sendMessageToParent({
                    type: 'JUMP_PERFORMED',
                    jumpCount: window.__jumpCount
                });
            }
        }

        // Add these new methods to the Game class
        detectMobile() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        }

        initMobileControls() {
            console.log('📱 Initializing mobile controls');
            
            // Set a global flag to indicate we're in mobile mode
            window.isMobile = true;
            
            // No longer using canvas taps for jumping since we have dedicated control buttons
            // Only use touch to start the game if not started yet
            if (this.isMobile && this.detectMobile()) {
            this.canvas.addEventListener('touchstart', (event) => {
                    // First check if we're not in game over state (which is handled separately)
                    if (!this.gameOver && !this.showingReviveMenu && !this.showingReviveErrorScreen) {
                        event.preventDefault(); // Prevent scrolling only for active gameplay
                        
                        // Only use touch to start the game when not started
                        if (!this.gameStart) {
                    // Start the game on touch if not started
                    this.startGame();
                }
                        
                        // No longer handling jump actions here since we have dedicated control buttons
                    }
                    // If in game over state, the other handler will take care of it
            }, { passive: false });
                
                console.log('Mobile touch controls enabled (game start only)');
            } else {
                console.log('Not enabling mobile touch events - device detected as desktop');
            }
            
            // Try to enable gyroscope controls
            if (window.DeviceOrientationEvent) {
                window.addEventListener('deviceorientation', this.handleGyroscope.bind(this));
                
                // Check if permission is needed (iOS 13+)
                if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                    // Create a permission button
                    const gyroButton = document.createElement('button');
                    gyroButton.id = 'gyro-permission';
                    gyroButton.innerText = 'ENABLE TILT CONTROLS';
                    gyroButton.style.position = 'absolute';
                    gyroButton.style.bottom = '20px';
                    gyroButton.style.left = '50%';
                    gyroButton.style.transform = 'translateX(-50%)';
                    gyroButton.style.padding = '10px 20px';
                    gyroButton.style.backgroundColor = '#ff5a5f';
                    gyroButton.style.color = 'white';
                    gyroButton.style.border = 'none';
                    gyroButton.style.borderRadius = '5px';
                    gyroButton.style.zIndex = '1000';
                    
                    gyroButton.addEventListener('click', async () => {
                        try {
                            const permission = await DeviceOrientationEvent.requestPermission();
                            if (permission === 'granted') {
                                this.gyroEnabled = true;
                                gyroButton.style.display = 'none';
                                console.log('Gyroscope permission granted!');
                            }
                        } catch (error) {
                            console.error('Error requesting gyroscope permission:', error);
                        }
                    });
                    
                    document.body.appendChild(gyroButton);
                } else {
                    // No permission needed, enable right away
                    this.gyroEnabled = true;
                }
            }
            
            // Add on-screen controls for movement and shooting
            this.addOnScreenControls();
        }

        handleGyroscope(event) {
            if (!this.gyroEnabled) return;
            
            // Store the beta value (device tilt forward/backward)
            this.gyroData.beta = event.beta;
            
            // Store gamma value (device tilt left/right)
            const gamma = event.gamma;
            
            // Map gamma (-90 to 90) to player movement
            // Negative gamma is tilting left, positive gamma is tilting right
            if (this.player && this.gameStart && !this.gameOver) {
                // Apply movement based on gyroscope data
                if (gamma < -10) {
                    // Move left
                    this.player.moveLeft();
                } else if (gamma > 10) {
                    // Move right
                    this.player.moveRight();
                } else {
                    // Stop moving when device is relatively flat
                    this.player.stopMoving();
                }
            }
        }

        addOnScreenControls() {
            // Get iframe reference
            const controlsFrame = document.getElementById('controls-iframe');
            if (!controlsFrame || !controlsFrame.contentWindow) {
                console.error('Controls iframe not found');
                return;
            }
            
            // Create a completely independent document in the iframe
            const frameDoc = controlsFrame.contentDocument || controlsFrame.contentWindow.document;
            frameDoc.open();
            frameDoc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                    <style>
                        body {
                            margin: 0;
                            padding: 0;
                            overflow: hidden;
                            width: 100%;
                            height: 100%;
                            background-color: transparent;
                            position: relative;
                        }
                        .control-btn {
                            position: fixed;
                            border-radius: 50%;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            color: white;
                            border: none;
                            pointer-events: auto;
                            touch-action: manipulation;
                            -webkit-tap-highlight-color: transparent;
                            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                            transition: transform 0.15s ease, opacity 0.15s ease, background-color 0.15s ease;
                            font-family: Arial, sans-serif;
                            font-weight: bold;
                        }
                        #left-btn {
                            bottom: 3vh;
                            left: 10vw;
                            width: 15vw;
                            height: 15vw;
                            max-width: 80px;
                            max-height: 80px;
                            min-width: 50px;
                            min-height: 50px;
                            background-color: rgba(0,122,255,0.8);
                            font-size: 30px;
                        }
                        #shoot-btn {
                            bottom: 3vh;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 18vw;
                            height: 18vw;
                            max-width: 90px;
                            max-height: 90px;
                            min-width: 60px;
                            min-height: 60px;
                            background-color: rgba(255,90,95,0.8);
                            font-size: 30px;
                        }
                        #right-btn {
                            bottom: 3vh;
                            right: 10vw;
                            width: 15vw;
                            height: 15vw;
                            max-width: 80px;
                            max-height: 80px;
                            min-width: 50px;
                            min-height: 50px;
                            background-color: rgba(0,122,255,0.8);
                            font-size: 30px;
                        }
                        @media (min-width: 768px) {
                            .control-btn {
                                display: none !important;
                            }
                        }
                    </style>
                </head>
                <body>
                    <button id="left-btn" class="control-btn">←</button>
                    <button id="shoot-btn" class="control-btn">🔫</button>
                    <button id="right-btn" class="control-btn">→</button>
                    <script>
                        // Function to send messages to parent window
                        function sendMessage(action, key) {
                            window.parent.postMessage({
                                type: 'CONTROL_ACTION',
                                action: action,
                                key: key
                            }, '*');
                        }
                        
                        // Left button
                        const leftBtn = document.getElementById('left-btn');
            leftBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                    leftBtn.style.transform = 'scale(0.95)';
                    leftBtn.style.opacity = '1';
                            leftBtn.style.backgroundColor = 'rgba(0,122,255,1)';
                            sendMessage('keydown', 'ArrowLeft');
            }, { passive: false });
            
            leftBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                    leftBtn.style.transform = 'scale(1)';
                    leftBtn.style.opacity = '0.8';
                            leftBtn.style.backgroundColor = 'rgba(0,122,255,0.8)';
                            sendMessage('keyup', 'ArrowLeft');
            }, { passive: false });
            
                        // Right button
                        const rightBtn = document.getElementById('right-btn');
            rightBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                    rightBtn.style.transform = 'scale(0.95)';
                    rightBtn.style.opacity = '1';
                            rightBtn.style.backgroundColor = 'rgba(0,122,255,1)';
                            sendMessage('keydown', 'ArrowRight');
            }, { passive: false });
            
            rightBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                    rightBtn.style.transform = 'scale(1)';
                    rightBtn.style.opacity = '0.8';
                            rightBtn.style.backgroundColor = 'rgba(0,122,255,0.8)';
                            sendMessage('keyup', 'ArrowRight');
            }, { passive: false });
            
                        // Shoot button
                        const shootBtn = document.getElementById('shoot-btn');
            shootBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                            shootBtn.style.transform = 'translateX(-50%) scale(0.95)';
                    shootBtn.style.opacity = '1';
                            shootBtn.style.backgroundColor = 'rgba(255,90,95,1)';
                            sendMessage('keydown', ' ');
            }, { passive: false });
            
            shootBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                            setTimeout(() => {
                                shootBtn.style.transform = 'translateX(-50%) scale(1)';
                shootBtn.style.opacity = '0.8';
                                shootBtn.style.backgroundColor = 'rgba(255,90,95,0.8)';
                            }, 150);
                            sendMessage('keyup', ' ');
            }, { passive: false });
                    </script>
                </body>
                </html>
            `);
            frameDoc.close();
            
            // Make container and iframe visible
            const container = document.getElementById('controls-iframe-container');
            if (container) {
                container.style.pointerEvents = 'auto';
            }
            controlsFrame.style.pointerEvents = 'auto';
            
            // Listen for messages from the iframe
            window.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'CONTROL_ACTION') {
                    const { action, key } = event.data;
                    
                    // Create and dispatch keyboard event
                    const keyEvent = new KeyboardEvent(action, {
                        key: key,
                        bubbles: true,
                        cancelable: true
                    });
                    document.dispatchEvent(keyEvent);
                    
                    // Play sound for shoot button
                    if (action === 'keydown' && key === ' ' && window.audioManager) {
                        window.audioManager.play('shoot', 0.5);
                    }
                }
            });
            
            // Hide controls on desktop
            if (!this.detectMobile()) {
                if (container) container.style.display = 'none';
            }
        }

        handleReloadButton() {
            console.log('Reload button clicked');
            this.restartGame();
        }

        // Add method to play background music directly
        playBackgroundMusic() {
            // Always ensure audio context is active
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    console.log('AudioContext resumed for background music');
                });
            }
            
            // Play music both directly and via parent window
            console.log('Playing background music directly');
            
            // Try to play the background music directly
            const bgMusic = document.getElementById('bg-music');
            if (bgMusic) {
                bgMusic.volume = 0.5; // Set reasonable volume
                bgMusic.muted = false; // Ensure not muted
                bgMusic.currentTime = 0; // Start from beginning
                
                // Try to play and handle any errors
                const playPromise = bgMusic.play();
                if (playPromise) {
                    playPromise.catch(err => {
                        console.warn('Could not play background music directly:', err);
                        // If direct play fails, we still have the parent window approach
                    });
                }
            }
            
            // Also send message to parent window as backup
            try {
                sendMessageToParent({ 
                    type: 'GAME_STARTED',
                    message: 'Game is ready for music control',
                    muted: false // Always report unmuted
                });
                
                // Also send explicit play request
                sendMessageToParent({
                    type: 'PLAY_BACKGROUND_MUSIC',
                    volume: 0.5
                });
            } catch (e) {
                console.warn('Could not communicate with parent window:', e);
            }
        }

        drawScore() {
            // Only draw score once at the top
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillStyle = 'white';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`Score: ${Math.floor(this.score)}`, this.width / 2, 30);
        }

        // Add the method to draw the revive menu
        drawReviveMenu(context) {
            // Draw a semi-transparent background
            context.fillStyle = 'rgba(0, 0, 0, 0.7)';
            context.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw the header - changed to be more attention-grabbing
            context.fillStyle = 'white';
            context.font = '50px Bangers, cursive';
            context.textAlign = 'center';
            context.fillText('REVIVE', this.canvas.width / 2, this.canvas.height / 2 - 100);

            // If revive transaction is pending, show countdown
            if (this.reviveTransactionPending) {
                context.fillStyle = '#FFA500';
                context.font = '40px Bangers, cursive';
                
                if (this.reviveCountdown > 0) {
                    context.fillText(`REVIVING IN ${this.reviveCountdown} SECONDS...`, this.canvas.width / 2, this.canvas.height / 2);
                } else {
                    context.fillText(`TRANSACTION PENDING...`, this.canvas.width / 2, this.canvas.height / 2);
                }
                return;
            }
            
            // Draw explanation - updated to the requested text
            context.fillStyle = '#FFA500';
            context.font = '28px Bangers, cursive';
            context.fillText('WANT A SECOND CHANCE? REVIVE NOW!', this.canvas.width / 2, this.canvas.height / 2 - 30);
            
            // Draw buttons - updated layout for side-by-side buttons
            // Buy Revive button - moved to left side
            const reviveButton = {
                x: this.canvas.width / 2 - 160,
                y: this.canvas.height / 2 + 20,
                width: 150,
                height: 60,
                text: 'REVIVE NOW'
            };
            
            // Cancel button - moved to right side
            const cancelButton = {
                x: this.canvas.width / 2 + 10,
                y: this.canvas.height / 2 + 20,
                width: 150,
                height: 60,
                text: 'CANCEL'
            };
            
            // Draw Buy Revive button
            context.fillStyle = '#4CAF50'; // Green
            context.beginPath();
            context.roundRect(reviveButton.x, reviveButton.y, reviveButton.width, reviveButton.height, 10);
            context.fill();
            
            // Draw main text
            context.fillStyle = 'white';
            context.font = '24px Bangers, cursive';
            context.fillText(reviveButton.text, reviveButton.x + reviveButton.width/2, reviveButton.y + 25);
            
            // Draw the price in smaller text below
            context.font = '16px Bangers, cursive';
            context.fillText('0.5 MON', reviveButton.x + reviveButton.width/2, reviveButton.y + 45);
            
            // Draw Cancel button
            context.fillStyle = '#f44336'; // Red
            context.beginPath();
            context.roundRect(cancelButton.x, cancelButton.y, cancelButton.width, cancelButton.height, 10);
            context.fill();
            
            context.fillStyle = 'white';
            context.font = '22px Bangers, cursive';
            context.fillText(cancelButton.text, cancelButton.x + cancelButton.width/2, cancelButton.y + 35);
            
            // Store buttons for click handling
            this.reviveButtons = {
                buyRevive: reviveButton,
                cancel: cancelButton
            };
        }

        // Method to handle purchasing revives through blockchain
        purchaseRevive() {
            // Set flag to indicate we're waiting for the transaction
            this.reviveTransactionPending = true;
            
            // Try to use blockchain methods from parent window if available
            if (typeof window.purchaseRevive === 'function') {
                try {
                    console.log("Using direct window.purchaseRevive function");
                    window.purchaseRevive(this.gameId);
                    return;
                } catch (error) {
                    console.error("Direct revive purchase failed:", error);
                    this.reviveTransactionPending = false;
                }
            }
            
            // Otherwise, try to call through parent window message passing
            if (window !== window.parent) {
                console.log("Falling back to parent window message approach");
                
                // Send a single message with all needed info - no separate registration message
            sendMessageToParent({
                type: 'PURCHASE_REVIVE',
                contractAddress: this.reviveContractAddress,
                    price: "0.5",
                    gameId: this.gameId,
                    timestamp: Date.now()
            });
            
            // Listen for response from parent window
            const handleReviveResponse = (event) => {
                if (event.data?.type === 'REVIVE_TRANSACTION_RESULT') {
                    if (event.data.success) {
                        // Start countdown for revive
                        this.startReviveCountdown();
                    } else {
                            // Show contract error message
                        this.reviveTransactionPending = false;
                            
                            // Store the error message if provided
                            this.reviveError = event.data.error || "Transaction failed";
                            
                            // Add debugging output for the error
                            sendMessageToParent({
                                type: 'DEBUG_LOG',
                                message: `Revive failed: ${this.reviveError}`,
                                data: {
                                    gameId: this.gameId,
                                    contractAddress: this.reviveContractAddress
                                }
                            });
                            
                            // Check if this is the "already used revive" error
                            if (this.reviveError.includes("already used") || 
                                this.reviveError.includes("Already used revive in this game")) {
                                // Set a flag to show the admin reset message
                                this.needsAdminReset = true;
                            }
                            
                            // Show the revive error screen instead of immediately going to game over
                            this.showingReviveErrorScreen = true;
                    }
                    
                    // Remove event listener after handling response
                    window.removeEventListener('message', handleReviveResponse);
                }
            };
            
            window.addEventListener('message', handleReviveResponse);
            }
        }

        // Method to start the revive countdown
        startReviveCountdown() {
            this.reviveCountdown = 3;
            
            const countdownInterval = setInterval(() => {
                this.reviveCountdown--;
                
                if (this.reviveCountdown <= 0) {
                    clearInterval(countdownInterval);
                    this.completeRevive();
                }
            }, 1000);
        }

        // Method to complete the revive process
        completeRevive() {
            // Mark that the player has used their revive
            this.hasUsedRevive = true;
            this.reviveTransactionPending = false;
            this.showingReviveMenu = false;
            
            // Store revive usage in localStorage as an additional tracking method
            try {
                const gameRevives = JSON.parse(localStorage.getItem('gameRevives') || '{}');
                gameRevives[this.gameId] = true;
                localStorage.setItem('gameRevives', JSON.stringify(gameRevives));
            } catch (e) {
                // Silently fail if localStorage is not available
            }
            
            // Inform parent window that revive was used for this game session
            sendMessageToParent({
                type: 'REVIVE_USED',
                gameId: this.gameId,
                timestamp: Date.now(),
                finalJumpCount: window.__jumpCount || 0
            });
            
            // Reset game state to continue
            this.gameOver = false;
            this.isGameOver = false;
            
            // Make sure there are enough platforms to jump on
            const visiblePlatformsCount = this.platforms.filter(p => 
                p.y > 0 && p.y < this.height).length;
                
            // If we don't have enough platforms, add more
            if (visiblePlatformsCount < 5) {
                this.add_platforms(this.height/2, this.height-15);
                this.add_platforms(0, this.height/2);
            }
            
            // Set player position to just before death
            if (this.deathReason === "fall") {
                // Find a suitable platform to place the player on
                const platform = this.findSuitablePlatform();
                if (platform) {
                    // Place player on top of the platform
                    this.player.x = platform.x + (platform.width / 2) - (this.player.width / 2);
                    this.player.y = platform.y - this.player.height - 5;
                } else {
                    // Fallback if no platform found
                this.player.y = this.height - this.player.height - 100;
                }
                // Give normal upward boost
                this.player.vy = this.player.min_vy;
            } else if (this.deathReason === "collision") {
                // For collisions, move them to a safe position
                const platform = this.findSuitablePlatform();
                if (platform) {
                    // Place player on top of the platform
                    this.player.x = platform.x + (platform.width / 2) - (this.player.width / 2);
                    this.player.y = platform.y - this.player.height - 5;
                } else {
                    // Fallback if no platform found
                this.player.y = this.height - this.player.height - 100;
                }
                this.player.vy = this.player.min_vy;
                // Remove enemies
                this.enemies = [];
            }
            
            // Play revival sound if available
            if (window.audioManager && typeof window.audioManager.play === 'function') {
                window.audioManager.play('powerUp', 0.7);
            }
        }
        
        // Helper method to find a suitable platform for the player after revival
        findSuitablePlatform() {
            // Get all visible platforms in the lower half of the screen
            const visiblePlatforms = this.platforms.filter(p => 
                p.y > this.height * 0.5 && 
                p.y < this.height * 0.9 && 
                p.type !== 'brown'); // Avoid broken platforms
                
            if (visiblePlatforms.length > 0) {
                // Find a good platform - take the middle one for stability
                const index = Math.floor(visiblePlatforms.length / 2);
                return visiblePlatforms[index];
            }
            
            // If no suitable platform, return null (will use fallback position)
            return null;
        }

        // Add a method to manually check if revive was used in the current game
        checkReviveUsage() {
            // First, check our internal tracker
            if (this.hasUsedRevive) {
                return true;
            }
            
            // Then check localStorage as backup
            try {
                const gameRevives = JSON.parse(localStorage.getItem('gameRevives') || '{}');
                if (gameRevives[this.gameId]) {
                    this.hasUsedRevive = true;
                    return true;
                }
            } catch (e) {
                // Silently fail if localStorage is not available
            }
            
            return false;
        }

        // Add a method to draw the revive error screen
        drawReviveErrorScreen(context) {
            // Draw a semi-transparent background
            context.fillStyle = 'rgba(0, 0, 0, 0.8)';
            context.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw the header
            context.fillStyle = 'white';
            context.font = '45px Bangers, cursive';
            context.textAlign = 'center';
            context.fillText('REVIVE FAILED', this.canvas.width / 2, this.canvas.height / 2 - 100);
            
            // Draw explanation based on error type
            if (this.needsAdminReset) {
                // This is an "already used revive" error - explain the contract limitation
                context.fillStyle = '#FFA500';
                context.font = '22px Bangers, cursive';
                context.fillText('YOU\'VE ALREADY USED A REVIVE', this.canvas.width / 2, this.canvas.height / 2 - 50);
                
                context.fillStyle = 'white';
                context.font = '16px Arial, sans-serif';
                context.fillText('The contract only allows one revive per wallet.', this.canvas.width / 2, this.canvas.height / 2 - 10);
                context.fillText('Try the options below to reset your revive status.', this.canvas.width / 2, this.canvas.height / 2 + 15);
                
                // Add button to request admin reset
                this.adminResetButton = {
                    x: this.canvas.width / 2 - 120,
                    y: this.canvas.height / 2 + 40,
                    width: 240,
                    height: 50,
                    text: 'REQUEST ADMIN RESET'
                };
                
                // Draw admin reset button
                context.fillStyle = '#4CAF50'; // Green
                context.beginPath();
                context.roundRect(this.adminResetButton.x, this.adminResetButton.y, this.adminResetButton.width, this.adminResetButton.height, 10);
                context.fill();
                
                context.fillStyle = 'white';
                context.font = '20px Bangers, cursive';
                context.fillText(this.adminResetButton.text, this.canvas.width / 2, this.adminResetButton.y + 33);
                
                // Add new button to try manual reset
                this.manualResetButton = {
                    x: this.canvas.width / 2 - 120,
                    y: this.canvas.height / 2 + 100,
                    width: 240,
                    height: 50,
                    text: 'TRY MANUAL RESET'
                };
                
                // Draw manual reset button
                context.fillStyle = '#2196F3'; // Blue
                context.beginPath();
                context.roundRect(this.manualResetButton.x, this.manualResetButton.y, this.manualResetButton.width, this.manualResetButton.height, 10);
                context.fill();
                
                context.fillStyle = 'white';
                context.font = '20px Bangers, cursive';
                context.fillText(this.manualResetButton.text, this.canvas.width / 2, this.manualResetButton.y + 33);
                
                // Show message if a reset has been attempted
                if (this.resetAttempted) {
                    context.fillStyle = this.resetSuccess ? '#4CAF50' : '#FF5252';
                    context.font = '16px Arial, sans-serif';
                    context.fillText(
                        this.resetSuccess ? 'Reset successful! Try reviving now.' : 'Reset attempt failed. Try again later.',
                        this.canvas.width / 2, 
                        this.canvas.height / 2 + 160
                    );
                }
                
                // Add continue button at the bottom
                this.continueButton = {
                    x: this.canvas.width / 2 - 120,
                    y: this.canvas.height / 2 + 180,
                    width: 240,
                    height: 50,
                    text: 'CONTINUE TO GAME OVER'
                };
            } else {
                // Generic error
                context.fillStyle = '#FFA500';
                context.font = '24px Bangers, cursive';
                context.fillText('TRANSACTION FAILED', this.canvas.width / 2, this.canvas.height / 2 - 50);
                
                // Show specific error if available
                if (this.reviveError) {
                    // Format the error message to fit on multiple lines if needed
                    const maxWidth = this.canvas.width - 80;
                    const errorLines = this.wrapText(context, this.reviveError, maxWidth, 18);
                    
                    context.fillStyle = 'white';
                    context.font = '16px Arial, sans-serif';
                    
                    let yPosition = this.canvas.height / 2 - 10;
                    errorLines.forEach(line => {
                        context.fillText(line, this.canvas.width / 2, yPosition);
                        yPosition += 25;
                    });
                }
                
                // Add continue button
                this.continueButton = {
                    x: this.canvas.width / 2 - 120,
                    y: this.canvas.height / 2 + 100,
                    width: 240,
                    height: 50,
                    text: 'CONTINUE TO GAME OVER'
                };
            }
            
            // Draw continue button
            context.fillStyle = '#f44336'; // Red
            context.beginPath();
            context.roundRect(this.continueButton.x, this.continueButton.y, this.continueButton.width, this.continueButton.height, 10);
            context.fill();
            
            context.fillStyle = 'white';
            context.font = '20px Bangers, cursive';
            context.fillText(this.continueButton.text, this.canvas.width / 2, this.continueButton.y + 33);
        }

        // Add a helper method to wrap text
        wrapText(context, text, maxWidth, fontSize) {
            const words = text.split(' ');
            const lines = [];
            let currentLine = words[0];
            
            context.font = `${fontSize}px Arial, sans-serif`;
            
            for (let i = 1; i < words.length; i++) {
                const word = words[i];
                const width = context.measureText(currentLine + ' ' + word).width;
                if (width < maxWidth) {
                    currentLine += ' ' + word;
                } else {
                    lines.push(currentLine);
                    currentLine = word;
                }
            }
            
            lines.push(currentLine);
            return lines;
        }

        // Add a method to request admin reset
        requestAdminReset() {
            // Send a message to the parent window requesting admin reset
            sendMessageToParent({
                type: 'REQUEST_ADMIN_REVIVE_RESET',
                walletAddress: this.playerWalletAddress || '',
                gameId: this.gameId,
                timestamp: Date.now()
            });
            
            // Show a confirmation message
            this.adminResetRequested = true;
            
            // Redraw the screen
            const ctx = this.canvas.getContext('2d');
            this.drawReviveErrorScreen(ctx);
        }

        // Add a method to manually try reset
        tryManualReset() {
            // Show loading feedback
            this.resetAttempted = true;
            this.resetSuccess = false;
            
            // Send direct reset request with urgent flag
            sendMessageToParent({
                type: 'MANUAL_REVIVE_RESET',
                walletAddress: this.playerWalletAddress,
                contractAddress: this.reviveContractAddress,
                gameId: this.gameId,
                urgent: true, // Flag this as urgent/manual request
                timestamp: Date.now()
            });
            
            // Set a timeout to check if the reset was successful
            setTimeout(() => {
                // Send a message to check the revive status
                sendMessageToParent({
                    type: 'CHECK_REVIVE_STATUS',
                    walletAddress: this.playerWalletAddress,
                    contractAddress: this.reviveContractAddress
                });
            }, 5000); // Check after 5 seconds
            
            // Redraw the screen to show loading state
            const ctx = this.canvas.getContext('2d');
            this.drawReviveErrorScreen(ctx);
        }

        // Add a method to draw loading during direct purchase
        drawDirectPurchaseLoading(context) {
            // Only draw if direct purchase is in progress
            if (!this.directPurchaseInProgress) return;
            
            // Draw a semi-transparent background
            context.fillStyle = 'rgba(0, 0, 0, 0.7)';
            context.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw the header
            context.fillStyle = 'white';
            context.font = '40px Bangers, cursive';
            context.textAlign = 'center';
            context.fillText('PROCESSING REVIVE', this.canvas.width / 2, this.canvas.height / 2 - 50);
            
            // Draw loading message
            context.fillStyle = '#FFA500';
            context.font = '20px Bangers, cursive';
            context.fillText('PLEASE CONFIRM IN YOUR WALLET', this.canvas.width / 2, this.canvas.height / 2);
            
            // Draw spinner animation
            const time = Date.now() / 1000;
            const x = this.canvas.width / 2;
            const y = this.canvas.height / 2 + 50;
            const radius = 20;
            
            for (let i = 0; i < 8; i++) {
                const angle = time * 2 + i * Math.PI / 4;
                const dotX = x + Math.cos(angle) * radius;
                const dotY = y + Math.sin(angle) * radius;
                const alpha = 0.3 + 0.7 * Math.sin(time * 3 + i);
                
                context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                context.beginPath();
                context.arc(dotX, dotY, 5, 0, Math.PI * 2);
                context.fill();
            }
            
            // Request animation frame to continue animation
            requestAnimationFrame(() => this.drawDirectPurchaseLoading(context));
        }
        
        // Generate a secure one-time token for this game session
        generateGameSessionToken() {
            try {
                // Create a random string for the session token
                const randomBytes = new Uint8Array(32);
                window.crypto.getRandomValues(randomBytes);
                
                // Get current timestamp for token freshness
                const timestamp = Date.now();
                
                // Create a base token
                const baseToken = Array.from(randomBytes)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
                
                // Add player address if available (to bind token to specific player)
                const playerAddress = this.playerWalletAddress || '';
                
                // Generate a secure token that combines random data with game state
                // This makes it harder to forge tokens as they're tied to specific game state
                this.sessionToken = {
                    token: baseToken,
                    timestamp: timestamp,
                    gameId: this.gameId,
                    playerAddress: playerAddress,
                    // Do not include the actual score here - it will be added at game over time
                };
                
                // SAFE: Use memory storage if cookies/localStorage fail
                window.__GAME_SECURE_TOKEN = this.sessionToken;
                    
                // Attempt to store in HTTP-only cookie (might fail in some environments)
                try {
                    this.storeSessionTokenInCookie(JSON.stringify(this.sessionToken));
                } catch (storageError) {
                    console.warn("Could not store session token in cookie, using memory storage instead");
                }
                
                // Send the token to parent to be validated server-side
                sendMessageToParent({
                    type: 'GAME_SESSION_TOKEN',
                    token: JSON.stringify(this.sessionToken)
                });
                
                console.log("Generated secure game session token");
            } catch (error) {
                console.error("Error generating session token:", error);
                // Create a simplified fallback token if crypto fails
                this.sessionToken = {
                    token: Math.random().toString(36).substring(2) + Date.now().toString(36),
                    timestamp: Date.now(),
                    gameId: this.gameId
                };
                window.__GAME_SECURE_TOKEN = this.sessionToken;
            }
        }
        
        // Store token in cookie
        storeSessionTokenInCookie(token) {
            try {
                // Send to parent window to set as HTTP-only cookie
                sendMessageToParent({
                    type: 'SET_SESSION_COOKIE',
                    token: token
                });
            } catch (error) {
                console.error("Error storing session token");
            }
        }
    }
    
    const game = new Game(canvas.width,canvas.height)
    window.gameInstance = game; // Make game globally accessible
    
    // Replace the existing animate function with a proper game loop using deltaTime
    let lastTime = performance.now();
    
    function animate(currentTime) {
        // Calculate delta time in seconds for consistent movement
        const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.05); // Cap at 50ms (20fps)
        lastTime = currentTime;
        
        // Skip frame if delta is too small (improves performance on high refresh displays)
        if (deltaTime < 0.004) { // Skip frames faster than ~250fps
            requestAnimationFrame(animate);
            return;
        }
        
        // Clear canvas - only once per frame
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update game if active - avoid unnecessary condition checks
        if (game.gameStart && !game.gameOver) {
            try {
            game.update(deltaTime);
            } catch (e) {
                // Silent catch without logging to avoid perf issues
            }
        }
        
        // Draw game
        game.draw(ctx);
        
        // Continue the loop - use direct binding to avoid function creation on each frame
        requestAnimationFrame(animate);
    }
    
    // Start the animation loop with requestAnimationFrame
    requestAnimationFrame(animate);

    // Add key listener for game start
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !game.gameStart) {
            console.log('Enter pressed - starting game');
            game.startGame();
        }
    });

    // Also add debugging to track jumps clearly
    document.addEventListener('keydown', (e) => {
        if ((e.key === ' ' || e.key === 'ArrowUp')) {
            if (typeof window.totalJumps === 'undefined') {
                window.totalJumps = 1;
            } else {
                window.totalJumps++;
            }
            // Remove console logging during gameplay
        }
    });

    console.log('Game initialized successfully!');

    // Make sure game instance is globally accessible for parent window
    window.addEventListener('load', function() {
        // Ensure gameInstance is always available globally
        if (window.gameInstance) {
            console.log("Game instance exposed to window");
            
            // Make sure we can get game status from parent
            window.getGameStatus = function() {
                return {
                    gameStart: window.gameInstance.gameStart,
                    gameOver: window.gameInstance.gameOver,
                    score: Math.floor(window.gameInstance.score || 0),
                    jumps: window.__jumpCount || 0
                };
            };
            
            // Remove any existing play-again overlay that might be outside the iframe
            const existingOverlay = document.getElementById('play-again-overlay');
            if (existingOverlay) {
                document.body.removeChild(existingOverlay);
                console.log("Removed existing play-again overlay");
            }
            
            // Notify parent that game is fully loaded
            if (window.parent && window.parent !== window) {
                try {
                    sendMessageToParent({
                        type: 'GAME_LOADED',
                        status: window.getGameStatus()
                    });
                } catch (e) {
                    console.error("Error notifying parent:", e);
                }
            }
        } else {
            console.error("Game instance not found on window!");
        }
    });
})

class DebugPanel {
    constructor(game) {
        this.game = game;
        this.visible = true;
        this.txCount = 0;
        this.txFailed = 0;
        
        // Toggle with tilde key
        document.addEventListener('keydown', (e) => {
            if (e.key === '`') {
                this.visible = !this.visible;
            }
        });
        
        // Create global method for tracking transactions
        window.trackJumpTransaction = (success) => {
            if (success) {
                this.txCount++;
            } else {
                this.txFailed++;
            }
        };
    }
    
   
}

// When player collects a coin or jumps on a platform
function onScoreIncrease(points) {
  // Update local score
  game.score += points;
  
  // Send transaction for blockchain record
  sendScoreIncrement(points);
}

// When player dies
function onPlayerDeath() {
  // Ask if player wants to continue
  const CONTINUE_DELAY = 3000; // ms
  
  // Show continue UI
  showContinuePrompt();
  
  // Set a timeout to handle the continue or game over
  setTimeout(() => {
    if (continueSelected) {
      requestContinue();
    } else {
      game.gameOver();
      game.reset();
    }
  }, CONTINUE_DELAY);
}

// For power-ups
function onPowerUpCollection(type) {
  requestPowerUp(type);
}

// Update game loop
function gameLoop() {
    if (!game.gameOver) {
        // ... existing game loop code ...
        
        if (checkGameOver()) {
            console.log('Game loop ended due to game over');
            game.gameOver = true;
        }
    }
}

// Add this near the end of the file
try {
    console.log('Checking game initialization status...');
    if (window.gameInstance) {
        console.log('Game instance exists, status:', {
            gameStart: window.gameInstance.gameStart,
            gameOver: window.gameInstance.gameOver,
            isGameOver: window.gameInstance.isGameOver
        });
    } else {
        console.error('Game instance not found or not properly initialized');
    }
} catch (err) {
    console.error('Error checking game status:', err);
}

// Complete rewrite of the jump saving system to prevent duplicates
(function() {
  console.log('COMPLETE REWRITE OF JUMP SAVING SYSTEM');
  
  // Clear ALL existing intervals to stop ALL previous implementations
  for (let i = 1; i < 2000; i++) {
    clearInterval(i);
    clearTimeout(i);
  }
  
  // Remove all existing jump tracking functions to avoid conflicts
  window.saveJumpsToSupabase = null;
  window.saveJumpsToSupabaseOnce = null;
  window.ensureJumpCountTracking = null;
  
  // Track game instances
  const getGame = () => window.gameInstance || window.game;
  
  // Single global state for jump tracking
  const jumpState = {
    currentJumps: 0,          // Jumps in current game
    saved: false,             // Whether jumps have been saved to Supabase
    saveMessageSent: false,   // Whether the save message has been sent
    saveMessageId: null,      // Unique ID for the current save message
    gameOverDetected: false   // Whether game over has been detected
  };
  
  // Reset jump state on game restart or new game
  function resetJumpState() {
    jumpState.currentJumps = 0;
    jumpState.saved = false;
    jumpState.saveMessageSent = false;
    jumpState.saveMessageId = null;
    jumpState.gameOverDetected = false;
    
    console.log('🔄 Jump tracking state reset');
  }
  
  // ONLY function that should send the save message
  function sendJumpSaveMessage(jumps) {
    // Generate a unique ID for this save attempt
    const saveId = Date.now().toString();
    jumpState.saveMessageId = saveId;
    
    // Mark as sent to prevent duplicates
    jumpState.saveMessageSent = true;
    
    console.log(`💾 SENDING JUMP SAVE (ID: ${saveId}): ${jumps} jumps`);
    
    // Send message to React app with the unique save ID
    sendMessageToParent({
      type: 'SAVE_JUMPS',
      jumps: jumps,
      saveId: saveId
    });
    
    // Set a flag in localStorage to further prevent duplicates
    try {
      localStorage.setItem('last_jump_save', `${saveId}:${jumps}`);
    } catch (e) {
      // Ignore storage errors
    }
  }
  
  // Track jumps by hooking into the jump method
  if (window.Game && window.Game.prototype) {
    // Only add our jump counter if it doesn't already exist
    if (window.Game.prototype.jumpPlayer) {
      console.log('📝 Adding jump counter to jumpPlayer method');
      const originalJumpPlayer = window.Game.prototype.jumpPlayer;
      
      window.Game.prototype.jumpPlayer = function() {
        // Call original jump method
        originalJumpPlayer.apply(this, arguments);
        
        // Increment our jump counter
        jumpState.currentJumps++;
        this.finalJumpCount = jumpState.currentJumps;
        
        // Less verbose logging
        if (jumpState.currentJumps % 5 === 0) {
          console.log(`🦘 Jump count: ${jumpState.currentJumps}`);
        }
      };
    }
    
    // Override restart game to reset our state
    if (window.Game.prototype.restartGame) {
      console.log('📝 Adding jump reset to restartGame method');
      const originalRestart = window.Game.prototype.restartGame;
      
      window.Game.prototype.restartGame = function() {
        // Reset jump tracking before restarting game
        resetJumpState();
        
        // Also reset game's internal counters
        this.jumpsSaved = false;
        this.finalJumpCount = 0;
        
        // Call original restart
        originalRestart.apply(this, arguments);
      };
    }
  }
  
  // Single monitor function to detect game over and save jumps once
  function monitorGameAndSaveJumps() {
    const game = getGame();
    if (!game) return;
    
    // Only run checks if we're in a state where it matters
    if (!jumpState.gameOverDetected && !jumpState.saveMessageSent) {
    // Check if game is over and jumps haven't been saved yet
    if (game.gameOver && !jumpState.gameOverDetected) {
      // Mark game over as detected to prevent multiple triggers
      jumpState.gameOverDetected = true;
      
      // Get final jump count
      const jumps = game.finalJumpCount || jumpState.currentJumps;
      
      // Skip if the main game over message already sent a transaction
      if (game.gameOverMessageSent) {
        return;
      }
      
      // Only send if the main game over didn't already send it
      if (jumps > 0 && !jumpState.saveMessageSent) {
        // Add slight delay to ensure we only save once
        setTimeout(() => {
          // Double-check that the main game didn't send a transaction during our timeout
          if (!jumpState.saveMessageSent && !game.gameOverMessageSent) {
            sendJumpSaveMessage(jumps);
          }
        }, 1000);
            }
      }
    }
    
    // If game is back in play, reset the game over detection
    if (!game.gameOver && jumpState.gameOverDetected) {
      jumpState.gameOverDetected = false;
    }
  }
  
  // Create a single interval for the monitor function
  const monitorInterval = setInterval(monitorGameAndSaveJumps, 3000); // Changed from 2000ms to 3000ms
  
  // Store the interval ID globally so it won't be cleared accidentally
  window.JUMP_MONITOR_INTERVAL = monitorInterval;
  
  // Add a global manual save function for debugging
  window.debugSaveJumps = function(amount) {
    const jumps = amount || 1;
    console.log(`🐞 Debug: Manually saving ${jumps} jumps`);
    sendJumpSaveMessage(jumps);
  };
  
  console.log('✅ NEW JUMP SAVING SYSTEM INSTALLED - DUPLICATES PREVENTED');
})();

// Update the message listener to handle reset
window.addEventListener('message', (event) => {
    if (event.data?.type === 'RESET_GAME') {
        console.log('🔄 Received reset game message');
        game.reset();
        game.start();
    }
});

// Add this after your existing window.addEventListener code
window.addEventListener('message', (event) => {
    if (event.data?.type === 'WALLET_CONNECTION_STATUS') {
        console.log('Received wallet status:', event.data.connected);
        window.walletConnected = event.data.connected;
        
        // Force redraw of start button based on new wallet status
        if (game) {
            game.drawStartButton(game.context);
        }
    }
    
    // Listen for high score response from parent window
    if (event.data?.type === 'HIGH_SCORE_RESPONSE') {
        console.log('Received high score from player stats:', event.data.score);
        window.playerHighScore = event.data.score;
        
        // Force redraw of game over screen if it's currently shown
        if (game && game.gameOver) {
            game.draw(ctx);
        }
    }
});

// Initialize wallet as disconnected by default
window.walletConnected = false;

// Add this code to preload and manage game audio with better synchronization
class AudioManager {
    constructor() {
        // Initialize audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.soundBuffers = {};
        this.isMuted = false; // Track mute state, default to unmuted
        
        // Force unmuted state regardless of localStorage
        localStorage.setItem('audioMuted', 'false');
        
        // Ensure all audio elements are unmuted
        document.querySelectorAll('audio').forEach(audio => {
            audio.muted = false;
        });
        
        console.log('AudioManager initialized in unmuted state');
        
        this.sounds = {
            jump: 'sound effects/jump.wav',
            collision: 'sound effects/crash.mp3',
            gameOver: 'sound effects/fall.mp3',
            powerUp: 'sound effects/spring.mp3',
            spring: 'sound effects/spring.mp3',
            virus: 'sound effects/virus.mp3',
            fall: 'sound effects/fall.mp3',
            bullet: 'sound effects/bullet.mp3',
            singleJump: 'sound effects/single_jump.mp3',
            noJump: 'sound effects/no_jump.mp3',
            // Add any other sounds your game uses
        };
        
        // Preload all sounds
        this.preloadSounds();
        
        // Set up background music
        this.bgMusicElement = document.getElementById('bg-music');
        if (this.bgMusicElement) {
            // Ensure background music is unmuted
            this.bgMusicElement.muted = false;
            
            // Set initial volume based on saved preference
            const savedVolume = localStorage.getItem('bgMusicVolume');
            if (savedVolume !== null) {
                this.bgMusicElement.volume = parseFloat(savedVolume);
            } else {
                this.bgMusicElement.volume = 0.5; // Default volume
            }
            
            // Don't auto-play music, let the game controls handle it
            this.shouldPlayMusic = false;
            
            // Store reference for easy access
            this.bgMusic = this.bgMusicElement;
        }
        
        // Ensure audio context is resumed on user interaction
        this.setupAutoResume();
    }
    
    // Add method to ensure audio context is resumed
    setupAutoResume() {
        const resumeAudio = () => {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
                console.log('AudioContext resumed on user interaction');
            }
        };
        
        // Add listeners to common interaction events
        ['click', 'touchstart', 'keydown'].forEach(event => {
            document.addEventListener(event, resumeAudio, { once: true });
        });
    }
    
    // Add method to check and set mute state
    setMuted(muted) {
        // ALWAYS force unmuted state regardless of what was requested
        this.isMuted = false;
        
        // Apply to all HTML audio elements
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach(audio => {
            audio.muted = false;
        });
        
        // Store in localStorage for persistence
        localStorage.setItem('audioMuted', 'false');
        
        return this.isMuted;
    }
    
    // Toggle mute state
    toggleMute() {
        // Always set to unmuted regardless of current state
        return this.setMuted(false);
    }
    
    // Get current mute state
    getMuted() {
        // Always return false (unmuted)
        return false;
    }
    
    async preloadSounds() {
        console.log('Preloading game sounds...');
        const loadPromises = [];
        
        for (const [name, url] of Object.entries(this.sounds)) {
            const promise = fetch(url)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
                .then(audioBuffer => {
                    this.soundBuffers[name] = audioBuffer;
     
                })
                .catch(error => console.error(`Error loading sound ${name}:`, error));
                
            loadPromises.push(promise);
        }
        
        try {
            await Promise.all(loadPromises);
            console.log('All sounds preloaded successfully');
            
            // Check if we have a saved mute state
            const savedMuteState = localStorage.getItem('audioMuted');
            if (savedMuteState !== null) {
                this.setMuted(savedMuteState === 'true');
            }
        } catch (error) {
            console.error('Error preloading sounds:', error);
        }
    }
    
    play(soundName, volume = 1.0) {
        // Skip completely if the sound isn't loaded - don't log errors
        if (!this.soundBuffers[soundName]) {
            return;
        }
        
        // Don't play if muted
        if (this.isMuted) {
            return;
        }
        
        try {
        // Resume audio context if it's suspended (needed for some browsers)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        // Create sound source
        const source = this.audioContext.createBufferSource();
        source.buffer = this.soundBuffers[soundName];
        
        // Create volume control
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = volume;
        
        // Connect the nodes
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Play immediately
        source.start(0);
        } catch (e) {
            // Silently fail - don't log errors during gameplay
        }
    }

    // Add method to play background music directly
    playBackgroundMusic() {
        // Always ensure audio context is active
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log('AudioContext resumed for background music');
            });
        }
        
        // Skip playing music inside the iframe, as it's handled by the parent window
        console.log('Background music request intercepted - music is now controlled by parent window');
        
        // Instead of playing, send a message to the parent window that the game has started
        // This allows the parent window to know when the game is ready for music
        try {
            sendMessageToParent({
                type: 'GAME_STARTED',
                message: 'Game is ready for music control',
                muted: this.isMuted // Send current mute state to parent
            });
        } catch (e) {
            console.warn('Could not communicate with parent window:', e);
        }
    }
    
    // Add dedicated method to play fall sound
    playFallSound() {
        if (this.isMuted) return; // Don't play if muted
        
        console.log('Attempting to play fall sound...');
        
        // Try multiple approaches to ensure the sound plays
        
        // First approach: Use AudioContext API (most reliable)
        if (this.soundBuffers.fall) {
            try {
                // Resume audio context if it's suspended
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                
                // Create sound source
                const source = this.audioContext.createBufferSource();
                source.buffer = this.soundBuffers.fall;
                
                // Create volume control
                const gainNode = this.audioContext.createGain();
                gainNode.gain.value = 1.0;
                
                // Connect the nodes
                source.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                // Play immediately
                source.start(0);
                console.log('Fall sound played via AudioContext');
                return;
            } catch (e) {
                console.warn('Failed to play fall sound via AudioContext:', e);
            }
        }
        
        // Second approach: Try using the audio element directly
        const fallElement = document.getElementById('sound-fall');
        if (fallElement) {
            try {
                fallElement.volume = 1.0;
                fallElement.currentTime = 0;
                fallElement.play().then(() => {
                    console.log('Fall sound played via HTML element');
                }).catch(err => {
                    console.warn('Failed to play fall sound via element:', err);
                    
                    // Third approach: Direct Audio API as a last resort
                    try {
                        const fallSound = new Audio('sound effects/fall.mp3');
                        fallSound.volume = 1.0;
                        fallSound.muted = this.isMuted; // Apply mute state
                        fallSound.play().then(() => {
                            console.log('Fall sound played via direct Audio API');
                        }).catch(err => {
                            console.warn('Failed to play fall sound via direct API:', err);
                        });
                    } catch (err) {
                        console.error('Error creating fall sound via Audio API:', err);
                    }
                });
            } catch (err) {
                console.warn('Error playing fall sound via element:', err);
            }
        } else {
            // Third approach: Direct Audio API as a last resort
            try {
                const fallSound = new Audio('sound effects/fall.mp3');
                fallSound.volume = 1.0;
                fallSound.muted = this.isMuted; // Apply mute state
                fallSound.play().then(() => {
                    console.log('Fall sound played via direct Audio API');
                }).catch(err => {
                    console.warn('Failed to play fall sound via direct API:', err);
                });
            } catch (err) {
                console.error('Error creating fall sound via Audio API:', err);
            }
        }
    }
}

// Add this to your Game class initialization
function initAudio() {
    // Create global audio manager
    window.audioManager = new AudioManager();
    
    // Initialize audio with user interaction (needed for most browsers)
    document.addEventListener('click', () => {
        if (window.audioManager.audioContext.state === 'suspended') {
            window.audioManager.audioContext.resume();
        }
    }, { once: true });
    
    document.addEventListener('keydown', () => {
        if (window.audioManager.audioContext.state === 'suspended') {
            window.audioManager.audioContext.resume();
        }
    }, { once: true });
    
    // Add a global function to toggle audio mute state
    window.toggleAudio = () => {
        if (window.audioManager) {
            const newState = window.audioManager.toggleMute();
            console.log(`Audio ${newState ? 'muted' : 'unmuted'} globally`);
            
            // Inform parent window about mute state change
            try {
                sendMessageToParent({
                    type: 'AUDIO_STATE_CHANGED',
                    muted: newState
                });
            } catch (e) {
                console.warn('Could not send audio state to parent window:', e);
            }
            
            return newState;
        }
        return false;
    };
    
    // Also expose direct methods
    window.setAudioMuted = (muted) => {
        if (window.audioManager) {
            return window.audioManager.setMuted(muted);
        }
        return false;
    };
    
    window.isAudioMuted = () => {
        return window.audioManager ? window.audioManager.getMuted() : false;
    };
    
    // Send initial state to parent when initialized
    setTimeout(() => {
        try {
            sendMessageToParent({
                type: 'AUDIO_STATE_INITIALIZED',
                muted: window.isAudioMuted()
            });
        } catch (e) {
            console.warn('Could not send initial audio state:', e);
        }
    }, 1000);
}

// Call this when the game starts
initAudio();

// Add a simple setTimeout replacement that doesn't track jumps separately
const originalSetTimeout = window.setTimeout;
window.setTimeout = function(callback, delay) {
  // Just pass through to the original setTimeout
  return originalSetTimeout(callback, delay);
};

// Add a safe message sending function
function sendMessageToParent(messageData) {
    try {
        // Check if parent window exists and is accessible
        if (window.parent && window.parent !== window) {
            // Add mobile detection info to all outgoing messages
            if (typeof messageData === 'object') {
                // Use the game class's detectMobile if available, otherwise fallback
                const isMobileDevice = (window.gameInstance && typeof window.gameInstance.detectMobile === 'function') 
                    ? window.gameInstance.detectMobile() 
                    : /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                
                // Tag all messages with mobile detection results
                messageData.isMobile = isMobileDevice;
                messageData.platform = isMobileDevice ? 'mobile' : 'desktop';
                messageData.source = isMobileDevice ? 'mobile_game' : 'desktop_game';
            }
            
            window.parent.postMessage(messageData, '*');
            return true;
        }
        return false;
    } catch (err) {
        console.warn('Could not send message to parent window:', err);
        return false;
    }
}

// Add a utility function to directly call the revive contract from the window object
window.directRevivePurchase = async function(contractAddress, gameId, price) {
    try {
        if (window.ethereum) {
            // Get the current account
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];
            
            // Get the web3 provider
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            
            // Create contract interface
            const contractABI = [
                {
                    "inputs": [{"type": "string", "name": "gameId"}],
                    "name": "purchaseRevive",
                    "outputs": [],
                    "stateMutability": "payable",
                    "type": "function"
                }
            ];
            
            const contract = new ethers.Contract(contractAddress, contractABI, signer);
            
            // Calculate value in wei
            const priceInWei = ethers.utils.parseEther(price.toString());
            
            // Call the contract directly
            const tx = await contract.purchaseRevive(gameId, { value: priceInWei });
            
            // Wait for transaction to be mined
            const receipt = await tx.wait();
            
            // Return success status
            return {
                success: true,
                transactionHash: receipt.transactionHash
            };
        } else {
            throw new Error("Ethereum provider not found");
        }
    } catch (error) {
        console.error("Direct purchase error:", error);
        return {
            success: false,
            error: error.message || "Transaction failed"
        };
    }
};

// Add ethers.js library loading at the end of the file
(() => {
    // Inject ethers.js library if it doesn't exist
    if (!window.ethers) {
        console.log("Adding ethers.js library for direct contract interaction");
        const ethersScript = document.createElement('script');
        ethersScript.src = 'https://cdn.ethers.io/lib/ethers-5.2.umd.min.js';
        ethersScript.type = 'text/javascript';
        document.head.appendChild(ethersScript);
    }
})();

// Add a direct contract test overlay
function addContractTestUI() {
    // Create a container for the test interface
    const testContainer = document.createElement('div');
    testContainer.id = 'contract-test';
    testContainer.style.position = 'fixed';
    testContainer.style.top = '10px';
    testContainer.style.right = '10px';
    testContainer.style.padding = '10px';
    testContainer.style.background = 'rgba(0,0,0,0.8)';
    testContainer.style.borderRadius = '5px';
    testContainer.style.color = 'white';
    testContainer.style.fontFamily = 'Arial, sans-serif';
    testContainer.style.fontSize = '12px';
    testContainer.style.zIndex = '9999';
    testContainer.style.maxWidth = '300px';
    
    // Add a title
    const title = document.createElement('h3');
    title.textContent = 'Contract Test Panel';
    title.style.margin = '0 0 10px 0';
    title.style.fontSize = '14px';
    testContainer.appendChild(title);
    
    // Add contract address display
    const addressDiv = document.createElement('div');
    addressDiv.innerHTML = `<strong>Contract:</strong> <span id="contract-address">Loading...</span>`;
    addressDiv.style.marginBottom = '5px';
    testContainer.appendChild(addressDiv);
    
    // Add wallet address display
    const walletDiv = document.createElement('div');
    walletDiv.innerHTML = `<strong>Wallet:</strong> <span id="wallet-address">Loading...</span>`;
    walletDiv.style.marginBottom = '5px';
    testContainer.appendChild(walletDiv);
    
    // Add game ID display
    const gameIdDiv = document.createElement('div');
    gameIdDiv.innerHTML = `<strong>Game ID:</strong> <span id="game-id">Loading...</span>`;
    gameIdDiv.style.marginBottom = '10px';
    testContainer.appendChild(gameIdDiv);
    
    // Add test functions
    const testFunctions = document.createElement('div');
    testFunctions.style.display = 'flex';
    testFunctions.style.flexDirection = 'column';
    testFunctions.style.gap = '5px';
    
    // Start New Game button
    const startGameBtn = document.createElement('button');
    startGameBtn.textContent = 'Call startNewGame()';
    startGameBtn.style.padding = '5px';
    startGameBtn.style.cursor = 'pointer';
    startGameBtn.onclick = testStartNewGame;
    testFunctions.appendChild(startGameBtn);
    
    // Purchase Revive button
    const reviveBtn = document.createElement('button');
    reviveBtn.textContent = 'Call purchaseRevive() [0.5 MON]';
    reviveBtn.style.padding = '5px';
    reviveBtn.style.cursor = 'pointer';
    reviveBtn.onclick = testPurchaseRevive;
    testFunctions.appendChild(reviveBtn);
    
    // Check Status button
    const checkBtn = document.createElement('button');
    checkBtn.textContent = 'Call checkReviveStatus()';
    checkBtn.style.padding = '5px';
    checkBtn.style.cursor = 'pointer';
    checkBtn.onclick = testCheckStatus;
    testFunctions.appendChild(checkBtn);
    
    // Admin Reset button
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Call resetReviveStatus() [Owner Only]';
    resetBtn.style.padding = '5px';
    resetBtn.style.cursor = 'pointer';
    resetBtn.onclick = testResetStatus;
    testFunctions.appendChild(resetBtn);
    
    testContainer.appendChild(testFunctions);
    
    // Add status display area
    const statusDiv = document.createElement('div');
    statusDiv.id = 'test-status';
    statusDiv.style.marginTop = '10px';
    statusDiv.style.padding = '5px';
    statusDiv.style.background = 'rgba(0,0,0,0.5)';
    statusDiv.style.borderRadius = '3px';
    statusDiv.style.maxHeight = '100px';
    statusDiv.style.overflowY = 'auto';
    statusDiv.textContent = 'Ready';
    testContainer.appendChild(statusDiv);
    
    // Add to document
    document.body.appendChild(testContainer);
    
    // Update contract and wallet addresses
    if (window.gameInstance) {
        document.getElementById('contract-address').textContent = 
            window.gameInstance.reviveContractAddress?.substring(0, 10) + '...';
        document.getElementById('game-id').textContent = window.gameInstance.gameId || 'Unknown';
    }
    
    // Wait for ethers to load and then set up Web3 connection
    const ethersWaitInterval = setInterval(() => {
        if (window.ethers) {
            clearInterval(ethersWaitInterval);
            setupWeb3();
        }
    }, 100);
}

// Set up Web3 connection for testing
async function setupWeb3() {
    try {
        if (window.ethereum) {
            // Connect to provider
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            window.testProvider = provider;
            
            // Request accounts
            await ethereum.request({ method: 'eth_requestAccounts' });
            const signer = provider.getSigner();
            window.testSigner = signer;
            
            // Get and display address
            const address = await signer.getAddress();
            document.getElementById('wallet-address').textContent = address.substring(0, 10) + '...';
            
            // Create contract instance
            if (window.gameInstance?.reviveContractAddress) {
                const contractABI = [
                    {
                        "inputs": [{"type": "string", "name": "gameId"}],
                        "name": "startNewGame",
                        "outputs": [],
                        "stateMutability": "nonpayable",
                        "type": "function"
                    },
                    {
                        "inputs": [{"type": "string", "name": "gameId"}],
                        "name": "purchaseRevive",
                        "outputs": [],
                        "stateMutability": "payable",
                        "type": "function"
                    },
                    {
                        "inputs": [{"type": "address", "name": "player"}, {"type": "string", "name": "gameId"}],
                        "name": "checkReviveStatus",
                        "outputs": [{"type": "bool", "name": ""}],
                        "stateMutability": "view",
                        "type": "function"
                    },
                    {
                        "inputs": [{"type": "address", "name": "player"}, {"type": "string", "name": "gameId"}],
                        "name": "resetReviveStatus",
                        "outputs": [],
                        "stateMutability": "nonpayable",
                        "type": "function"
                    }
                ];
                
                window.testContract = new ethers.Contract(
                    window.gameInstance.reviveContractAddress,
                    contractABI,
                    signer
                );
                
                updateTestStatus('Connected to contract');
            }
        } else {
            updateTestStatus('No Ethereum provider found');
        }
    } catch (error) {
        updateTestStatus('Error: ' + error.message);
    }
}

// Test function: Start New Game
async function testStartNewGame() {
    try {
        updateTestStatus('Starting new game...');
        const gameId = window.gameInstance?.gameId || Date.now().toString();
        document.getElementById('game-id').textContent = gameId;
        
        if (!window.testContract) throw new Error('Contract not initialized');
        
        // Call the startNewGame function
        const tx = await window.testContract.startNewGame(gameId);
        updateTestStatus('Transaction sent: ' + tx.hash);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        updateTestStatus('New game started successfully! TX: ' + receipt.transactionHash);
    } catch (error) {
        console.error('Start new game error:', error);
        updateTestStatus('Error: ' + error.message);
    }
}

// Test function: Purchase Revive
async function testPurchaseRevive() {
    try {
        updateTestStatus('Purchasing revive...');
        const gameId = window.gameInstance?.gameId || document.getElementById('game-id').textContent;
        
        if (!window.testContract) throw new Error('Contract not initialized');
        
        // Call the purchaseRevive function
        const priceInWei = ethers.utils.parseEther("0.5");
        const tx = await window.testContract.purchaseRevive(gameId, {
            value: priceInWei
        });
        updateTestStatus('Transaction sent: ' + tx.hash);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        updateTestStatus('Revive purchased successfully! TX: ' + receipt.transactionHash);
    } catch (error) {
        console.error('Purchase revive error:', error);
        updateTestStatus('Error: ' + error.message);
    }
}

// Test function: Check Status
async function testCheckStatus() {
    try {
        updateTestStatus('Checking revive status...');
        const gameId = window.gameInstance?.gameId || document.getElementById('game-id').textContent;
        
        if (!window.testContract) throw new Error('Contract not initialized');
        
        // Get current wallet address
        const address = await window.testSigner.getAddress();
        
        // Call the checkReviveStatus function
        const hasUsed = await window.testContract.checkReviveStatus(address, gameId);
        updateTestStatus(`Revive status for current game: ${hasUsed ? 'USED' : 'AVAILABLE'}`);
    } catch (error) {
        console.error('Check status error:', error);
        updateTestStatus('Error: ' + error.message);
    }
}

// Test function: Reset Status (admin only)
async function testResetStatus() {
    try {
        updateTestStatus('Resetting revive status...');
        const gameId = window.gameInstance?.gameId || document.getElementById('game-id').textContent;
        
        if (!window.testContract) throw new Error('Contract not initialized');
        
        // Get current wallet address
        const address = await window.testSigner.getAddress();
        
        // Call the resetReviveStatus function
        const tx = await window.testContract.resetReviveStatus(address, gameId);
        updateTestStatus('Transaction sent: ' + tx.hash);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        updateTestStatus('Revive status reset successfully! TX: ' + receipt.transactionHash);
    } catch (error) {
        console.error('Reset status error:', error);
        updateTestStatus('Error: ' + error.message);
    }
}

// Update status in the test UI
function updateTestStatus(message) {
    const statusDiv = document.getElementById('test-status');
    if (statusDiv) {
        statusDiv.textContent = message;
    }
    console.log('[Contract Test]', message);
}

// Initialize ethers.js and the test UI
(() => {
    // Load ethers.js if not already loaded
    if (!window.ethers) {
        console.log("Loading ethers.js for contract testing");
        const ethersScript = document.createElement('script');
        ethersScript.src = 'https://cdn.ethers.io/lib/ethers-5.7.2.umd.min.js';
        ethersScript.type = 'text/javascript';
        
        // Wait for ethers to load before adding the test UI
        ethersScript.onload = () => {
            console.log("Ethers.js loaded successfully");
            setTimeout(addContractTestUI, 500);
        };
        
        document.head.appendChild(ethersScript);
    } else {
        // If ethers is already loaded, add the test UI directly
        setTimeout(addContractTestUI, 500);
    }
})();

// Add security monitoring code that executes immediately at page load
(function securityMonitor() {
    // Protect Supabase API by overriding fetch
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
        // Block ALL direct Supabase API requests
        if (typeof url === 'string' && 
            (url.includes('supabase.co/rest') || 
             url.includes('nzifipuunzaneaxdxqjm'))) {
            
            console.error('🛑 SECURITY: Blocked unauthorized direct Supabase API access:', url);
            
            // Log suspicious activity
            try {
                // Report attempt without blocking game
                navigator.sendBeacon('/api/security/report', JSON.stringify({
                    type: 'unauthorized_api_access',
                    url: url,
                    timestamp: Date.now(),
                    options: JSON.stringify(options)
                }));
            } catch (e) {
                // Silently fail if beacon fails
            }
            
            // Return failed promise
            return Promise.reject(new Error('Unauthorized API access attempt detected and blocked'));
        }
        
        // Check for Supabase API keys in headers or body
        const hasApiKey = checkForApiKeys(options);
        if (hasApiKey) {
            console.error('🛑 SECURITY: Blocked request with embedded API keys');
            return Promise.reject(new Error('Unauthorized API key usage detected'));
        }
        
        // Proceed with original fetch for allowed requests
        return originalFetch.apply(this, arguments);
    };
    
    // Also monitor XMLHttpRequest to prevent direct API access
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async = true, username = null, password = null) {
        // Block ALL direct Supabase requests
        if (typeof url === 'string' && 
            (url.includes('supabase.co/rest') || 
             url.includes('nzifipuunzaneaxdxqjm'))) {
            
            console.error('🛑 SECURITY: Blocked unauthorized direct Supabase API access via XHR:', url);
            
            // Report attempt
            try {
                navigator.sendBeacon('/api/security/report', JSON.stringify({
                    type: 'unauthorized_xhr_access',
                    url: url,
                    timestamp: Date.now()
                }));
            } catch (e) {
                // Silently fail if beacon fails
            }
            
            // Block the request by pointing it to a non-existent endpoint
            url = '/api/blocked';
        }
        
        // Call original open with potentially modified url
        return originalOpen.call(this, method, url, async, username, password);
    };
    
    // Add new XMLHttpRequest.send override to check for API keys in body
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(body) {
        // Check if body contains API keys
        if (body && typeof body === 'string' && 
            (body.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9') || 
             body.includes('supabase'))) {
            
            console.error('🛑 SECURITY: Blocked XHR with suspicious body content');
            
            // Report attempt
            try {
                navigator.sendBeacon('/api/security/report', JSON.stringify({
                    type: 'suspicious_xhr_body',
                    body_sample: body.substring(0, 100) + '...',
                    timestamp: Date.now()
                }));
            } catch (e) {
                // Silently fail if beacon fails
            }
            
            // Block by calling with empty body
            return originalSend.call(this, '');
        }
        
        // Call original send with original body
        return originalSend.apply(this, arguments);
    };
    
    // Helper function to check for API keys in request options
    function checkForApiKeys(options) {
        // List of protected API key patterns
        const protectedPatterns = [
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',  // JWT header pattern
            'nzifipuunzaneaxdxqjm'                   // Project reference
        ];
        
        // Check headers
        if (options && options.headers) {
            const headers = options.headers;
            
            // Convert headers to string if it's a Headers object
            const headersString = headers instanceof Headers ? 
                Array.from(headers.entries()).toString() : 
                JSON.stringify(headers);
            
            // Check if any protected pattern is in headers
            if (protectedPatterns.some(pattern => headersString.includes(pattern))) {
                return true;
            }
            
            // Check specific header fields that might contain API keys
            const sensitiveHeaders = ['apikey', 'authorization', 'key', 'api-key', 'x-api-key'];
            
            for (const header of sensitiveHeaders) {
                const value = headers[header] || headers.get?.(header);
                if (value && protectedPatterns.some(pattern => value.includes(pattern))) {
                    return true;
                }
            }
        }
        
        // Check body
        if (options && options.body) {
            const body = typeof options.body === 'string' ? 
                options.body : 
                JSON.stringify(options.body);
                
            if (protectedPatterns.some(pattern => body.includes(pattern))) {
                return true;
            }
        }
        
        return false;
    }
})();