function recordJump() {
  window.parent.postMessage({ type: 'JUMP' }, '*');
}

function updateScore(score) {
  window.parent.postMessage({ type: 'SCORE_UPDATE', data: { score } }, '*');
}

function usePowerUp(powerUpType) {
  window.parent.postMessage({ type: 'POWER_UP', data: { powerUpType } }, '*');
}

function collectCoin(amount) {
  window.parent.postMessage({ type: 'COLLECT_COIN', data: { amount } }, '*');
}

function gameOver(finalScore) {
  window.parent.postMessage({ type: 'GAME_OVER', data: { finalScore } }, '*');
}

// Add this function to update transaction feedback UI in the game
window.updateTransactionStatus = function(type, status) {
  // Find any transaction feedback UI elements
  const statusElements = document.querySelectorAll('.transaction-status');
  const waitingElements = document.querySelectorAll('.waiting-approval');
  
  console.log('Updating transaction UI to:', status);
  
  // Update any status elements
  statusElements.forEach(el => {
    if (el.dataset.type === type || !el.dataset.type) {
      el.textContent = status;
      
      // Apply appropriate styling
      el.classList.remove('pending', 'error', 'success');
      el.classList.add(status === 'confirmed' ? 'success' : 
                      status === 'error' ? 'error' : 'pending');
    }
  });
  
  // Hide any waiting elements
  waitingElements.forEach(el => {
    el.style.display = 'none';
  });
  
  // Hide jump notification after success
  if (status === 'confirmed' && type === 'jump') {
    setTimeout(() => {
      const jumpNotifications = document.querySelectorAll('.jump-notification');
      jumpNotifications.forEach(el => {
        el.style.opacity = '0';
        setTimeout(() => {
          el.style.display = 'none';
        }, 300);
      });
    }, 1000);
  }
};

// Listen for transaction status updates from parent
window.addEventListener('message', function(event) {
  if (event.data && (
      event.data.type === 'TRANSACTION_COMPLETE' || 
      event.data.type === 'TRANSACTION_SUCCESS' ||
      event.data.type === 'FORCE_CONTINUE')) {
    
    // Update any transaction UI
    window.updateTransactionStatus(
      event.data.data?.type || 'jump', 
      event.data.type === 'TRANSACTION_COMPLETE' ? 'confirmed' : 'processed'
    );
    
    // Also clear any pending jump state
    if (window.game && window.game.player) {
      window.game.player.jumpRequested = false;
    }
  }
});

// Force clear any stuck "waiting" messages after 3 seconds
setInterval(() => {
  const waitingElements = document.querySelectorAll('.waiting-approval');
  waitingElements.forEach(el => {
    const timestamp = parseInt(el.dataset.timestamp || '0');
    if (timestamp && Date.now() - timestamp > 3000) {
      console.log('Auto-clearing stuck waiting message');
      el.style.display = 'none';
    }
  });
}, 1000);

// Add special handling for waiting approval messages
window.addEventListener('message', function(event) {
  // Check for the special UPDATE_WAITING_APPROVAL message type
  if (event.data && event.data.type === 'UPDATE_WAITING_APPROVAL') {
    console.log('Updating waiting approval UI:', event.data.data);
    
    // Find and update all waiting-approval elements
    const waitingElements = document.querySelectorAll('.waiting-approval');
    waitingElements.forEach(el => {
      // Replace "Waiting for approval" with "Jumps recorded!"
      el.textContent = event.data.data.newStatus || 'Jumps recorded!';
      el.classList.remove('waiting');
      el.classList.add('confirmed');
      
      // Optional: Add animation or style changes
      el.style.color = '#4CAF50';
      
      // Hide after a short delay
      setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.style.display = 'none', 300);
      }, 2000);
    });
    
    // Also find any transaction status indicators
    const statusElements = document.querySelectorAll('.tx-status, .transaction-status');
    statusElements.forEach(el => {
      el.textContent = 'Jumps recorded!';
      el.className = 'tx-status confirmed';
    });
    
    // Force any game logic to continue
    if (window.game && window.game.player) {
      window.game.player.jumpRequested = false;
    }
  }
});

// Add this function to directly update the UI
window.updateWaitingApproval = function(newStatus) {
  const waitingElements = document.querySelectorAll('.waiting-approval');
  waitingElements.forEach(el => {
    el.textContent = newStatus;
    el.classList.remove('waiting');
    el.classList.add('confirmed');
  });
};

