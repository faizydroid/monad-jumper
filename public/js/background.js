export class Background {
    constructor(game) {
        this.game = game
        this.x = 0
        this.y = 0
        this.width = game.width
        this.height = game.height
        
        // Load background image safely
        try {
            this.image = document.getElementById('bg');
            if (!this.image) {
                console.warn('Background image not found with ID "bg"');
            }
        } catch (e) {
            console.error('Error loading background image:', e);
        }
    }

    update(){
        if(this.y > this.height){
            this.y = 0
            this.game.add_platforms(-this.height, -15)
            this.game.add_broken_platforms(-this.height, -25)
            this.game.change_difficulty()

            if(Math.random() < this.game.enemyChance/100){
                this.game.add_enemy()
            }
        } 
        else{
            this.y += this.game.vy
            this.game.score += Math.trunc(this.game.vy * 0.1)
        }
    }

    draw(context) {
        // Only try to draw if image is available
        if (this.image) {
            context.drawImage(this.image, this.x, this.y, this.width, this.height)
            context.drawImage(this.image, this.x, this.y - this.height, this.width, this.height)
        } else {
            // Fallback drawing if image is missing
            context.fillStyle = '#87CEEB'; // Sky blue
            context.fillRect(0, 0, this.width, this.height);
        }
    }
}