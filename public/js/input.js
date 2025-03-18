export class InputHandler {
    constructor(game) {
        this.game = game
        this.keys = []
        this.bulletKeyCount = 0

        window.addEventListener('keydown', e => {
            if ((e.key === 'ArrowUp' || 
                 e.key === 'ArrowDown' || 
                 e.key === 'ArrowLeft' || 
                 e.key === 'ArrowRight' ||
                 e.key === ' ' ||
                 e.key === 'Enter'
                ) && this.keys.indexOf(e.key) === -1) {
                this.keys.push(e.key)
            }
            
            // Handle Enter key for game start
            if (e.key === 'Enter' && !this.game.gameStart) {
                console.log('Starting game from input handler')
                this.game.startGame()
            }

            if ((e.key === ' ' || e.key === 'ArrowUp') && !this.keys.includes(e.key)) {
                this.keys.push(e.key);
                
                // Just count the jump, don't send a transaction
                if (typeof window.totalJumps !== 'undefined') {
                    window.totalJumps++;
                } else {
                    window.totalJumps = 1;
                }
                
                console.log(`Jump ${window.totalJumps} counted (will be bundled at game over)`);
                
                // Do NOT send a transaction here - we'll send one at game over
            }
        })

        window.addEventListener('keyup', e => {
            if (e.key === 'ArrowUp' ||
                e.key === 'ArrowDown' ||
                e.key === 'ArrowLeft' ||
                e.key === 'ArrowRight' ||
                e.key === ' ' ||
                e.key === 'Enter') {
                this.keys.splice(this.keys.indexOf(e.key), 1)
            }
            if(e.key === 'ArrowUp' && this.game.player.bullets.length < 3){
                this.bulletKeyCount++
            }
        })
    }
}