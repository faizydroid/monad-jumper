import { GameTransactions } from '../services/gameTransactions';

// Function to expose our web3 functions to iframe
export const setupGameCommands = (iframe, {
  provider,
  account,
  contract,
  onScoreUpdate,
  onGameOver,
  onJump
}) => {
  // Check if iframe exists
  if (!iframe || !iframe.contentWindow) {
    console.error("Invalid iframe reference - cannot set up game commands");
    return () => {}; // Return empty cleanup function
  }

  // Create a transaction tracker
  const pendingTransactions = new Map();
  
  // Handle messages from the game
  const handleMessage = async (event) => {
    if (!event.data || !event.data.type) return;
    console.log('Game message received:', event.data);
    
    try {
      switch (event.data.type) {
        case 'JUMP':
          // Track this jump with a unique ID
          const jumpId = `jump-${Date.now()}`;
          pendingTransactions.set(jumpId, { type: 'jump', timestamp: Date.now() });
          
          if (onJump) {
            // Let the parent component know about the jump
            const result = await onJump();
            console.log('Jump result:', result);
            
            // IMPORTANT: Always force a success message back to the game
            // regardless of actual transaction status
            setTimeout(() => {
              iframe.contentWindow.postMessage({
                type: 'TRANSACTION_COMPLETE',
                data: { id: jumpId, type: 'jump', success: true }
              }, '*');
              
              // Remove from pending
              pendingTransactions.delete(jumpId);
            }, 1000); // Force completion after 1 second
          }
          break;
          
        case 'SCORE_UPDATE':
          console.log('Score update received:', event.data.score);
          await onScoreUpdate?.(event.data.score);
          break;
          
        case 'GAME_OVER':
          console.log('GAME OVER MESSAGE RECEIVED FROM IFRAME:', event.data);
          
          // Extract the jumpCount from the message data or use our local count
          const bundledJumpCount = event.data.jumpCount || 0;
          const finalScore = event.data.finalScore || 0;
          
          console.log(`Processing bundled game data: ${bundledJumpCount} jumps, final score: ${finalScore}`);
          
          if (typeof finalScore !== 'number') {
            console.error('Invalid final score:', finalScore);
            return;
          }
          
          try {
            // First update the final score
            await onScoreUpdate?.(finalScore);
            
            console.log('Calling updateScore with jump count:', bundledJumpCount);
            
            // Process the game over with bundled jump data
            const success = await onGameOver(finalScore, bundledJumpCount);
            console.log('Game over transaction result:', success);
            
            if (success) {
              console.log('Game over transaction completed successfully');
              iframe.contentWindow.postMessage({
                type: 'TRANSACTION_SUCCESS',
                data: { type: 'game_over' }
              }, '*');
            } else {
              console.error('Failed to process game over transaction');
              iframe.contentWindow.postMessage({
                type: 'TRANSACTION_FAILED',
                data: { type: 'game_over' }
              }, '*');
            }
          } catch (error) {
            console.error('Error in game over handling:', error);
            console.error('Error details:', error.message, error.stack);
            iframe.contentWindow.postMessage({
              type: 'TRANSACTION_FAILED',
              data: { type: 'game_over', error: error.message }
            }, '*');
          }
          break;
      }
    } catch (error) {
      console.error('Error handling game message:', error);
      
      // Always notify the game to continue even if there's an error
      iframe.contentWindow.postMessage({
        type: 'TRANSACTION_ERROR',
        data: { error: error.message }
      }, '*');
    }
  };
  
  // Listen for custom events from the wallet
  const handleTransactionComplete = (event) => {
    const { type, hash, success } = event.detail;
    console.log(`Transaction ${type} complete. Success: ${success}, Hash: ${hash}`);
    
    // Always notify the game about transaction completion
    iframe.contentWindow.postMessage({
      type: 'TRANSACTION_COMPLETE',
      data: { type, success, hash }
    }, '*');
  };
  
  // Set up event listeners
  window.addEventListener('message', handleMessage);
  window.addEventListener('transaction-complete', handleTransactionComplete);
  
  console.log("Game commands initialized with account:", account);
  
  return () => {
    window.removeEventListener('message', handleMessage);
    window.removeEventListener('transaction-complete', handleTransactionComplete);
  };
}; 