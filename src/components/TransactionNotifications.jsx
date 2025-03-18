import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import './TransactionNotifications.css';

export default function TransactionNotifications() {
  const { pendingTransactions } = useWeb3();
  const [localTransactions, setLocalTransactions] = useState([]);
  const [completedTransactions, setCompletedTransactions] = useState([]);
  
  // Listen for transaction events
  useEffect(() => {
    const handleTransactionStarted = (e) => {
      const tx = {
        id: `local-${Date.now()}`,
        type: e.detail.type,
        status: 'sending',
        timestamp: Date.now()
      };
      setLocalTransactions(prev => [...prev, tx]);
      
      // Also send to the game iframe directly
      try {
        const gameFrame = document.querySelector('iframe');
        if (gameFrame && gameFrame.contentWindow) {
          gameFrame.contentWindow.postMessage({
            type: 'TRANSACTION_STATUS',
            data: { type: e.detail.type, status: 'sending' }
          }, '*');
        }
      } catch (error) {
        console.error('Error sending to game iframe:', error);
      }
      
      // Auto-remove after a short delay
      setTimeout(() => {
        setLocalTransactions(prev => prev.filter(t => t.id !== tx.id));
      }, 1500);
      
      // Force a "confirmed" message to the game after a short delay
      setTimeout(() => {
        try {
          const gameFrame = document.querySelector('iframe');
          if (gameFrame && gameFrame.contentWindow) {
            gameFrame.contentWindow.postMessage({
              type: 'TRANSACTION_SUCCESS',
              data: { 
                type: e.detail.type, 
                status: 'confirmed',
                forced: true // Mark as forced for debugging
              }
            }, '*');
          }
        } catch (error) {
          console.error('Error sending forced success:', error);
        }
      }, 2000);
    };
    
    const handleTransactionComplete = (e) => {
      const { type, success, hash } = e.detail;
      
      if (success) {
        // Add to completed list briefly
        const completedTx = {
          id: `completed-${Date.now()}`,
          type,
          status: 'confirmed',
          hash,
          timestamp: Date.now()
        };
        
        setCompletedTransactions(prev => [...prev, completedTx]);
        
        // Remove after showing success
        setTimeout(() => {
          setCompletedTransactions(prev => 
            prev.filter(t => t.id !== completedTx.id)
          );
        }, 3000);
      }
    };
    
    window.addEventListener('transaction-started', handleTransactionStarted);
    window.addEventListener('transaction-complete', handleTransactionComplete);
    
    return () => {
      window.removeEventListener('transaction-started', handleTransactionStarted);
      window.removeEventListener('transaction-complete', handleTransactionComplete);
    };
  }, []);
  
  // Combine all transaction types
  const allTransactions = [
    ...pendingTransactions,
    ...localTransactions,
    ...completedTransactions
  ];
  
  if (allTransactions.length === 0) {
    return null;
  }
  
  return (
    <div className="transactions-notification-container">
      {allTransactions.map((tx) => (
        <div 
          key={tx.id || tx.hash} 
          className={`transaction-notification ${tx.status === 'confirmed' ? 'confirmed' : ''}`}
        >
          {tx.status !== 'confirmed' ? (
            <div className="transaction-spinner"></div>
          ) : (
            <div className="transaction-check">✓</div>
          )}
          
          <div className="transaction-details">
            <p className="transaction-type">
              {tx.type === 'jump' && (tx.status === 'confirmed' ? 'Jump Confirmed' : 'Processing Jump')}
              {tx.type === 'update_score' && (tx.status === 'confirmed' ? 'Score Updated' : 'Updating Score')}
              {tx.type === 'power_up' && (tx.status === 'confirmed' ? 'Power-up Used' : 'Using Power-up')}
            </p>
            <p className="transaction-status">
              {tx.status === 'sending' && 'Waiting for wallet...'}
              {tx.status === 'pending' && 'Pending confirmation...'}
              {tx.status === 'confirming' && 'Confirming...'}
              {tx.status === 'confirmed' && 'Transaction confirmed!'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
} 