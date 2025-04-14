import { GameTransactions } from '../services/gameTransactions';

// Function to expose our web3 functions to iframe
export const setupGameCommands = (iframe, options) => {
  const {
    provider,
    account,
    contract,
    onScoreUpdate,
    onGameOver,
    onJump
  } = options;
  
  // Keep track of processed messages
  const processedMessages = new Set();
  
  // Debounce score updates
  const debouncedScoreUpdate = debounce((score) => {
    if (typeof onScoreUpdate === 'function') {
      onScoreUpdate(score);
    }
  }, 200);
  
  const handleMessage = async (event) => {
    // Skip if already being processed (prevent re-entry)
    if (window.__processingGameMessage) return;
    
    try {
      window.__processingGameMessage = true;
      
      // Quick validation
      if (!event.data || typeof event.data !== 'object') return;
      
      const { type, data } = event.data;
      
      // Skip common messages that flood the console
      if (type === 'GET_HIGH_SCORE' || type === 'GET_ACCOUNT') {
        return;
      }
      
      // Generate a unique message ID that includes relevant properties but not timestamps
      // This helps deduplicate functionally identical messages
      const messageProps = { type };
      if (data) {
        if (data.jumpCount) messageProps.jumpCount = data.jumpCount;
        if (data.score) messageProps.score = data.score;
        if (data.saveId) messageProps.saveId = data.saveId;
      }
      
      const messageId = JSON.stringify(messageProps);
      
      // Track processed messages with a timeout-based cache
      if (!window.__gameCommandCache) {
        window.__gameCommandCache = new Map();
      }
      
      // Skip if processed in the last 2 seconds
      const lastProcessed = window.__gameCommandCache.get(messageId);
      if (lastProcessed && Date.now() - lastProcessed < 2000) {
        return;
      }
      
      // Mark as processed with timestamp
      window.__gameCommandCache.set(messageId, Date.now());
      
      // Handle the message based on type
      switch (type) {
        case 'SCORE_UPDATE':
          debouncedScoreUpdate(data.score);
          break;
          
        case 'JUMP_PERFORMED':
          // Just use local tracking without blockchain calls
          if (typeof onJump === 'function') {
            onJump(data.platformType).catch(err => 
              console.error('Background jump handling error:', err)
            );
          }
          break;
          
        case 'GAME_OVER':
          // Only process this once
          if (window.__gameOverProcessed) return;
          window.__gameOverProcessed = true;
          
          console.log(`GAME OVER MESSAGE RECEIVED FROM IFRAME:`, event.data);
          
          // Extract the final data
          const jumpCount = iframe.contentWindow.__jumpCount || data.jumpCount || 0;
          const finalScore = data.score || 0;
          
          console.log(`Processing bundled game data: ${jumpCount} jumps, final score: ${finalScore}`);
          
          // Update score display
          if (typeof onScoreUpdate === 'function') {
            onScoreUpdate(finalScore);
          }
          
          // Process game over and save all data
          if (typeof onGameOver === 'function') {
            console.log(`Calling updateScore with jump count: ${jumpCount}`);
            try {
              const result = await onGameOver(finalScore);
              console.log(`Game over transaction result: ${result}`);
            } catch (error) {
              console.error(`Failed to process game over transaction:`, error);
            }
          }
          
          // Reset game over flag after processing completes
          setTimeout(() => {
            window.__gameOverProcessed = false;
          }, 10000);
          break;
      }
    } finally {
      // Always clear the processing flag
      window.__processingGameMessage = false;
    }
  };
  
  window.addEventListener('message', handleMessage);
  
  return {
    cleanup: () => {
      window.removeEventListener('message', handleMessage);
    }
  };
};

// Helper debounce function
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
} 