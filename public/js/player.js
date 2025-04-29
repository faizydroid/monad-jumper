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
        this.jumpRequested = false
        this.lastPlatformType = null
        this.lastTxTime = 0
        this.txCooldown = 500 // 500ms cooldown between transactions
        this.lastJumpRequestTime = 0
    }

    update(inputHandler) {
        // If game is over, don't process any more jumps
        if (this.game.gameOver) {
            return;
        }
        
        // If we've been waiting for a jump transaction more than 2 seconds, force continue
        if (this.jumpRequested && Date.now() - this.lastJumpRequestTime > 2000) {
            console.log('Jump transaction taking too long - forcing continuation');
            this.jumpRequested = false;
        }

        // Check if player has fallen off the screen
        if (this.y > this.game.height) {
            if (!this.game.gameOver) {  // Add check to prevent multiple triggers
                console.log('Player fell off screen, triggering game over');
                this.game.gameOver = true;
                
                // Create a global function to directly play the fall sound
                // This helps avoid scope and context issues
                window.playFallSound = function() {
                    console.log("Global playFallSound triggered");
                    // We'll try multiple methods in sequence
                    
                    // Method 1: Direct inline audio element in the DOM
                    const audioEl = document.createElement('audio');
                    audioEl.src = 'sound effects/fall.mp3';
                    audioEl.volume = 1.0;
                    audioEl.controls = false; // No visible controls
                    audioEl.style.display = 'none'; // Hide element
                    document.body.appendChild(audioEl);
                    
                    // Play with timeout to ensure it's properly loaded
                    setTimeout(() => {
                        audioEl.play()
                            .then(() => {
                                console.log("Fall sound played via inline element");
                                // Remove the element after playing
                                setTimeout(() => audioEl.remove(), 3000);
                            })
                            .catch(e => {
                                console.error("Inline element play failed:", e);
                                // Try embedded audio element as fallback
                                const fallbackEl = document.getElementById('sound-fall');
                                if (fallbackEl) {
                                    fallbackEl.currentTime = 0;
                                    fallbackEl.volume = 1.0;
                                    fallbackEl.play()
                                        .then(() => console.log("Fall sound played via fallback element"))
                                        .catch(e => console.error("Fallback element play failed:", e));
                                }
                            });
                    }, 100);
                };
                
                // Execute the global function
                window.playFallSound();
                
                // Also try our other methods in parallel
                // DIRECT APPROACH: Play fall sound immediately with multiple methods
                console.log('Attempting to play fall sound directly');
                
                // Method 1: Direct audio element with inline creation to avoid autoplay issues
                try {
                    const fallSound = new Audio('sound effects/fall.mp3');
                    fallSound.volume = 1.0;
                    document.body.appendChild(fallSound); // Adding to DOM helps on some browsers
                    fallSound.oncanplaythrough = function() {
                        console.log('Fall sound loaded, playing now');
                        fallSound.play()
                            .then(() => console.log('Fall sound played successfully'))
                            .catch(e => console.error('Error playing fall sound:', e));
                    };
                    fallSound.onerror = function() {
                        console.error('Error loading fall sound');
                    };
                    fallSound.load();
                } catch (e) {
                    console.error('Error creating fall sound:', e);
                }
                
                // Method 2: Use existing audio element if available
                try {
                    const fallSoundElement = document.getElementById('sound-fall');
                    if (fallSoundElement) {
                        console.log('Found sound-fall element, playing it');
                        fallSoundElement.volume = 1.0;
                        fallSoundElement.currentTime = 0;
                        fallSoundElement.play()
                            .then(() => console.log('Fall sound element played successfully'))
                            .catch(e => console.error('Error playing fall sound element:', e));
                    }
                } catch (e) {
                    console.error('Error with fall sound element:', e);
                }
                
                // Method 3: Use AudioUtils if available (as a backup)
                if (window.AudioUtils) {
                    console.log('Using AudioUtils to play fall sound');
                    window.AudioUtils.playSound('fall', 1.0);
                }
                
                // Pause any enemy sounds
                for (const enemy of this.game.enemies) {
                    if (enemy.audio && typeof enemy.audio.pause === 'function') {
                        enemy.audio.pause();
                    }
                }
                
                // Let the game's checkGameOver method handle showing the game over screen
                this.game.checkGameOver();
            }
            return;
        }

        // horizontal movement - optimize by only calculating when necessary
        if(inputHandler.keys.includes('ArrowLeft')){
            this.vx = -this.max_vx;
        }
        else if(inputHandler.keys.includes('ArrowRight')){
            this.vx = this.max_vx;
        }
        else if(this.vx !== 0) {
            this.vx = 0;
        }
        
        // Only update x position if there's velocity
        if(this.vx !== 0) {
            this.x += this.vx;

            // horizontal boundary - only check when we've moved
            if(this.x < -this.width/2) this.x = this.game.width - (this.width/2);
            else if(this.x + (this.width/2) > this.game.width) this.x = -this.width/2;
        }

        // vertical movement
        if(this.vy > this.weight) {  
            const platformType = this.onPlatform();
            if (platformType) {
                this.lastPlatformType = platformType;
                this.jumpRequested = true;
                // Start jump immediately but process transaction in background
                this.processJump(platformType);
            }
        }

        // Apply gravity and update vertical position
        if(this.vy < this.max_vy) this.vy += this.weight;
        
        // Only update Y if we need to
        if(this.y > this.min_y || this.vy > this.weight) {
            this.y += this.vy;
        }

        // World scrolling when player reaches upper threshold
        if(this.y <= this.min_y && this.vy < this.weight) {
            this.game.vy = -this.vy;
            this.y = this.min_y;
        }
        else if(this.game.vy !== 0) {
            this.game.vy = 0;
        }

        // Check for collision with enemies only if we've moved
        if((this.vx !== 0 || this.vy !== 0) && this.collision()){
            console.log('Player collided with virus, triggering game over');
            this.game.gameOver = true;
            
            // Pause any enemy sounds (use for...of for better performance with early exit)
            for(const enemy of this.game.enemies) {
                if (enemy.audio && typeof enemy.audio.pause === 'function') {
                    enemy.audio.pause();
                }
            }
            
            // Play crash sound
            try {
                new Audio('sound effects/crash.mp3').play().catch(e => console.log("Error playing crash sound"));
            } catch (e) {
                console.log("Error playing crash sound:", e);
            }
            
            // Let the game's checkGameOver method handle showing the game over screen
            this.game.checkGameOver();
            return; // Stop further processing
        }

        // Update bullets - use direct loop for better performance
        for(let i = 0; i < this.bullets.length; i++) {
            this.bullets[i].update();
        }

        // Optimize bullet filtering - only filter if needed
        if(this.bullets.some(bullet => bullet.markedForDeletion)) {
            this.bullets = this.bullets.filter(bullet => !bullet.markedForDeletion);
        }

        // Shooting logic
        if (inputHandler.keys.includes(' ') && this.bulletTimer > this.bulletInterval){
            this.shootTop();
            this.bulletTimer = 0;
        } else {
            this.bulletTimer += 10;
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
            width: this.width - 30, // Return to narrower hitbox width
            height: this.height
        };
        
        // Only consider bottom 10% of player for platform collision
        const feetHeight = this.height * 0.1;
        const feetTop = playerHitBox.y + playerHitBox.height - feetHeight;
        
        // Cache player bounds - focus on feet area
        const playerLeft = playerHitBox.x;
        const playerRight = playerHitBox.x + playerHitBox.width;
        const playerBottom = playerHitBox.y + playerHitBox.height;
        
        // Predict next position based on velocity to prevent tunneling
        const nextPlayerBottom = playerBottom + this.vy;
        
        // Track if we found a brown platform
        let foundBrownPlatform = null;
        let closestGreenPlatform = null;
        let minGreenDistance = Infinity;
        
        // Use for loop for better performance
        for (let i = 0; i < this.game.platforms.length; i++) {
            const platform = this.game.platforms[i];
            
            // Calculate platform bounds once
            const platformLeft = platform.x;
            const platformRight = platform.x + platform.width;
            const platformTop = platform.y;
            
            // X-axis collision: player overlaps platform horizontally - more precise check
            const X_test = (playerLeft < platformRight - 5 && playerRight > platformLeft + 5);
            
            // Skip X-axis check if we're not aligned with the platform
            if (!X_test) continue;
            
            // Enhanced Y-axis collision with smaller tolerance
            // Current collision: only if feet are very close to platform (within 5 pixels)
            const currentY_test = (this.vy >= 0) && // Only when falling or at peak
                              (platformTop - playerBottom >= -5) && 
                              (platformTop - playerBottom <= 5);
                              
            // Predictive collision: check if player will pass through platform in the next frame
            const nextY_test = (this.vy > 0) && // Only when falling
                              (playerBottom <= platformTop) && 
                              (nextPlayerBottom >= platformTop) &&
                              (nextPlayerBottom <= platformTop + 10); // Don't detect too far below
            
            // Check if this is a valid platform we're colliding with
            if (currentY_test || nextY_test) {
                if (platform.type === 'brown') {
                    // Found a brown platform - mark it but keep checking for other platforms
                    foundBrownPlatform = platform;
                    platform.markedForDeletion = true;
                    
                    // Don't return yet - continue to check for green platforms below
                } else if (platform.type === 'white') {
                    // Mark white platforms for deletion and return immediately
                    platform.markedForDeletion = true;
                    
                    // If we're using the predictive check, adjust player position
                    if (nextY_test && !currentY_test) {
                        this.y = platformTop - playerHitBox.height;
                    }
                    
                    return platform.type;
                } else {
                    // For green/blue/spring platforms, check if we're on them
                    
                    // If we're using the predictive check, adjust player position
                    if (nextY_test && !currentY_test) {
                        this.y = platformTop - playerHitBox.height;
                    }
                    
                    // Return the regular platform type immediately if no brown platform was found
                    if (!foundBrownPlatform) {
                        return platform.type;
                    }
                    
                    // Otherwise check if this green platform is close enough to detect
                    const distanceFromBrown = platform.y - foundBrownPlatform.y;
                    if (distanceFromBrown > 0 && distanceFromBrown < minGreenDistance) {
                        closestGreenPlatform = platform;
                        minGreenDistance = distanceFromBrown;
                    }
                }
            }
            
            // Also track green platforms directly below but not colliding yet
            if (platform.type !== 'brown' && platform.type !== 'white' && X_test && platformTop > playerBottom) {
                const distance = platformTop - playerBottom;
                if (distance < minGreenDistance && distance < 100) { // Only consider platforms within reasonable distance
                    closestGreenPlatform = platform;
                    minGreenDistance = distance;
            }
            }
        }
        
        // If we found a brown platform and no other collisions, return its type
        if (foundBrownPlatform) {
            // Set a small downward velocity immediately to help detect platforms below
            this.vy = Math.max(this.vy, 2);
            return foundBrownPlatform.type;
        }
      
        return null;
    }

    shootTop() {
        this.bullets.push(new Bullet(this))
    }

    // Modified to handle jumping immediately and then process transaction
    processJump(platformType) {
        // Don't process jumps if the game is over
        if (this.game.gameOver) {
            console.log("Game already over, not counting additional jumps");
            return;
        }

        // Process the jump mechanics immediately based on platform type
        switch(platformType) {
            case 'white': 
            case 'blue': 
            case 'green':
                this.vy = this.min_vy;
                // Play appropriate sound
                try {
                    const soundFile = platformType === 'white' ? 
                        'sound effects/single_jump.mp3' : 
                        'sound effects/jump.wav';
                    new Audio(soundFile).play().catch(e => console.log("Error playing jump sound"));
                } catch (e) {}
                break;
                
            case 'brown':
                // Set a small positive velocity to help detect platforms below
                this.vy = 2;
                try {
                    new Audio('sound effects/no_jump.mp3').play().catch(e => {});
                } catch (e) {}
                break;
                
            case 'spring':
                // Super high jump for spring platforms (2x higher instead of 5x)
                this.vy = this.min_vy * 2;
                try {
                    // Use AudioManager to play spring sound if available
                    if (window.audioManager) {
                        window.audioManager.play('spring', 1.0);
                    } else {
                        // Fallback to direct Audio API if AudioManager not available
                        new Audio('sound effects/spring.mp3').play().catch(e => {});
                    }
                } catch (e) {
                    console.log("Error playing spring sound:", e);
                }
                
                // Find and set the spring platform pressed state - only process springs
                if (this.game.platforms) {
                    // Only perform this check for spring types
                    const playerHitBox = {
                        x: this.x + 15, 
                        y: this.y, 
                        width: this.width - 30, 
                        height: this.height
                    };
                    
                    // Cache player bounds
                    const playerLeft = playerHitBox.x;
                    const playerRight = playerHitBox.x + playerHitBox.width;
                    const playerBottom = playerHitBox.y + playerHitBox.height;
                    
                    console.log(`Looking for spring platforms near player at (${playerLeft},${playerBottom})`);
                    let found = false;
                    
                    // Check only spring platforms for better performance
                    for (const platform of this.game.platforms) {
                        if (platform.type === 'spring') {
                            const platformLeft = platform.x;
                            const platformRight = platform.x + platform.width;
                            const platformTop = platform.y;
                            
                            console.log(`Found spring platform at (${platformLeft},${platformTop})`);
                            
                            // Simplified collision check with wider tolerance
                            if (playerLeft < platformRight && 
                                playerRight > platformLeft && 
                                Math.abs(playerBottom - platformTop) < 30) { // Increased collision tolerance
                                
                                console.log("SPRING COLLISION DETECTED - ACTIVATING PLATFORM");
                                platform.setPressed();
                                found = true;
                                
                                // Force a stronger screen shake directly
                                if (window.juiceEffects && typeof window.juiceEffects.screenShake === 'function') {
                                    window.juiceEffects.screenShake(25, 1000); // Stronger shake
                                }
                                
                                // Create visual particle effects if juiceEffects is available
                                if (window.juiceEffects) {
                                    // Create particles at player position
                                    const x = this.x + this.width/2;
                                    const y = this.y + this.height;
                                    
                                    // Create upward-moving particles
                                    window.juiceEffects.createParticles(x, y, 'star', 15, 1200);
                                    
                                    // Show boost text
                                    if (typeof window.juiceEffects.showScorePopup === 'function') {
                                        window.juiceEffects.showScorePopup(x, y + 30, "SPRING JUMP!", true);
                                    }
                                }
                                
                                break; // Exit once we've found and set the spring
                            }
                        }
                    }
                    
                    if (!found) {
                        console.log("No spring platforms found in collision range");
                        
                        // Fallback - apply screen shake anyway for spring jumps
                        if (window.juiceEffects && typeof window.juiceEffects.screenShake === 'function') {
                            console.log("Applying fallback screen shake for spring jump");
                            window.juiceEffects.screenShake(15, 800);
                        }
                    }
                }
                break;
        }
        
        // Track jump in parent window
        if (window.parent && typeof window.parent.handleJumpTransaction === 'function') {
            try {
                // This ensures the jump is counted in the parent window
                window.parent.handleJumpTransaction(platformType)
                    .then(success => {
                        console.log(success ? "Jump transaction successful" : "Jump transaction failed, but gameplay continues");
                    })
                    .catch(() => {
                        console.log("Jump transaction error, but gameplay continues");
                    });
            } catch (error) {
                console.log("Jump transaction failed, but gameplay continues");
            }
        }
        
        // Increment jump count
        window.__jumpCount = (window.__jumpCount || 0) + 1;
        
        // Store the jump count so it doesn't change after game over
        this.game.__finalJumpCount = window.__jumpCount;
        
        // Notify parent of the current count
        if (window.parent) {
            window.parent.postMessage({ 
                type: 'JUMP_PERFORMED', 
                jumpCount: window.__jumpCount 
            }, '*');
        }
    }

    // This is the original method kept for reference but not used directly anymore
    async jump(platformType) {
        // Store when we requested the jump
        this.lastJumpRequestTime = Date.now();
        this.jumpRequested = true;

        // Instead of waiting for transaction, immediately apply jump physics
        if(platformType=='white' || platformType=='blue' || platformType=='green') {
            this.vy = this.min_vy;
            if(platformType=='white') new Audio('sound effects/single_jump.mp3').play();
            else if(platformType=='blue' || platformType=='green') new Audio('sound effects/jump.wav').play();
        } else if(platformType=='brown') {
            new Audio('sound effects/no_jump.mp3').play();
        }
        
        // Start the transaction in the background
        try {
            // Send transaction but don't await it
            window.parent.postMessage({ type: 'JUMP', data: { platformType } }, '*');
        } catch (error) {
            console.error('Error sending jump message:', error);
        }
        
        // Always return true so game continues
        return true;
    }

    jump() {
        if (this.canJump) {
            // Play jump sound with near-zero latency
            if (window.audioManager) {
                window.audioManager.play('jump');
            }
            
            // Rest of your jump code...
        }
    }
}