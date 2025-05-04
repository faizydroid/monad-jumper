export class Bullet {
    constructor(player) {
        this.player = player
        this.sizeModifier = 0.1
        this.width = 160 * this.sizeModifier
        this.height = 512 * this.sizeModifier
        this.x = this.player.x + (this.player.width/2) - (this.width/2)
        this.y = this.player.y + (this.player.height/2) - (this.height/2)
        this.image = document.querySelector('#bullet')
        this.vy = -15
        this.markedForDeletion = false
        
        // Play sound through AudioManager first, fallback to direct Audio API
        try {
            if (window.audioManager && typeof window.audioManager.play === 'function') {
                window.audioManager.play('bullet', 0.5);
            } else {
                // Fallback to direct Audio API
                const audio = new Audio('sound effects/bullet.mp3');
                audio.volume = 0.5; // Lower volume
                audio.play().catch(e => console.warn('Could not play bullet sound:', e));
            }
        } catch (e) {
            console.warn('Error playing bullet sound:', e);
        }
    }

    update(deltaTime = 1/60) {
        // Scale speed with deltaTime for consistent bullet movement
        
        // Velocity scaled by deltaTime
        const BASE_SPEED = -15 * 60; // Units per second
        const scaledVelocity = BASE_SPEED * deltaTime;
        
        this.y += scaledVelocity;
        
        // Mark for deletion if off screen
        if(this.y < -this.height){
            this.markedForDeletion = true;
            return;
        }
        
        // Check for collision with enemies
        if (!this.player || !this.player.game || !this.player.game.enemies || this.player.game.enemies.length === 0) {
            return;
        }
        
        // Cache bullet bounds for collision detection
        const bulletLeft = this.x;
        const bulletRight = this.x + this.width;
        const bulletTop = this.y;
        const bulletBottom = this.y + this.height;
        
        // Use for loop instead of forEach for better performance with early exit
        const enemies = this.player.game.enemies;
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            
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
            
            // Cache enemy bounds
            const enemyLeft = enemyHitbox.x;
            const enemyRight = enemyHitbox.x + enemyHitbox.width;
            const enemyTop = enemyHitbox.y;
            const enemyBottom = enemyHitbox.y + enemyHitbox.height;
            
            // Check collision using cached values
            if (bulletLeft < enemyRight &&
                bulletRight > enemyLeft &&
                bulletTop < enemyBottom &&
                bulletBottom > enemyTop) {
                
                // Mark both bullet and enemy for deletion
                this.markedForDeletion = true;
                enemy.markedForDeletion = true;
                
                // Add points to score
                this.player.game.score += 10;
                
                // Play hit sound through AudioManager first, fallback to direct Audio API
                try {
                    if (window.audioManager && typeof window.audioManager.play === 'function') {
                        window.audioManager.play('collision', 0.3);
                    } else {
                        // Fallback to direct Audio API
                        const hitSound = new Audio('sound effects/crash.mp3');
                        hitSound.volume = 0.3;
                        hitSound.play().catch(e => console.warn('Could not play hit sound:', e));
                    }
                } catch (e) {
                    console.warn('Error playing hit sound:', e);
                }
                
                // Create particle effect for enemy destruction
                this.createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                
                // Exit the loop once a collision is found
                break;
            }
        }
    }
    
    // Create explosion effect when bullet hits enemy
    createExplosion(x, y) {
        // Play hit sound through AudioManager first, fallback to direct Audio API
        try {
            if (window.audioManager && typeof window.audioManager.play === 'function') {
                window.audioManager.play('collision', 0.3);
            } else {
                // Fallback to direct Audio API
                const hitSound = new Audio('sound effects/crash.mp3');
                hitSound.volume = 0.3;
                hitSound.play().catch(e => console.warn('Could not play hit sound:', e));
            }
        } catch (e) {
            console.warn('Error playing hit sound:', e);
        }
        
        // Only create effect if the juice effects system exists
        if (!window.juiceEffects || typeof window.juiceEffects.createParticle !== 'function') {
            return
        }
        
        // Create fewer but more visible particles (8 -> 6)
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2) * (i / 6)
            const speed = 2 + Math.random() * 2
            
            window.juiceEffects.createParticle(
                x, 
                y, 
                Math.cos(angle) * speed, 
                Math.sin(angle) * speed, 
                20, 
                '#FF5A5F'
            )
        }
        
        // Add score popup text if available
        if (typeof window.juiceEffects.createScorePopup === 'function') {
            window.juiceEffects.createScorePopup(x, y, "+10", "#FF5A5F")
        }
        
        // Add "MONSTER DEAD" text with combo effect
        if (typeof window.juiceEffects.showScorePopup === 'function') {
            window.juiceEffects.showScorePopup(x, y - 30, "MONSTER DEAD!", true)
            
            // Add "GOOD SHOT" text slightly below
            setTimeout(() => {
                window.juiceEffects.showScorePopup(x, y + 20, "GOOD SHOT!", true)
            }, 200) // Slight delay for better visual effect
            
            // Add screen shake for more impact
            if (typeof window.juiceEffects.screenShake === 'function') {
                window.juiceEffects.screenShake(10, 500) // Medium shake
            }
            
            // Create more particles for a more dramatic effect
            for (let i = 0; i < 10; i++) {
                const angle = Math.random() * Math.PI * 2
                const speed = 3 + Math.random() * 3
                
                setTimeout(() => {
                    window.juiceEffects.createParticle(
                        x, 
                        y, 
                        Math.cos(angle) * speed, 
                        Math.sin(angle) * speed, 
                        30, 
                        '#FFD700' // Gold color for special effect
                    )
                }, i * 50) // Staggered particles for better visual
            }
        }
    }

    draw(context) {              
        // Only draw if the bullet is visible on screen
        if (this.y + this.height >= 0 && this.y <= this.player.game.height) {
            context.drawImage(this.image, this.x, this.y, this.width, this.height)
        }
    }
}