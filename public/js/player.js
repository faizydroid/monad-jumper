import {Bullet} from './bullet.js'

export class Player {
    constructor(game) {
        this.game = game
        this.sizeModifier = 0.3
        this.width = 480 * this.sizeModifier
        this.height = 500 * this.sizeModifier
        this.x = this.game.platforms.filter(platform => platform.type=='green').slice(-1)[0].x + 6
        this.y = this.game.platforms.filter(platform => platform.type=='green').slice(-1)[0].y - this.height 
        this.min_y = this.game.height * 0.3 // Adjust to 30% of screen height from the top
        this.min_vy = -18
        this.max_vy = this.game.platforms[0].height
        this.vy = this.min_vy     
        this.weight = 0.5
        this.image = document.querySelector('#monad0')
        this.vx = 0
        this.max_vx = 8
        this.bullets = []
        this.bulletTimer = 0
        this.bulletInterval = 100
        this.lastPlatformType = null
        this.jumpedPlatforms = new Set()
    }

    update(inputHandler, deltaTime = 1/60, gyroData) {
        // If game is over, don't process any more updates
        if (this.game.gameOver) {
            return;
        }
        
        // Fixed gameplay constants for consistent physics
        const PLAYER_SPEED = 8 * 60; // Speed units per second
        const GRAVITY = 0.5; // Original gravity value without deltaTime scaling

        // Check if player has fallen off the screen
        if (this.y > this.game.height) {
            if (!this.game.gameOver) {
                this.game.gameOver = true;
                this.game.deathReason = "fall";
                this.game.checkGameOver();
            }
            return;
        }

        // Horizontal movement - scale by deltaTime for frame-rate independence
        if(inputHandler.keys.includes('ArrowLeft')){
            this.vx = -PLAYER_SPEED * deltaTime;
        }
        else if(inputHandler.keys.includes('ArrowRight')){
            this.vx = PLAYER_SPEED * deltaTime;
        }
        else if(this.vx !== 0) {
            this.vx = 0;
        }
        
        // Only update x position if there's velocity - normalized by delta time
        if(this.vx !== 0) {
            // Apply movement scaled by deltaTime
            this.x += this.vx;

            // Horizontal boundary - only check when we've moved
            if(this.x < -this.width/2) this.x = this.game.width - (this.width/2);
            else if(this.x + (this.width/2) > this.game.width) this.x = -this.width/2;
        }

        // Apply gravity first
        if(this.vy < this.max_vy) {
            this.vy += GRAVITY; // Original gravity without deltaTime scaling
        }

        // Variable to track if we've had a platform collision
        let hadPlatformCollision = false;
        
        // Optimized collision detection - only use sub-stepping for extreme velocities
        if (Math.abs(this.vy) > 15) { // Only use expensive sub-stepping when absolutely necessary
            // Use just 2 or 3 steps max to reduce performance impact
            const steps = Math.min(3, Math.ceil(Math.abs(this.vy) / 10));
            const stepVy = this.vy / steps;
            
            // Apply each step separately with early exit
            for (let i = 0; i < steps && !hadPlatformCollision; i++) {
                this.y += stepVy;
                
                // Only check collisions with platforms that are close to the player
                // to avoid unnecessary collision checks
                const platformType = this.onPlatform();
                if (platformType) {
                    this.lastPlatformType = platformType;
                    this.processJump(platformType);
                    hadPlatformCollision = true;
                    break;
                }
            }
        } else {
            // For normal speeds, just do a single movement and collision check
            // Move the player
            if (this.y > this.min_y || this.vy > GRAVITY) {
                this.y += this.vy;
            }
            
            // Then check for platform collision
            if (this.vy > GRAVITY) {
                const platformType = this.onPlatform();
            if (platformType) {
                this.lastPlatformType = platformType;
                this.processJump(platformType);
                    hadPlatformCollision = true;
            }
        }
        }

        // World scrolling when player reaches upper threshold - original calculations
        if(this.y <= this.min_y && this.vy < GRAVITY) {
            this.game.vy = -this.vy; // Use the original vy value
            this.y = this.min_y;
        }
        else if(this.game.vy !== 0) {
            this.game.vy = 0;
        }

        // Check for collision - only done when necessary
        if((this.vx !== 0 || this.vy !== 0) && this.collision()){
            this.game.gameOver = true;
            this.game.deathReason = "collision";
            this.game.checkGameOver();
            return; // Stop further processing
        }

        // Update bullets with deltaTime
        for(let i = 0; i < this.bullets.length; i++) {
            this.bullets[i].update(deltaTime);
        }

        // Remove deleted bullets
        if(this.bullets.some(bullet => bullet.markedForDeletion)) {
            this.bullets = this.bullets.filter(bullet => !bullet.markedForDeletion);
        }

        // Shooting logic with fixed time intervals factoring deltaTime
        if ((inputHandler.keys.includes(' ') || inputHandler.keys.includes('w') || inputHandler.keys.includes('W')) && 
            this.bulletTimer > this.bulletInterval) {
            this.shootTop();
            this.bulletTimer = 0;
        } else {
            this.bulletTimer += 10 * 60 * deltaTime; // Scale by deltaTime (10 units per frame @ 60fps)
        }
    }

