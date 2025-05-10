export class Platform {
    constructor(game, lowerY, upperY, type) {
        this.game = game
        this.width = 90
        this.height = type === 'spring' ? 40 : 20  // Double height for spring platforms
        this.type = type
        
        this.x = Math.floor(Math.random() * ((this.game.width-this.width) - 0 + 1)) + 0
        this.y = this.calc_Y(upperY,lowerY)
        this.vx = (this.type=='blue') ? this.game.object_vx : 0
        
        // Use custom images for all platform types
        this.image = new Image();
        this.pressed = false; // For spring platform state
        
        // Set appropriate image based on platform type
        switch(this.type) {
            case 'blue':
                this.image.src = '/images/blue_platform.png';
                break;
            case 'green':
                this.image.src = '/images/green_platform.png';
                break;
            case 'brown':
                this.image.src = '/images/brown_platform.png';
                break;
            case 'white':
                this.image.src = '/images/white_platform.png';
                break;
            case 'spring':
                this.image.src = '/images/spring_platform.png';
                // Create pressed state image for spring
                this.pressedImage = new Image();
                this.pressedImage.src = '/images/spring_pressed_platform.png';
                break;
            default:
                // Fallback to green if type is unknown
                this.image.src = '/images/green_platform.png';
                break;
        }
        
        this.markedForDeletion = false
    }

    update(deltaTime = 1/60){
        // Scale movement speeds with deltaTime for consistent movement
        
        // Check for platform direction change - only when we need to
        if(this.type=='blue' && (this.x < 0 || this.x > this.game.width-this.width)){
            this.vx *= -1;
            
            // Fix position to avoid getting stuck at boundaries
            if (this.x < 0) {
                this.x = 0;
            } else if (this.x > this.game.width-this.width) {
                this.x = this.game.width-this.width;
            }
        }

        // Apply movement speed - scaled with deltaTime
        // Base value is adjusted for 60 fps equivalent
        const baseSpeed = this.type=='blue' ? this.game.object_vx * 60 : 0;
        const scaledVx = baseSpeed * deltaTime;
        
        this.x += this.vx * deltaTime * 60; // Scale horizontal movement
        this.y += this.game.vy; // This is already scaled in the game class

        // Check if platform is off screen - use more efficient comparison
        if(this.y >= this.game.height){
            this.markedForDeletion = true;
        }
        
        // Reset spring platform pressed state after delay
        // Only create timer when needed
        if (this.type === 'spring' && this.pressed && !this.pressTimer) {
            this.pressTimer = setTimeout(() => {
                this.pressed = false;
                this.pressTimer = null;
            }, 300); // Reset after 300ms
        }
    }

    draw(context) {
        // Skip drawing completely if outside viewable area
        if (this.y < -100 || this.y > this.game.height + 50) {
            return;
        }
        
        // Select the correct image based on platform type and state
        const imageToUse = (this.type === 'spring' && this.pressed) ? this.pressedImage : this.image;
        
        // Draw only if image is loaded
        if (imageToUse.complete) {
            // Use integer coordinates for sharper rendering
            const x = Math.floor(this.x);
            const y = Math.floor(this.y);
            context.drawImage(imageToUse, x, y, this.width, this.height);
        } else {
            // Fallback: Draw a colored rectangle
            context.fillStyle = '#2196F3'; // Blue fallback
            context.fillRect(Math.floor(this.x), Math.floor(this.y), this.width, this.height);
            
            // Add image load listener only once
            if (!this.imageLoadListenerAdded) {
                imageToUse.onload = () => {
                    this.imageLoadListenerAdded = true;
                };
            }
        }
    }

    // Set spring platform to pressed state
    setPressed() {
        if (this.type === 'spring') {
            this.pressed = true;
            
            // Clear existing timer if any
            if (this.pressTimer) {
                clearTimeout(this.pressTimer);
                this.pressTimer = null;
            }
            
            // Reset the pressed state after a delay
            this.pressTimer = setTimeout(() => {
                this.pressed = false;
                this.pressTimer = null;
            }, 300);
        }
    }

    calc_Y(upperY,lowerY) {
        if(this.type != 'brown'){
            if(!this.game.platforms.length){
                return Math.floor(Math.random() * (upperY - (upperY-100) + 1)) + (upperY-100)
            } 
            else{
                return this.game.platforms[0].y - (Math.floor(Math.random() * (this.game.platform_gap - (this.game.platform_gap-30) + 1)) + (this.game.platform_gap-30))
            }
        }
        else{
            let y

            do{
                y = Math.floor(Math.random() * (upperY - lowerY + 1)) + lowerY
            }
            while(this.close_To_Other_Platforms(y))
            
            return y
        }
    }

    close_To_Other_Platforms(y1){
        for(let i=0; i<this.game.platforms.length; i++){
            const iPlatform = this.game.platforms[i]
            const margin = 10
            if((y1+this.height >= iPlatform.y-margin && y1+this.height <= iPlatform.y+this.height+margin) || (y1 >= iPlatform.y-margin && y1 <= iPlatform.y+this.height+margin)){
                return true
            }
        }
        return false
    }
}