// Fixed version of player.js with all transaction handling removed
export class Player {
    constructor(game) {
        this.game = game;
        this.width = 90;
        this.height = 90;
        this.x = this.game.width * 0.5 - this.width * 0.5;
        this.y = this.game.height * 0.5;
        this.speedY = 0;
        this.jumpForce = 15;
        this.image = document.getElementById('monad0');
        this.bullets = [];
        this.lastShootTime = 0;
        this.shootInterval = 500; // ms between shots
        this.isJumping = false;
        this.jumpCount = 0;
    }

    update() {
        // Add gravity
        this.speedY += 0.5;
        this.y += this.speedY;

        // Check for collisions with platforms
        this.game.platforms.forEach(platform => {
            if (this.speedY > 0 && // Only check when falling
                this.x + this.width > platform.x && 
                this.x < platform.x + platform.width &&
                this.y + this.height > platform.y && 
                this.y + this.height < platform.y + platform.height) {
                
                // Land on platform
                this.speedY = 0;
                this.y = platform.y - this.height;
                this.isJumping = false;
                
                // Process jump from platform
                this.processJump(platform.type);
            }
        });

        // Update bullets
        this.bullets.forEach(bullet => bullet.update());
        this.bullets = this.bullets.filter(bullet => !bullet.markedForDeletion);
    }

    processJump(platformType) {
        // Process the jump mechanics immediately
        this.speedY = -this.jumpForce;
        this.isJumping = true;
        this.jumpCount++;
        
        // NO TRANSACTION HANDLING - just log instead
        console.log(`Jump #${this.jumpCount} - platformType: ${platformType} (no transaction needed)`);
        
        // Apply different effects based on platform type
        if (platformType === 'blue') {
            // Super jump
            this.speedY = -this.jumpForce * 1.5;
        } else if (platformType === 'brown') {
            // Break platform
            // (Platform breaking logic would be in platform.js)
        }
    }

    draw(context) {
        context.drawImage(this.image, this.x, this.y, this.width, this.height);
        // Draw bullets
        this.bullets.forEach(bullet => bullet.draw(context));
    }

    shoot() {
        const currentTime = Date.now();
        if (currentTime - this.lastShootTime > this.shootInterval) {
            this.bullets.push(new Bullet(this.game, this.x + this.width * 0.5, this.y));
            this.lastShootTime = currentTime;
        }
    }

    restart() {
        this.x = this.game.width * 0.5 - this.width * 0.5;
        this.y = this.game.height * 0.5;
        this.speedY = 0;
        this.bullets = [];
        this.jumpCount = 0;
    }
}

class Bullet {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = 15;
        this.height = 30;
        this.speed = 10;
        this.markedForDeletion = false;
        this.image = document.getElementById('bullet');
    }

    update() {
        this.y -= this.speed;
        if (this.y < 0) this.markedForDeletion = true;
        
        // Check for collision with enemies
        this.game.enemies.forEach(enemy => {
            if (this.x < enemy.x + enemy.width &&
                this.x + this.width > enemy.x &&
                this.y < enemy.y + enemy.height &&
                this.y + this.height > enemy.y) {
                
                // Collision detected
                this.markedForDeletion = true;
                enemy.markedForDeletion = true;
                this.game.score += 10;
            }
        });
    }

    draw(context) {
        context.drawImage(this.image, this.x, this.y, this.width, this.height);
    }
} 