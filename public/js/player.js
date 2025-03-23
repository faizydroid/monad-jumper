import {Bullet} from './bullet.js'

export class Player {
    constructor(game) {
        this.game = game
        this.sizeModifier = 0.2
        this.width = 395 * this.sizeModifier
        this.height = 488 * this.sizeModifier
        this.x = this.game.platforms.filter(platform => platform.type=='green').slice(-1)[0].x + 6
        this.y = this.game.platforms.filter(platform => platform.type=='green').slice(-1)[0].y - this.height 
        this.min_y = (this.game.height/2)-30
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
            console.log('Player fell off screen, triggering game over');
            if (!this.game.gameOver) {  // Add check to prevent multiple triggers
                this.game.checkGameOver();
            }
            return;
        }

        // horizontal movement
        this.x += this.vx
        if(inputHandler.keys.includes('ArrowLeft')){
            this.vx = -this.max_vx
        }
        else if(inputHandler.keys.includes('ArrowRight')){
            this.vx = this.max_vx
        }
        else this.vx = 0

        // horizontal boundary
        if(this.x < -this.width/2) this.x = this.game.width - (this.width/2)
        if(this.x + (this.width/2) > this.game.width) this.x = - this.width/2

        // vertical movement
        if(this.vy > this.weight) {  
            let platformType = this.onPlatform()
            if (platformType) {
                this.lastPlatformType = platformType;
                this.jumpRequested = true;
                // Start jump immediately but process transaction in background
                this.processJump(platformType);
            }
        }

        if(this.vy < this.max_vy) this.vy += this.weight
        if(this.y > this.min_y || this.vy > this.weight) this.y += this.vy

        if(this.y <= this.min_y && this.vy < this.weight) this.game.vy = -this.vy 
        else this.game.vy = 0

        // game over
        if(this.collision()){
            this.game.gameOver = true
            this.game.enemies.forEach((enemy)=>{
                enemy.audio.pause()
            })
            new Audio('sound effects/crash.mp3').play()
        }

        if(this.y > this.game.height && !this.game.gameOver){
            this.game.gameOver = true
            this.game.enemies.forEach((enemy)=>{
                enemy.audio.pause()
            })
            new Audio('sound effects/fall.mp3').play()
        }

        // handle bullets
        this.bullets.forEach(bullet => {
            bullet.update()
        })
        this.bullets = this.bullets.filter(bullet => !bullet.markedForDeletion)

        // shoot
        if (inputHandler.keys.includes(' ') && this.bulletTimer > this.bulletInterval){
            this.shootTop()
            this.bulletTimer = 0
        } else {
            this.bulletTimer += 10
        }
    }

    draw(context) {
        this.bullets.forEach(bullet => bullet.draw(context))
        context.drawImage(this.image,this.x,this.y,this.width,this.height)
    }

    collision(){
        let result = false
        let playerHitBox = {x:this.x+15, y:this.y, width:this.width-30, height:this.height}
        this.game.enemies.forEach((enemy)=>{
            if(playerHitBox.x < enemy.x + enemy.width && playerHitBox.x + playerHitBox.width > enemy.x && playerHitBox.y < enemy.y + enemy.height && playerHitBox.height + playerHitBox.y > enemy.y){
                result = true
            }
        })
        return result
    }

    onPlatform(){
        let type = null
        let playerHitBox = {x:this.x+15, y:this.y, width:this.width-30, height:this.height}

        this.game.platforms.forEach((platform)=>{
            const X_test = (playerHitBox.x > platform.x && playerHitBox.x < platform.x+platform.width)  || (playerHitBox.x+playerHitBox.width > platform.x && playerHitBox.x+playerHitBox.width < platform.x+platform.width)
            const Y_test = (platform.y - (playerHitBox.y+playerHitBox.height) <= 0) && (platform.y - (playerHitBox.y+playerHitBox.height) >= -platform.height)

            if(X_test && Y_test){
                type = platform.type
                platform.markedForDeletion = (type == 'brown' || type == 'white') ? true : false
            }
        })
      
        return type
    }

    shootTop() {
        this.bullets.push(new Bullet(this))
    }

    // Modified to handle jumping immediately and then process transaction
    processJump(platformType) {
        // Process the jump mechanics immediately
        if(platformType=='white' || platformType=='blue' || platformType=='green') {
            this.vy = this.min_vy;
            if(platformType=='white') new Audio('sound effects/single_jump.mp3').play();
            else if(platformType=='blue' || platformType=='green') new Audio('sound effects/jump.wav').play();
        } else if(platformType=='brown') {
            new Audio('sound effects/no_jump.mp3').play();
        }
        
        // Don't process jumps if the game is over
        if (this.game.gameOver) {
            console.log("Game already over, not counting additional jumps");
            return;
        }
        
        // Track jump in parent window
        if (window.parent && typeof window.parent.handleJumpTransaction === 'function') {
            try {
                console.log("Initiating jump transaction");
                
                // This ensures the jump is counted in the parent window
                window.parent.handleJumpTransaction(platformType)
                    .then(success => {
                        if (success) {
                            console.log("Jump transaction successful");
                        } else {
                            console.log("Jump transaction failed, but gameplay continues");
                        }
                    })
                    .catch(err => {
                        console.log("Jump transaction error, but gameplay continues:", err);
                    });
            } catch (error) {
                console.log("Jump transaction failed, but gameplay continues", error);
            }
        }
        
        // Only increment jump count if the game is not over
        if (!window.__jumpCount) {
            window.__jumpCount = 0;
        }
        window.__jumpCount++;
        
        // Store the jump count so it doesn't change after game over
        this.game.__finalJumpCount = window.__jumpCount;
        
        // Notify parent of the current count
        if (window.parent) {
            window.parent.postMessage({ 
                type: 'JUMP_PERFORMED', 
                jumpCount: window.__jumpCount 
            }, '*');
        }
        
        console.log("Local jump count updated to:", window.__jumpCount);
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