// Add a direct DOM inspector function to help debug
window.checkForWaitingElements = function() {
  const elements = document.querySelectorAll('.waiting-approval, .tx-status, [data-status="waiting"]');
  console.log('Found waiting elements:', elements);
  return elements;
};

// Expose this to be called from the dev console
window.forceUpdateAllWaitingElements = function(message = 'Jumps recorded!') {
  const elements = document.querySelectorAll('.waiting-approval, .tx-status, [data-status="waiting"]');
  console.log(`Updating ${elements.length} waiting elements to "${message}"`);
  
  elements.forEach(el => {
    el.textContent = message;
    el.classList.remove('waiting', 'pending');
    el.classList.add('confirmed', 'success');
    el.style.color = '#4CAF50';
  });
  
  return elements.length;
};

// Add a MutationObserver to watch for dynamically added waiting elements
const setupWaitingObserver = () => {
  // Create a mutation observer to watch for dynamically added waiting elements
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        // Check for newly added waiting elements
        mutation.addedNodes.forEach(node => {
          if (node.classList && 
              (node.classList.contains('waiting-approval') || 
               node.getAttribute('data-status') === 'waiting')) {
            
            console.log('Detected dynamically added waiting element:', node);
            
            // Replace it almost immediately (wait 50ms to ensure it's fully added)
            setTimeout(() => {
              node.textContent = 'Jumps recorded!';
              node.classList.remove('waiting');
              node.classList.add('confirmed');
              node.style.color = '#4CAF50';
            }, 50);
          }
        });
      }
    });
  });
  
  // Start observing the document body for added nodes
  observer.observe(document.body, { 
    childList: true, 
    subtree: true, 
    attributes: true,
    attributeFilter: ['class', 'data-status'] 
  });
  
  return observer;
};

// Initialize the observer when the page loads
window.addEventListener('load', () => {
  const observer = setupWaitingObserver();
  console.log('Waiting element observer initialized');
  
  // Store the observer for potential cleanup
  window.waitingObserver = observer;
});

// Add this specific function to handle the yellow button in game over screen
window.updateGameOverWaitingButton = function() {
  console.log('Attempting to update game over waiting button');
  
  // Try multiple selectors to find the button
  const selectors = [
    '.waiting-for-approval',
    '[class*="waiting"]',
    '.game-over-screen button',
    '.game-over button',
    'button:contains("Waiting")'
  ];
  
  let found = false;
  
  selectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el.textContent.includes('Waiting')) {
          console.log('Found waiting button:', el);
          found = true;
          
          // Update the button
          el.textContent = 'Jumps recorded!';
          el.style.backgroundColor = '#4CAF50';
          el.style.color = 'white';
          
          // Remove any waiting classes
          if (el.className.includes('waiting')) {
            el.className = el.className.replace(/waiting[^\s]*/g, 'confirmed');
          }
        }
      });
    } catch(e) {
      console.error('Error with selector:', selector, e);
    }
  });
  
  if (!found) {
    console.log('Could not find waiting button, will try direct document query');
    
    // Walk the entire document looking for the text
    const textNodes = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    
    let node;
    while (node = walk.nextNode()) {
      if (node.textContent.includes('Waiting for approval')) {
        textNodes.push(node);
      }
    }
    
    textNodes.forEach(node => {
      console.log('Found text node with waiting text:', node);
      node.textContent = 'Jumps recorded!';
      
      // Try to style the parent element
      if (node.parentElement) {
        node.parentElement.style.backgroundColor = '#4CAF50';
        node.parentElement.style.color = 'white';
      }
    });
  }
};

// Modify the existing event listener for more aggressive updating
window.addEventListener('message', function(event) {
  if (!event.data) return;
  
  // Log all incoming messages for debugging
  console.log('Message from parent:', event.data);
  
  // Check for any transaction-related messages
  if (event.data.type && (
      event.data.type.includes('TRANSACTION') || 
      event.data.type.includes('JUMP') ||
      event.data.type.includes('UPDATE') ||
      event.data.type.includes('FORCE'))) {
    
    console.log('Processing transaction message:', event.data);
    
    // Update specific waiting elements
    window.updateTransactionStatus(
      event.data.data?.type || 'jump', 
      'Jumps recorded!'
    );
    
    // Also try the specialized game over function
    window.updateGameOverWaitingButton();
    
    // Clear any pending state
    if (window.game && window.game.player) {
      window.game.player.jumpRequested = false;
    }
    
    // Force update all waiting elements with a stronger approach
    window.forceUpdateAllWaitingElements('Jumps recorded!');
  }
});

