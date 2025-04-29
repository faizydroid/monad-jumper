export class Enemy {
    constructor(game) {
        this.game = game
        this.x = Math.random() * game.width
        this.y = -200 // Start further above the screen
        this.width = 160
        this.height = 160
        
        // Reduced hitbox (50% of the visual size) for fairer collision detection
        this.hitboxWidth = this.width * 0.5
        this.hitboxHeight = this.height * 0.5
        this.hitboxOffsetX = (this.width - this.hitboxWidth) / 2
        this.hitboxOffsetY = (this.height - this.hitboxHeight) / 2
        
        this.speedX = Math.random() * 4 - 2 // Random horizontal speed between -2 and 2
        
        // Set a fixed y position in the upper 10% of the screen only
        this.fixedY = Math.random() * (game.height * 0.1) // Random position in the upper 10% of the screen
        this.reachedPosition = false // Flag to track if the virus has reached its position
        
        this.speedY = 1.5 // Slower downward speed for delayed appearance
        this.markedForDeletion = false
        this.oscillationTimer = 0 // For slight up/down movement
        this.oscillationSpeed = 0.02 + Math.random() * 0.02 // Different speeds for each virus
        this.oscillationRange = 15 + Math.random() * 10 // Different ranges for each virus
        
        this.sizeModifier = 0.3
        
        // If speedX is too slow, increase it
        if (Math.abs(this.speedX) < 1) {
            this.speedX = this.speedX > 0 ? 1 : -1;
        }
        
        // Load enemy image safely
        try {
            this.image = document.getElementById('virus');
            if (!this.image) {
                console.warn('Enemy image not found with ID "virus"');
            }
        } catch (e) {
            console.error('Error loading enemy image:', e);
        }
        
        // Sound will be played before creation by Game.add_enemy
        this.soundPlayed = true;
    }
    
    // Method to play virus sound
    playVirusSound() {
        if (this.soundPlayed) return;
        
        try {
            // Try using the AudioManager if available
            if (window.audioManager && typeof window.audioManager.play === 'function') {
                window.audioManager.play('virus', 0.7);
                this.soundPlayed = true;
            } else {
                // Fallback to direct Audio API
                const virusSound = new Audio('sound effects/virus.mp3');
                virusSound.volume = 0.7;
                virusSound.play().catch(e => console.log("Error playing virus sound:", e));
                this.soundPlayed = true;
            }
            console.log('🦠 Virus sound played');
        } catch (e) {
            console.error("Error playing virus sound:", e);
        }
    }
    
    // Method to get hitbox coordinates for collision detection
    getHitbox() {
        return {
            x: this.x + this.hitboxOffsetX,
            y: this.y + this.hitboxOffsetY,
            width: this.hitboxWidth,
            height: this.hitboxHeight
        };
    }

    update() {
        // Always move virus downwards - continue falling instead of stopping
        this.y += this.speedY;
        
        // Always move horizontally
        this.x += this.speedX;
        
        // Cache boundary values for more efficient checks
        const leftBoundary = 0;
        const rightBoundary = this.game.width - this.width;
        
        // Bounce off walls
        if (this.x <= leftBoundary || this.x >= rightBoundary) {
            this.speedX *= -1;
            
            // Fix position to avoid getting stuck at boundaries
            if (this.x < leftBoundary) {
                this.x = leftBoundary;
            } else if (this.x > rightBoundary) {
                this.x = rightBoundary;
            }
        }
        
        // Mark for deletion if off screen
        if (this.y > this.game.height) {
            this.markedForDeletion = true;
        }
    }

    draw(context) {
        // Only draw if enemy is in the visible area of the screen
        if (this.x + this.width >= 0 && 
            this.x <= this.game.width && 
            this.y + this.height >= 0 && 
            this.y <= this.game.height) {
            
        if (this.image) {
                context.drawImage(this.image, this.x, this.y, this.width, this.height);
                
                // Uncomment to debug hitbox
                /*
                context.strokeStyle = 'red';
                const hitbox = this.getHitbox();
                context.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
                */
        } else {
            // Fallback drawing if image is missing
            context.fillStyle = 'red';
            context.fillRect(this.x, this.y, this.width, this.height);
            }
        }
    }
}