/**
 * NadsBot Game Tracking Script
 * This script enhances game analytics by tracking additional metrics
 * for the NadsBot AI assistant to provide better gameplay feedback.
 */

(function() {
  console.log('🤖 NadsBot tracking initialized');
  
  // Store game session metrics
  window.__nadsBotData = {
    sessionStartTime: Date.now(),
    jumps: 0,
    platformTypes: {
      normal: 0,
      moving: 0,
      breaking: 0,
      special: 0
    },
    powerUps: [],
    deaths: {
      reason: 'none',
      position: null
    },
    shotsFired: 0,
    enemiesKilled: 0,
    maxHeight: 0
  };
  
  // Track platform types jumped on
  const originalJump = window.jumpPlayer;
  if (originalJump) {
    window.jumpPlayer = function(platformType = 'normal') {
      // Track the jump count
      window.__nadsBotData.jumps++;
      
      // Track platform type
      if (platformType && typeof platformType === 'string') {
        window.__nadsBotData.platformTypes[platformType] = 
          (window.__nadsBotData.platformTypes[platformType] || 0) + 1;
      }
      
      // Track max height if the game has a score property
      if (window.game && typeof window.game.score === 'number') {
        window.__nadsBotData.maxHeight = Math.max(
          window.__nadsBotData.maxHeight, 
          window.game.score
        );
      }
      
      // Call the original function
      return originalJump.apply(this, arguments);
    };
  }
  
  // Track shots fired
  const originalShoot = window.shootBullet;
  if (originalShoot) {
    window.shootBullet = function() {
      window.__nadsBotData.shotsFired++;
      return originalShoot.apply(this, arguments);
    };
  }
  
  // Track enemy deaths
  const originalEnemyDeath = window.enemyDeath;
  if (originalEnemyDeath) {
    window.enemyDeath = function(enemy) {
      window.__nadsBotData.enemiesKilled++;
      return originalEnemyDeath.apply(this, arguments);
    };
  }
  
  // Track player death reason
  const originalGameOver = window.gameOver;
  if (originalGameOver) {
    window.gameOver = function(score, reason = 'fall') {
      // Get death reason (fall vs enemy)
      window.__nadsBotData.deaths.reason = reason;
      
      // Calculate session duration
      const sessionDuration = Date.now() - window.__nadsBotData.sessionStartTime;
      
      // Prepare the complete analytics data for NadsBot
      const analyticsData = {
        score: score,
        jumps: window.__nadsBotData.jumps,
        deathReason: window.__nadsBotData.deaths.reason,
        platformTypes: Object.keys(window.__nadsBotData.platformTypes)
          .filter(type => window.__nadsBotData.platformTypes[type] > 0),
        shotsFired: window.__nadsBotData.shotsFired,
        enemiesKilled: window.__nadsBotData.enemiesKilled,
        maxHeight: window.__nadsBotData.maxHeight,
        duration: sessionDuration,
        timestamp: new Date().toISOString()
      };
      
      // Send the analytics data to the parent window
      if (window.parent) {
        try {
          window.parent.postMessage({
            type: 'GAME_OVER',
            data: {
              finalScore: score,
              jumpCount: window.__nadsBotData.jumps,
              ...analyticsData
            }
          }, '*');
          console.log('🤖 NadsBot analytics data sent to parent:', analyticsData);
        } catch (err) {
          console.error('Failed to send NadsBot analytics:', err);
        }
      }
      
      // Call the original function
      return originalGameOver.apply(this, arguments);
    };
  }
  
  // Reset tracking data on game restart
  const originalReset = window.resetGame;
  if (originalReset) {
    window.resetGame = function() {
      // Reset all tracking data
      window.__nadsBotData = {
        sessionStartTime: Date.now(),
        jumps: 0,
        platformTypes: {
          normal: 0,
          moving: 0,
          breaking: 0,
          special: 0
        },
        powerUps: [],
        deaths: {
          reason: 'none',
          position: null
        },
        shotsFired: 0,
        enemiesKilled: 0,
        maxHeight: 0
      };
      
      // Call the original function
      return originalReset.apply(this, arguments);
    };
  }
  
  console.log('🤖 NadsBot tracking hooks installed');
})(); 