    draw(context) {
        // Draw bullets first so they appear under the player
        for (let i = 0; i < this.bullets.length; i++) {
            this.bullets[i].draw(context);
        }
        
        // Then draw the player
        context.drawImage(this.image, this.x, this.y, this.width, this.height);
    }

    collision(){
        if (!this.game.enemies || this.game.enemies.length === 0) {
            return false;
        }
        
        // Precalculate player hitbox once
        const playerHitBox = {
            x: this.x + 15, 
            y: this.y, 
            width: this.width - 30, 
            height: this.height
        };
        
        // Cache hitbox bounds for faster comparisons
        const playerLeft = playerHitBox.x;
        const playerRight = playerHitBox.x + playerHitBox.width;
        const playerTop = playerHitBox.y;
        const playerBottom = playerHitBox.y + playerHitBox.height;
        
        // Approximate distance check to avoid detailed calculations for far enemies
        const collisionMargin = playerHitBox.width + playerHitBox.height;
        
        // Use for...of for better performance with early exit
        for (const enemy of this.game.enemies) {
            // Quick distance check before detailed collision detection
            const dx = (enemy.x + enemy.width/2) - (playerLeft + playerHitBox.width/2);
            const dy = (enemy.y + enemy.height/2) - (playerTop + playerHitBox.height/2);
            if (Math.abs(dx) > collisionMargin || Math.abs(dy) > collisionMargin) {
                continue; // Skip detailed check if enemy is far away
            }
            
            // Get the reduced hitbox of the enemy if available, otherwise use full size
            let enemyHitbox;
            if (typeof enemy.getHitbox === 'function') {
                enemyHitbox = enemy.getHitbox();
            } else {
                enemyHitbox = {
                    x: enemy.x,
                    y: enemy.y,
                    width: enemy.width,
                    height: enemy.height
                };
            }
            
            // Cache enemy bounds for faster comparisons
            const enemyLeft = enemyHitbox.x;
            const enemyRight = enemyHitbox.x + enemyHitbox.width;
            const enemyTop = enemyHitbox.y;
            const enemyBottom = enemyHitbox.y + enemyHitbox.height;
            
            // Optimized collision check using cached values
            if (playerLeft < enemyRight && 
                playerRight > enemyLeft && 
                playerTop < enemyBottom && 
                playerBottom > enemyTop) {
                return true;
            }
        }
      
        return false;
    }

