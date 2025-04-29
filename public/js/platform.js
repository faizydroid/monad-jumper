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

    update(){
        if(this.type=='blue'){
            if(this.x < 0 || this.x > this.game.width-this.width) this.vx *= -1
        }

        this.x += this.vx
        this.y += this.game.vy

        if(this.y >= this.game.height){
            this.markedForDeletion = true
        }
        
        // Reset spring platform pressed state after delay
        if (this.type === 'spring' && this.pressed) {
            if (!this.pressTimer) {
                this.pressTimer = setTimeout(() => {
                    this.pressed = false;
                    this.pressTimer = null;
                }, 300); // Reset after 300ms
            }
        }
    }

    draw(context) {
        // Select the correct image based on platform type and state
        const imageToUse = (this.type === 'spring' && this.pressed) ? this.pressedImage : this.image;
        
        // Wait for image to load
        if (imageToUse.complete) {
            context.drawImage(imageToUse, this.x, this.y, this.width, this.height);
        } else {
            // Fallback until image loads
            context.fillStyle = '#2196F3'; // Blue fallback
            context.fillRect(this.x, this.y, this.width, this.height);
            
            // Add a one-time load listener to redraw once the image loads
            if (!this.imageLoadListenerAdded) {
                imageToUse.onload = () => {
                    console.log('Platform image loaded!');
                };
                this.imageLoadListenerAdded = true;
            }
        }
    }

    // Set spring platform to pressed state
    setPressed() {
        if (this.type === 'spring') {
            this.pressed = true;
            console.log("Spring platform pressed!");
            
            // Clear existing timer if any
            if (this.pressTimer) {
                clearTimeout(this.pressTimer);
                this.pressTimer = null;
            }
            
            // Add a stronger screen shake when spring is activated
            if (window.juiceEffects && typeof window.juiceEffects.screenShake === 'function') {
                console.log("Applying juice effects screen shake");
                // Apply a stronger and longer shake (intensity 20, duration 800ms)
                window.juiceEffects.screenShake(20, 800);
            } else {
                console.log("No juice effects available, using fallback");
                // Fallback if juiceEffects not available - create shake effect directly
                this.applyShakeEffect();
            }
            
            // Also send message to parent window to ensure shake works in iframes
            try {
                window.parent.postMessage({
                    type: 'game-effect',
                    effect: 'screen-shake',
                    intensity: 20,
                    duration: 800
                }, '*');
            } catch (e) {
                console.log("Could not send message to parent:", e);
            }
            
            // Reset the pressed state after a delay
            this.pressTimer = setTimeout(() => {
                this.pressed = false;
                this.pressTimer = null;
            }, 350);
        }
    }

    // Apply a custom shake effect to the game canvas
    applyShakeEffect() {
        const canvas = document.getElementById('canvas1');
        if (!canvas) {
            console.log("Cannot apply shake: canvas not found");
            return;
        }
        
        console.log("Applying direct shake effect to canvas");
        
        // Create keyframe animation for shake if it doesn't exist
        let styleEl = document.getElementById('shake-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'shake-style';
            styleEl.textContent = `
                @keyframes spring-shake {
                    0%, 100% { transform: translate(0, 0) rotate(0deg); }
                    10% { transform: translate(-8px, 6px) rotate(-1deg); }
                    20% { transform: translate(7px, -7px) rotate(1deg); }
                    30% { transform: translate(-8px, -8px) rotate(-0.5deg); }
                    40% { transform: translate(8px, 8px) rotate(0.5deg); }
                    50% { transform: translate(-6px, -5px) rotate(-0.2deg); }
                    60% { transform: translate(5px, 6px) rotate(0.2deg); }
                    70% { transform: translate(-4px, -2px) rotate(-0.1deg); }
                    80% { transform: translate(3px, -3px) rotate(0.1deg); }
                    90% { transform: translate(-2px, 2px) rotate(0deg); }
                }
            `;
            document.head.appendChild(styleEl);
        }
        
        // Force to remove any existing animation first
        canvas.style.animation = 'none';
        
        // Trigger reflow to ensure animation restarts properly
        void canvas.offsetWidth;
        
        // Apply animation to canvas with longer duration
        canvas.style.animation = 'spring-shake 800ms ease-in-out';
        
        // Remove animation after it completes
        setTimeout(() => {
            canvas.style.animation = '';
        }, 800);
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