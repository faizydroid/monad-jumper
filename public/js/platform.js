export class Platform {
    constructor(game, lowerY, upperY, type) {
        this.game = game
        this.width = 90
        this.height = 20  // Standard collision height
        this.type = type
        
        this.x = Math.floor(Math.random() * ((this.game.width-this.width) - 0 + 1)) + 0
        this.y = this.calc_Y(upperY,lowerY)
        this.vx = (this.type=='blue') ? this.game.object_vx : 0
        
        // Use custom images for all platform types
        this.image = new Image();
        
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
    }

    draw(context) {
        // Wait for image to load
        if (this.image.complete) {
            context.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            // Fallback until image loads
            context.fillStyle = '#2196F3'; // Blue fallback
            context.fillRect(this.x, this.y, this.width, this.height);
            
            // Add a one-time load listener to redraw once the image loads
            if (!this.imageLoadListenerAdded) {
                this.image.onload = () => {
                    console.log('Platform image loaded!');
                };
                this.imageLoadListenerAdded = true;
            }
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