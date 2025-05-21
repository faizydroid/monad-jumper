export class InputHandler {
    constructor(game) {
        this.game = game
        this.keys = []
        this.bulletKeyCount = 0

        window.addEventListener('keydown', e => {
            // Movement and action keys - add A, D, and W keys
            if ((e.key === 'ArrowUp' || 
                 e.key === 'ArrowDown' || 
                 e.key === 'ArrowLeft' || 
                 e.key === 'ArrowRight' ||
                 e.key === 'a' || e.key === 'A' ||
                 e.key === 'd' || e.key === 'D' ||
                 e.key === 'w' || e.key === 'W' ||
                 e.key === ' ' ||
                 e.key === 'Enter'
                ) && this.keys.indexOf(e.key) === -1) {
                
                // Map A to ArrowLeft and D to ArrowRight for consistency
                if (e.key === 'a' || e.key === 'A') {
                    if (this.keys.indexOf('ArrowLeft') === -1) {
                        this.keys.push('ArrowLeft');
                    }
                } else if (e.key === 'd' || e.key === 'D') {
                    if (this.keys.indexOf('ArrowRight') === -1) {
                        this.keys.push('ArrowRight');
                    }
                } else {
                    this.keys.push(e.key);
                }
            }
            
            // Handle Enter key for game start
            if (e.key === 'Enter' && !this.game.gameStart) {
                console.log('Starting game from input handler');
                this.game.startGame();
            }

            // Handle jump/shoot inputs, including W for shooting
            if ((e.key === ' ' || e.key === 'ArrowUp') && !this.keys.includes(e.key)) {
                this.keys.push(e.key);
                
                // Count the jump
                if (typeof window.totalJumps !== 'undefined') {
                    window.totalJumps++;
                } else {
                    window.totalJumps = 1;
                }
                
                console.log(`Jump ${window.totalJumps} counted (will be bundled at game over)`);
            }
            
            // Handle W key for shooting
            if ((e.key === 'w' || e.key === 'W') && this.game.player && this.game.player.bullets.length < 3) {
                if (!this.keys.includes('w') && !this.keys.includes('W')) {
                    this.keys.push(e.key);
                    this.bulletKeyCount++;
                }
            }
        })

        window.addEventListener('keyup', e => {
            // Handle release of all keys including A, D, and W
            if (e.key === 'ArrowUp' ||
                e.key === 'ArrowDown' ||
                e.key === 'ArrowLeft' ||
                e.key === 'ArrowRight' ||
                e.key === 'a' || e.key === 'A' ||
                e.key === 'd' || e.key === 'D' ||
                e.key === 'w' || e.key === 'W' ||
                e.key === ' ' ||
                e.key === 'Enter') {
                
                // Map A/D to Arrow keys for consistency
                if (e.key === 'a' || e.key === 'A') {
                    const index = this.keys.indexOf('ArrowLeft');
                    if (index !== -1) this.keys.splice(index, 1);
                } else if (e.key === 'd' || e.key === 'D') {
                    const index = this.keys.indexOf('ArrowRight');
                    if (index !== -1) this.keys.splice(index, 1);
                } else {
                    const index = this.keys.indexOf(e.key);
                    if (index !== -1) this.keys.splice(index, 1);
            }
            }
            
            // Track bullet firing on key release for both ArrowUp and W
            if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && 
                this.game.player && this.game.player.bullets.length < 3) {
                this.bulletKeyCount++;
            }
        })
    }
}