// Add extra polling to continuously check for waiting elements
setInterval(() => {
  const waitingTexts = [
    'Waiting for approval',
    'Waiting for transaction',
    'Waiting'
  ];
  
  // Try to find any elements with waiting text
  waitingTexts.forEach(text => {
    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
      if (el.textContent && el.textContent.includes(text)) {
        console.log('Found element with waiting text:', el);
        
        // Don't change if it's an input or specific element type
        if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') {
          el.textContent = el.textContent.replace(text, 'Jumps recorded!');
          
          // Try to update styling if it looks like a button
          if (el.tagName === 'BUTTON' || 
              el.className.includes('button') || 
              el.style.backgroundColor) {
            el.style.backgroundColor = '#4CAF50';
            el.style.color = 'white';
          }
        }
      }
    });
  });
}, 2000);

// Remove any transaction status tracking from Game class
(function() {
  console.log('REMOVING TRANSACTION STATUS FROM GAME CLASS');
  
  // Check if the Game class exists and has a drawGameOverScreen method
  if (window.Game && window.Game.prototype.drawGameOverScreen) {
    // Override the drawGameOverScreen method to remove transaction status
    const originalDrawGameOver = window.Game.prototype.drawGameOverScreen;
    window.Game.prototype.drawGameOverScreen = function(context) {
      // Call original method
      originalDrawGameOver.call(this, context);
      
      // After a delay, make sure our simple message is shown
      setTimeout(() => {
        // Find the game over screen
        document.querySelectorAll('.game-over, .game-over-screen, [class*="modal"]').forEach(modal => {
          // Check for transaction status elements and remove them
          modal.querySelectorAll('*').forEach(el => {
            if (el.textContent && (
                el.textContent.includes('Waiting for approval') ||
                el.textContent.includes('Jumps recorded') ||
                el.textContent.includes('Transaction')
            )) {
              // This might be a transaction status element
              if (el.tagName === 'BUTTON' || 
                  el.className.includes('button') || 
                  el.style.backgroundColor === 'rgb(255, 193, 7)' ||
                  el.style.backgroundColor === '#FFC107' ||
                  el.style.backgroundColor === '#4CAF50') {
                console.log('Removing status element in game over screen');
                el.remove();
              }
            }
          });
        });
      }, 100);
    };
  }
  
  // Also override the global gameOver function if it exists
  if (window.gameOver) {
    const originalGameOver = window.gameOver;
    window.gameOver = function(finalScore) {
      console.log('Global gameOver called, removing transaction status');
      
      // Call original function
      originalGameOver.call(this, finalScore);
      
      // Remove transaction status elements
      setTimeout(() => {
        document.querySelectorAll('*').forEach(el => {
          if (el.textContent && (
              el.textContent.includes('Waiting for approval') ||
              el.textContent.includes('Transaction')
          )) {
            // Might be a status element
            if (el.tagName === 'BUTTON' || 
                el.className.includes('button') || 
                el.style.backgroundColor === 'rgb(255, 193, 7)' ||
                el.style.backgroundColor === '#FFC107') {
              console.log('Removing transaction status element');
              el.remove();
            }
          }
        });
        
        // Show simple message
        const container = document.querySelector('.game-over') || document.body;
        const messageDiv = document.createElement('div');
        messageDiv.id = 'tx-message';
        messageDiv.style.padding = '12px';
        messageDiv.style.margin = '10px 0';
        messageDiv.style.borderRadius = '8px';
        messageDiv.style.backgroundColor = '#2196F3';
        messageDiv.style.color = 'white';
        messageDiv.style.textAlign = 'center';
        messageDiv.style.fontWeight = 'bold';
        messageDiv.style.fontSize = '14px';
        messageDiv.innerHTML = '💰 Jumps will be saved to blockchain<br>after confirming in your wallet';
        
        // Add to container
        container.appendChild(messageDiv);
      }, 100);
    };
  }
  
  console.log('TRANSACTION STATUS REMOVED FROM GAME');
})(); 