    onPlatform(){
        if (!this.game.platforms || this.game.platforms.length === 0) {
            return null;
        }
        
        // Calculate more accurate hitbox based on the character's feet
        const playerHitBox = {
            x: this.x + 15, 
            y: this.y, 
            width: this.width - 30,
            height: this.height
        };
        
        // Cache player bounds - focus on feet area
        const playerLeft = playerHitBox.x;
        const playerRight = playerHitBox.x + playerHitBox.width;
        const playerBottom = playerHitBox.y + playerHitBox.height;
        
        // Skip collision detection entirely if:
        // 1. Player is moving upward fast (like from a spring) OR
        // 2. Player recently jumped from a spring (within last 500ms)
        const recentSpringJump = this.lastSpringJump && (Date.now() - this.lastSpringJump < 500);
        if (this.vy < -10 || recentSpringJump) {
            return null;
        }
        
        // Performance optimization: Only check platforms that are near the player vertically
        // This drastically reduces the number of platforms we need to check
        const checkDistance = Math.max(20, Math.abs(this.vy) * 2); // Check further when moving fast
        
        // First, find candidate platforms using vertical distance culling
        const candidatePlatforms = [];
        const brownPlatforms = [];
        
        for (let i = 0; i < this.game.platforms.length; i++) {
            const platform = this.game.platforms[i];
            
            // Skip platforms that are far away vertically
            const verticalDistance = Math.abs(platform.y - playerBottom);
            if (verticalDistance > checkDistance) continue;
                
            // Skip platforms that don't overlap horizontally
            if (platform.x > playerRight || platform.x + platform.width < playerLeft) continue;
            
            // Special handling for brown platforms
            if (platform.type === 'brown') {
                brownPlatforms.push(platform);
                        } else {
                candidatePlatforms.push(platform);
            }
        }
        
        // Improved tunneling prevention - increase the prediction distance based on velocity
        const velocityFactor = Math.max(1, Math.abs(this.vy) / 2);
        const nextPlayerBottom = playerBottom + (this.vy * velocityFactor);
        
        // Check collision with regular platforms (non-brown)
        for (let i = 0; i < candidatePlatforms.length; i++) {
            const platform = candidatePlatforms[i];
            const platformTop = platform.y;
            
            // Enhanced Y-axis collision detection - ONLY check when player is falling or at peak
            const currentY_test = (this.vy >= 0) && // Only when falling or at peak
                             (platformTop - playerBottom >= -8) && 
                             (platformTop - playerBottom <= 8);
                             
            // Predictive collision check - ONLY when player is falling
            const nextY_test = (this.vy > 0) && // Only when falling
                             (playerBottom <= platformTop) && 
                             (nextPlayerBottom >= platformTop) &&
                             (nextPlayerBottom <= platformTop + 15);
            
            // Check if this is a valid platform we're colliding with
            if (currentY_test || nextY_test) {
                if (platform.type === 'white') {
                    // Mark white platforms for deletion and return immediately
                    platform.markedForDeletion = true;
                    
                    // If we're using the predictive check, adjust player position
                    if (nextY_test && !currentY_test) {
                        this.y = platformTop - playerHitBox.height;
                    }
                    
                    return platform.type;
                } else {
                    // For green/blue/spring platforms
                    // If we're using the predictive check, adjust player position
                    if (nextY_test && !currentY_test) {
                        this.y = platformTop - playerHitBox.height;
                        // Reset vertical velocity immediately to prevent any residual downward movement
                        this.vy = 0;
                    }
                    
                    // If we didn't find any brown platforms, return this type
                    if (brownPlatforms.length === 0) {
                        return platform.type;
                    }
                }
            }
        }
        
        // Check brown platforms if no regular platform collision was detected
        if (brownPlatforms.length > 0) {
            // Mark all brown platforms for deletion
            for (let i = 0; i < brownPlatforms.length; i++) {
                brownPlatforms[i].markedForDeletion = true;
        }
        
            // Set a small downward velocity immediately to help detect platforms below
            this.vy = Math.max(this.vy, 2);
            return 'brown';
        }
      
        return null;
    }
        
    shootTop() {
        this.bullets.push(new Bullet(this))
    }

    // This is the original method kept for reference but not used directly anymore
    async jump(platformType) {
        // Play appropriate sound through AudioManager first, fallback to direct Audio API
        try {
            if (window.audioManager && typeof window.audioManager.play === 'function') {
                if (platformType === 'white') {
                    window.audioManager.play('singleJump', 0.7);
                } else if (platformType === 'blue' || platformType === 'green') {
                    window.audioManager.play('jump', 0.7);
                } else if (platformType === 'brown') {
                    window.audioManager.play('noJump', 0.7);
                } else if (platformType === 'spring') {
                    window.audioManager.play('spring', 0.7);
                }
            } else {
                // Fallback to direct Audio API
                if (platformType === 'white') {
                    new Audio('sound effects/single_jump.mp3').play().catch(e => {});
                } else if (platformType === 'blue' || platformType === 'green') {
                    new Audio('sound effects/jump.wav').play().catch(e => {});
                } else if (platformType === 'brown') {
                    new Audio('sound effects/no_jump.mp3').play().catch(e => {});
                } else if (platformType === 'spring') {
                    new Audio('sound effects/spring.mp3').play().catch(e => {});
                }
            }
        } catch (e) {
            console.warn('Error playing jump sound:', e);
        }

        // Instead of waiting for transaction, immediately apply jump physics
        if (platformType === 'white' || platformType === 'blue' || platformType === 'green') {
            this.vy = this.min_vy;
        } else if (platformType === 'brown') {
            this.vy = 2;
        } else if (platformType === 'spring') {
            this.vy = -36;
        }
        
        // Always return true so game continues
        return true;
    }

