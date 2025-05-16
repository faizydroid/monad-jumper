/**
 * Helper utility to handle game over after a player has used revive
 * This consolidates the logic to ensure scores are properly saved
 */

/**
 * Process a game over after a player has used revive
 * 
 * @param {string} gameId - The game session ID
 * @param {number} finalScore - The final score to record
 * @param {number} jumpCount - The number of jumps to record
 * @param {object} walletClient - The wagmi wallet client
 * @param {object} publicClient - The wagmi public client
 * @param {string} address - The player's wallet address
 * @param {object} supabase - The Supabase client for DB updates
 * @returns {Promise<boolean>} - Promise resolving to success status
 */
export async function processGameOverAfterRevive(gameId, finalScore, jumpCount, walletClient, publicClient, address, supabase) {
  console.log(`🔄 Processing game over after revive directly via helper function`);
  
  // CRITICAL: Check global completion tracking first
  if (!window.__COMPLETED_GAME_SESSIONS) {
    window.__COMPLETED_GAME_SESSIONS = new Set();
  }
  
  // Extract the base session ID without timestamp
  const baseSessionId = gameId.includes('_') ? gameId.split('_')[0] : gameId;
  
  // Check if this session was already processed
  if (window.__COMPLETED_GAME_SESSIONS.has(baseSessionId)) {
    console.log(`🛑 Session ${baseSessionId} already processed in revive handler - skipping completely`);
    return true;
  }
  
  // Create a globally unique transaction ID
  const globalTxId = `revive_tx_${gameId}_${Date.now()}`;
  let lockAcquired = false;
  
  // CRITICAL FIX: Use the original session ID from when the game was started
  // This ensures we store the score with the same session ID used when revive was purchased
  const originalSessionId = window.__currentGameSessionId || gameId;
  if (originalSessionId !== gameId) {
    console.log(`⚠️ FIXING SESSION ID MISMATCH: Using original session ID ${originalSessionId} instead of ${gameId}`);
    gameId = originalSessionId;
  }
  
  // Always try to save score first, regardless of blockchain transaction lock
  if (finalScore > 0 && supabase) {
    try {
      const scoreValue = parseInt(finalScore);
      if (scoreValue > 0) {
        console.log(`📝 Saving score ${scoreValue} directly to database (priority save)`);
        
        // Create score object
        const scoreData = {
          wallet_address: address.toLowerCase(),
          score: scoreValue,
          game_id: `revive_${gameId}_${Date.now()}`
        };
        
        // Save directly to database
        const { error } = await supabase.from('scores').insert(scoreData);
        
        if (error) {
          console.error("Error saving score:", error);
        } else {
          // Update local high score if this is higher (do this even if we can't acquire lock)
          if (window.web3Context && window.web3Context.setPlayerHighScore) {
            window.web3Context.setPlayerHighScore(prevScore => {
              return Math.max(prevScore || 0, scoreValue);
            });
          }
          console.log("✅ Score saved directly in revive handler");
        }
      }
    } catch (err) {
      console.error("Error in score saving:", err);
    }
  }
  
  // Use the new shared transaction locking system
  if (!window.__TX_LOCK_SYSTEM) {
    window.__TX_LOCK_SYSTEM = {
      locked: false,
      lockedAt: 0,
      currentTx: null,
      lockTransaction: function(txId) {
        if (this.locked) {
          console.log(`⛔ Transaction already locked by ${this.currentTx} at ${new Date(this.lockedAt).toLocaleTimeString()}`);
          return false;
        }
        this.locked = true;
        this.lockedAt = Date.now();
        this.currentTx = txId;
        console.log(`🔒 Transaction lock acquired by ${txId} at ${new Date(this.lockedAt).toLocaleTimeString()}`);
        return true;
      },
      unlockTransaction: function() {
        const wasTx = this.currentTx;
        this.locked = false;
        this.currentTx = null;
        console.log(`🔓 Transaction lock released from ${wasTx} at ${new Date().toLocaleTimeString()}`);
        return true;
      },
      isLocked: function() {
        return this.locked;
      },
      // Add auto-release after timeout
      autoRelease: function(timeout = 10000) {
        setTimeout(() => {
          if (this.locked) {
            console.log(`⏱️ Auto-releasing transaction lock after timeout`);
            this.unlockTransaction();
          }
        }, timeout);
      }
    };
  }
  
  // Try to acquire the lock for blockchain transaction
  lockAcquired = window.__TX_LOCK_SYSTEM.lockTransaction(globalTxId);
  if (!lockAcquired) {
    console.log(`⚠️ Transaction system locked - preventing duplicate transactions`);
    return false; // Only blockchain transaction was skipped, score was already saved
  }
  
  // Set auto-release to prevent deadlocks
  window.__TX_LOCK_SYSTEM.autoRelease(30000);
  
  // Track this transaction to prevent duplicates
  if (!window.__PROCESSED_GAME_OVER_TXS) {
    window.__PROCESSED_GAME_OVER_TXS = new Set();
  }
  window.__PROCESSED_GAME_OVER_TXS.add(globalTxId);
  
  // RESET ALL TRACKING FLAGS
  if (window.__GAME_OVER_PROCESSED) {
    if (window.__GAME_OVER_PROCESSED.resetSession) {
      window.__GAME_OVER_PROCESSED.resetSession(gameId);
      console.log(`🔄 Reset game over processed tracking for session after revive: ${gameId}`);
    }
    window.__GAME_OVER_PROCESSED.resetProcessing();
  }
  
  // Clear any existing transaction flags
  window.__gameOverTransactionSent = null;
  window.__GLOBAL_TRANSACTION_IN_PROGRESS = false;
  
  try {
    if (finalScore > 0 && window.__GAME_TX_QUEUE) {
      // Reset the queue first
      window.__GAME_TX_QUEUE.reset();
      
      // Set score and gameId
      window.__GAME_TX_QUEUE.finalScore = finalScore;
      window.__GAME_TX_QUEUE.gameId = gameId;
      
      // Get jump count from multiple possible sources
      let effectiveJumpCount = jumpCount;
      
      // Try to get jumps from the iframe directly
      try {
        const iframe = document.querySelector('.game-frame');
        if (iframe && iframe.contentWindow && typeof iframe.contentWindow.__jumpCount === 'number') {
          const iframeJumps = iframe.contentWindow.__jumpCount;
          console.log(`📊 Found ${iframeJumps} jumps directly in iframe`);
          
          // Only use iframe jumps if higher than what we received
          if (iframeJumps > effectiveJumpCount) {
            effectiveJumpCount = iframeJumps;
            console.log(`📈 Using higher jump count from iframe: ${effectiveJumpCount}`);
          }
        }
      } catch (e) {
        console.warn('Could not access iframe jump count:', e);
      }
      
      // Also check global jumps tracking
      if (window.__LATEST_JUMPS && window.__LATEST_JUMPS > effectiveJumpCount) {
        effectiveJumpCount = window.__LATEST_JUMPS;
        console.log(`📈 Using higher jump count from global tracking: ${effectiveJumpCount}`);
      }
      
      // CRITICAL FIX: Always use a minimum value of 10 jumps if we have a score
      // This ensures jumps are always recorded even if tracking failed
      if (finalScore > 0 && effectiveJumpCount < 10) {
        effectiveJumpCount = Math.max(10, Math.floor(finalScore / 10));
        console.log(`⚠️ Using estimated minimum jump count based on score: ${effectiveJumpCount}`);
      }
      
      // Add jumps if we have them - use direct assignment for reliability
      if (effectiveJumpCount > 0) {
        window.__GAME_TX_QUEUE.jumps = effectiveJumpCount;
        console.log(`✅ DIRECTLY SETTING jump count to ${effectiveJumpCount} for post-revive processing`);
      }
      
      console.log(`🏆 Processing score ${finalScore} with ${effectiveJumpCount} jumps via helper function`);
      
      // Process the queue and wait for result
      const success = await window.__GAME_TX_QUEUE.processQueue(walletClient, publicClient, address, supabase);
      
      console.log(`✅ Helper function processed game over after revive: success=${success}`);
      
      // Clean up revive flag
      window.__reviveUsedForGameId = null;
      
      return success;
    } else {
      console.error('Missing score or transaction queue');
      return false;
    }
  } catch (error) {
    console.error('Error in revive game over helper:', error);
    return false;
  } finally {
    // Mark this session as completed to prevent future duplicate transactions
    if (!window.__COMPLETED_GAME_SESSIONS) {
      window.__COMPLETED_GAME_SESSIONS = new Set();
    }
    window.__COMPLETED_GAME_SESSIONS.add(baseSessionId);
    console.log(`✅ Session ${baseSessionId} marked as completed by revive handler - preventing any future transactions`);
    
    // Only release lock if we acquired it
    if (lockAcquired) {
      window.__TX_LOCK_SYSTEM.unlockTransaction();
    }
  }
}

/**
 * Register a session token with the backend server
 * 
 * @param {string} address - The player's wallet address 
 * @param {string} tokenString - The session token as a string
 * @param {string} gameId - The game session ID
 * @param {object} tokenData - Additional token data
 * @returns {Promise<boolean>} - Promise resolving to success status
 */
export async function registerSessionToken(address, tokenString, gameId, tokenData) {
  try {
    // Use relative URL to leverage the proxy in vite.config.js
    const response = await fetch('/api/register-session-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: address,
        token: tokenString,
        gameId: gameId,
        timestamp: Date.now(),
        tokenData: tokenData
      })
    });
    
    const data = await response.json();
    console.log('Token registration response:', data);
    
    return data.success;
  } catch (err) {
    console.error('Error registering session token:', err);
    return false;
  }
} 