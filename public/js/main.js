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
        // Log to verify it's being tracked
        console.log(`Main.js: Jump #${window.totalJumps} tracked`);
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
        
        // Log the new dimensions
        console.log(`Canvas resized to: ${canvasWidth}x${canvasHeight}`);
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
            this.gameOverButtons = {
                tryAgain: {
                    x: canvas.width / 2 - 60, // Center the larger image
                    y: canvas.height / 2 + 180, // Move further down
                    width: 120, // Increase size
                    height: 120, // Increase size
                    text: 'Try Again'
                }
            };

            // Initialize click handler in constructor
            canvas.addEventListener('click', (event) => this.handleGameOverClick(event));
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
            
            // Update platforms with deltaTime
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
            
            // Update enemies with deltaTime
            const enemyCount = this.enemies.length;
            for (let i = 0; i < enemyCount; i++) {
                this.enemies[i].update(deltaTime);
            }

            // Remove deleted objects
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
            
            // Memory management - ensure we don't leak memory
            if (this.platforms.length > 100) {
                // Too many platforms, trim the oldest ones
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

            // Optimize platform drawing with culling and direct indexing
            const platformCount = this.platforms.length;
            for (let i = 0; i < platformCount; i++) {
                const platform = this.platforms[i];
                // Only draw platforms that are on or near the screen
                if (platform.y < this.height + this.cullMargin && 
                    platform.y + platform.height > -this.cullMargin) {
                    platform.draw(context);
                }
            }
            
            this.player.draw(context);
            
            // Optimize enemy drawing with culling and direct indexing
            const enemyCount = this.enemies.length;
            for (let i = 0; i < enemyCount; i++) {
                const enemy = this.enemies[i];
                // Only draw enemies that are on or near the screen
                if (enemy.y < this.height + this.cullMargin && 
                    enemy.y + enemy.height > -this.cullMargin) {
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
            context.fillText(`Score: ${Math.floor(this.score)}`, 20, 40);
            
            // Draw jumps counter on the right side
            context.textAlign = 'end';
            context.fillText(`Jumps: ${window.__jumpCount || 0}`, this.width - 20, 40);
            // Reset text alignment
            context.textAlign = this.scoreTextFormat.align;

            // Draw debug panel
            if (this.debugPanel && typeof this.debugPanel.draw === 'function') {
                this.debugPanel.draw(context);
            }

            // Draw game over screen if needed
            if (this.gameOver) {
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
            console.log('Setting game over state');
            this.gameOver = true;

            const finalScore = Math.floor(this.score);
            console.log(`Game Over - Sending final score: ${finalScore} with ${window.totalJumps} jumps`);
            
            // Post message to parent window
            if (window.parent) {
                try {
                    window.parent.postMessage({
                        type: 'gameOver',
                        score: finalScore,
                        jumps: window.totalJumps
                    }, '*');
                    
                    // Also send as gameScore for backward compatibility
                    window.parent.postMessage({
                        type: 'gameScore',
                        score: finalScore,
                        jumps: window.totalJumps
                    }, '*');
                    
                    console.log('Game over messages sent to parent');
                } catch (err) {
                    console.error('Failed to post game over message:', err);
                }
            }
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
            if (!this.gameOver) return;

            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (event.clientX - rect.left) * scaleX;
            const y = (event.clientY - rect.top) * scaleY;

            // Check only the Try Again button
            const tryAgain = this.gameOverButtons.tryAgain;
            if (x >= tryAgain.x && x <= tryAgain.x + tryAgain.width &&
                y >= tryAgain.y && y <= tryAgain.y + tryAgain.height) {
                console.log("RELOAD BUTTON CLICKED!");
                
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
            console.log("🔄 FULL GAME RESET");
            
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
            
            // IMPORTANT: Reset ALL jump counters
            window.__jumpCount = 0;
            window.totalJumps = 0;
            this.finalJumpCount = 0;
            this.isGameOver = false;
            console.log("🔄 All jump counters reset to 0");
            
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
                console.log("🔄 Cleared player's jumped platforms tracking");
            }
            
            // Add initial platforms
            this.add_platforms(0, this.height-15);
            this.add_broken_platforms(0, this.height-15);
            this.add_platforms(-this.height, -15);
            this.add_broken_platforms(-this.height, -15);

            // Reset transaction tracking
            this.pendingJumps = [];
            this.jumpTimestamps = [];
            console.log("🔄 Game reset - All jump transactions cleared");

            // Reset the jump count sent flag
            this.jumpCountSent = false;
        }

        animate() {
            // Use requestAnimationFrame with proper deltaTime calculation
            let lastTime = performance.now();
            
            const gameLoop = (timestamp) => {
                // Calculate the delta time in seconds
                const deltaTime = (timestamp - lastTime) / 1000;
                lastTime = timestamp;
                
                // Only update if game is active
                if (this.gameStart && !this.gameOver) {
                    try {
                        this.update(deltaTime);
                    } catch (e) {
                        console.error("Error in game update:", e);
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
                        console.warn('Error playing collision sound:', e);
                    }
                } else if (this.player.y > this.canvas.height) {
                    this.deathReason = "fall";
                    
                    // Play fall sound
                    try {
                        if (window.audioManager && typeof window.audioManager.play === 'function') {
                            window.audioManager.play('fall', 0.7);
                        } else if (typeof this.playFallSound === 'function') {
                            this.playFallSound();
                        }
                    } catch(e) {
                        console.warn('Error playing fall sound:', e);
                    }
                } else {
                    this.deathReason = "unknown";
                }

                // Get final score and jump count
                const finalScore = Math.floor(this.score);
                const jumpCount = window.__jumpCount || 0;
                
                console.log('🎮 GAME OVER');
                console.log(`📊 Final Score: ${finalScore}, Total Jumps: ${jumpCount}`);
                
                // Set game over state first
                this.isGameOver = true;
                this.gameOver = true;
                
                // Store the fact that we sent the game over message
                this.gameOverMessageSent = true;
                
                // Play game over sound
                try {
                    if (window.audioManager && typeof window.audioManager.play === 'function') {
                        window.audioManager.play('gameOver', 0.7);
                    }
                } catch(e) {
                    console.warn('Error playing game over sound:', e);
                }
                
                // Use safe message sending function - SEND ONLY ONE MESSAGE WITH ALL DATA
                try {
                    // Use a unique ID to prevent duplicate transactions
                    const gameOverId = Date.now().toString();
                        
                    // Send a single comprehensive message with all required data
                    console.log(`📤 Sending single game over notification with ID: ${gameOverId}`);
                    
                    // Send a single message with a transaction flag
                    sendMessageToParent({
                        type: 'GAME_OVER',
                        transactionRequired: true,  // Flag indicating this should trigger a transaction
                        gameOverId: gameOverId,     // Unique ID to prevent duplicates
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
                        
                    console.log(`📤 Game over notification sent to parent window`);
                    } catch (error) {
                    console.error('❌ Error notifying parent window:', error);
                }
                
                return true;
            }
            return false;
        }

        startGame() {
            if (!this.gameStart) {
                console.log('Starting game');
                window.totalJumps = 0; // Reset jump counter using window variable
                this.gameStart = true;
                this.gameOver = false;
                this.isGameOver = false;
                this.score = 0;
                
                // Play background music when game starts
                if (window.audioManager) {
                    window.audioManager.playBackgroundMusic();
                } else {
                    // Fallback if audioManager is not available
                    const bgMusic = document.getElementById('bg-music');
                    if (bgMusic) {
                        bgMusic.play().catch(err => {
                            console.warn('Could not autoplay background music:', err);
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
                controlsGuide.innerHTML = '<img src="/images/arrow.png" alt="Left/Right Arrows" style="height: 30px; vertical-align: middle; margin-right: 10px;"> MOVE | <img src="/images/spacebar.png" alt="Spacebar" style="height: 30px; vertical-align: middle; margin: 0 10px;"> SHOOT!';
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
            
            console.log(`🎮 Jump #${jumpData.jumpNumber} recorded for bundling`);
            
            // Notify parent of the jump for UI updates using safe function
            sendMessageToParent({
                type: 'JUMP_PERFORMED',
                data: {
                    jumpCount: window.__jumpCount,
                    timestamp: jumpData.timestamp
                }
            });
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
            
            // Add touch event for jumping/firing
            this.canvas.addEventListener('touchstart', (event) => {
                event.preventDefault(); // Prevent scrolling
                
                // Tap to jump/fire
                if (this.gameStart && !this.gameOver) {
                    // Jump action
                    this.player.jump();
                    
                    // Let the player's processJump method handle jump counting
                    // Do not increment window.__jumpCount here
                    // The processJump method will handle counting only first jumps on platforms
                    
                    // Play jump sound if available
                    if (window.audioManager) {
                        window.audioManager.play('jump', 0.7);
                    }
                    
                    // Do not notify parent of jump here - the processJump method will do this
                } else if (!this.gameStart) {
                    // Start the game on touch if not started
                    this.startGame();
                }
            }, { passive: false });
            
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
            
            // Add on-screen controls as a fallback
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
            // Create control container
            const controlsContainer = document.createElement('div');
            controlsContainer.id = 'mobile-controls';
            controlsContainer.style.position = 'absolute';
            controlsContainer.style.bottom = '10px';
            controlsContainer.style.left = '0';
            controlsContainer.style.width = '100%';
            controlsContainer.style.display = 'flex';
            controlsContainer.style.justifyContent = 'space-between';
            controlsContainer.style.padding = '0 20px';
            controlsContainer.style.boxSizing = 'border-box';
            controlsContainer.style.zIndex = '999';
            
            // Create left button
            const leftBtn = document.createElement('button');
            leftBtn.id = 'left-btn';
            leftBtn.innerText = '←';
            leftBtn.style.width = '70px';
            leftBtn.style.height = '70px';
            leftBtn.style.fontSize = '30px';
            leftBtn.style.backgroundColor = 'rgba(255,90,95,0.7)';
            leftBtn.style.color = 'white';
            leftBtn.style.border = 'none';
            leftBtn.style.borderRadius = '50%';
            leftBtn.style.padding = '0';
            leftBtn.style.lineHeight = '1';
            
            // Create right button
            const rightBtn = document.createElement('button');
            rightBtn.id = 'right-btn';
            rightBtn.innerText = '→';
            rightBtn.style.width = '70px';
            rightBtn.style.height = '70px';
            rightBtn.style.fontSize = '30px';
            rightBtn.style.backgroundColor = 'rgba(255,90,95,0.7)';
            rightBtn.style.color = 'white';
            rightBtn.style.border = 'none';
            rightBtn.style.borderRadius = '50%';
            rightBtn.style.padding = '0';
            rightBtn.style.lineHeight = '1';
            
            // Add event listeners for buttons
            leftBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.player) this.player.moveLeft();
            }, { passive: false });
            
            leftBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (this.player) this.player.stopMoving();
            }, { passive: false });
            
            rightBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.player) this.player.moveRight();
            }, { passive: false });
            
            rightBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (this.player) this.player.stopMoving();
            }, { passive: false });
            
            // Add buttons to container
            controlsContainer.appendChild(leftBtn);
            controlsContainer.appendChild(rightBtn);
            
            // Add container to body
            document.body.appendChild(controlsContainer);
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
    }
    
    const game = new Game(canvas.width,canvas.height)
    window.gameInstance = game; // Make game globally accessible
    
    // Replace the existing animate function with a proper game loop using deltaTime
    let lastTime = performance.now();
    
    function animate(currentTime) {
        // Calculate delta time in seconds for consistent movement
        const deltaTime = (currentTime - lastTime) / 1000; 
        lastTime = currentTime;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update game if active
        if (game.gameStart && !game.gameOver) {
            // Pass deltaTime but preserve original jump physics
            game.update(deltaTime);
        }
        
        // Draw game
        game.draw(ctx);
        
        // Continue the loop
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
            console.log(`Jump #${window.totalJumps} detected (will be bundled at game over)`);
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
    
    // Check if game is over and jumps haven't been saved yet
    if (game.gameOver && !jumpState.gameOverDetected) {
      // Mark game over as detected to prevent multiple triggers
      jumpState.gameOverDetected = true;
      
      // Get final jump count
      const jumps = game.finalJumpCount || jumpState.currentJumps;
      
      // Skip if the main game over message already sent a transaction
      if (game.gameOverMessageSent) {
        console.log('🛑 Game already sent game over message - skipping duplicate transaction');
        return;
      }
      
      // Only send if the main game over didn't already send it
      if (jumps > 0 && !jumpState.saveMessageSent) {
        console.log(`🎮 Game over detected with ${jumps} jumps - preparing to save...`);
        
        // Add slight delay to ensure we only save once
        setTimeout(() => {
          // Double-check that the main game didn't send a transaction during our timeout
          if (!jumpState.saveMessageSent && !game.gameOverMessageSent) {
            sendJumpSaveMessage(jumps);
          } else {
            console.log('🛑 Jump save message already sent - preventing duplicate');
          }
        }, 1000);
      }
    }
    
    // If game is back in play, reset the game over detection
    if (!game.gameOver && jumpState.gameOverDetected) {
      jumpState.gameOverDetected = false;
    }
  }
  
  // Create a single interval for the monitor function
  const monitorInterval = setInterval(monitorGameAndSaveJumps, 2000);
  
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
            bgMusic: 'sound effects/bgmusic.mp3',
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
            window.parent.postMessage(messageData, '*');
            return true;
        }
        return false;
    } catch (err) {
        console.warn('Could not send message to parent window:', err);
        return false;
    }
}