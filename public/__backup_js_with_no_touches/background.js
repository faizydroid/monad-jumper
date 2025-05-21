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

    update(deltaTime = 1.0){
        // Fixed time step update - always consistent speed
        
        if(this.y > this.height){
            // Reset background position
            this.y = 0;
            
            // Batch these operations for better performance
            // First add all platforms in one go
            this.game.add_platforms(-this.height, -15);
            this.game.add_broken_platforms(-this.height, -25);
            
            // Then update difficulty
            this.game.change_difficulty();

            // Only try to add enemy if chance calculation passes threshold check
            if(Math.random() < this.game.enemyChance/100){
                this.game.add_enemy();
            }
        } 
        else{
            // Use fixed movement - consistent regardless of frame rate
            this.y += this.game.vy;
            
            // Optimize score calculation - avoid unnecessary math
            if (this.game.vy > 0) {
                this.game.score += Math.trunc(this.game.vy * 0.1);
            }
        }
    }

    draw(context) {
        // Skip drawing if canvas context isn't available
        if (!context) return;
        
        // Only try to draw if image is available
        if (this.image && this.image.complete) {
            // Draw both images with a single pattern for better performance
            context.drawImage(this.image, this.x, this.y, this.width, this.height);
            
            // Only draw the second image if it's actually needed (visible)
            if (this.y > 0) {
                context.drawImage(this.image, this.x, this.y - this.height, this.width, this.height);
            }
        } else {
            // Fallback drawing if image is missing - use a solid color for best performance
            context.fillStyle = '#87CEEB'; // Sky blue
            context.fillRect(0, 0, this.width, this.height);
        }
    }
}