    jump() {
        if (this.canJump) {
            // Play jump sound with near-zero latency using AudioManager
            try {
                if (window.audioManager && typeof window.audioManager.play === 'function') {
                    window.audioManager.play('jump', 0.7);
                } else {
                    new Audio('sound effects/jump.wav').play().catch(e => {});
                }
            } catch (e) {
                console.warn('Error playing jump sound:', e);
            }
            
            // Don't increment jump count here - let processJump handle it
            // The processJump method will only count first jumps on platforms
            
            // Rest of jump code...
        }
    }

    // Modified to restore original jump heights
    processJump(platformType) {
        // Create unique platform ID based on position
        const platform = this.game.platforms.find(p => 
            p.type === platformType && 
            Math.abs((this.y + this.height) - p.y) < 10 &&
            this.x + this.width > p.x &&
            this.x < p.x + p.width
        );
        
        if (!platform) return;
        
        // Create a unique ID for this platform
        const platformId = `${platform.id || `${platform.x.toFixed(0)}-${platform.y.toFixed(0)}`}`;
        
        // Check if we've already jumped on this platform
        const isFirstJump = !this.jumpedPlatforms.has(platformId);
        
        // Play appropriate sound for the platform type
        try {
            if (window.audioManager && typeof window.audioManager.play === 'function') {
                if (platformType === 'white') {
                    window.audioManager.play('singleJump', 0.7);
                } else if (platformType === 'blue' || platformType === 'green') {
                    window.audioManager.play('jump', 0.7);
                } else if (platformType === 'brown') {
                    window.audioManager.play('noJump', 0.7);
                } else if (platformType === 'spring') {
                    window.audioManager.play('spring', 0.7);
                }
            }
        } catch (e) {
            console.warn('Error playing platform sound:', e);
        }
        
        // Use original jump velocity values
        switch(platformType) {
            case 'white': 
            case 'blue': 
            case 'green':
                // Standard jump with original velocity
                this.vy = this.min_vy; // Using the original -18 value
                break;
                
            case 'brown':
                // Original small positive velocity for falling
                this.vy = 2;
                break;
                
            case 'spring':
                // Original super high jump velocity
                this.vy = -36; // Original fixed value
                
                // When jumping from spring, temporarily ignore platform collisions
                // by setting a flag or timer that prevents collisions for a short time
                this.lastSpringJump = Date.now();
                
                // We still need to set spring platforms to pressed state
                // This is essential for gameplay visuals
                const playerBottom = this.y + this.height;
                for (const p of this.game.platforms) {
                    if (p.type === 'spring' && 
                        Math.abs(p.y - playerBottom) < 30 &&
                        this.x + this.width > p.x &&
                        this.x < p.x + p.width) {
                        p.setPressed();
                        break;
                    }
                }
                break;
        }
        
        // Increment jump count only if this is the first time on this platform
        if (isFirstJump) {
            window.__jumpCount = (window.__jumpCount || 0) + 1;
            console.log(`🦘 First jump on platform ${platformId} - count: ${window.__jumpCount}`);
            
            // Notify parent of jump for UI updates
            if (typeof sendMessageToParent === 'function') {
                sendMessageToParent({
                    type: 'JUMP_PERFORMED',
                    data: {
                        jumpCount: window.__jumpCount,
                        timestamp: Date.now()
                    }
                });
            }
            
            // Add to the set of jumped platforms
            this.jumpedPlatforms.add(platformId);
        } else {
            console.log(`Repeated jump on platform ${platformId} - not counting`);
        }
    }

    // Also update the reset method in Game class to clear jumpedPlatforms
    reset() {
        // Reset the set of jumped platforms
        this.jumpedPlatforms.clear();
        // Rest of reset code...
    }
}