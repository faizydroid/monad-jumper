import React, { useState } from 'react';
import { useAccount, useConfig, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import SimpleModal from './SimpleModal';
import './ReviveModal.css';

const ReviveModal = ({ isOpen, onClose, onRevive, onCancel, hasUsedRevive }) => {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState(null);
  const { address } = useAccount();
  const config = useConfig();
  const { writeContractAsync } = useWriteContract();
  
  const handleRevivePurchase = async () => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }
    
    setIsPurchasing(true);
    setError(null);
    
    try {
      // Use the ReviveContract address 
      const reviveContractAddress = '0xf8e81D47203A594245E36C48e151709F0C19fBe8';
      
      console.log("Sending revive purchase transaction for 0.5 MON");
      
      // Use wagmi's writeContractAsync
      const hash = await writeContractAsync({
        address: reviveContractAddress,
        abi: [
          {
            name: "purchaseRevive",
            type: "function",
            stateMutability: "payable",
            inputs: [],
            outputs: [],
          }
        ],
        functionName: "purchaseRevive",
        value: parseEther("0.5"),
      });
      
      console.log("Revive purchase transaction sent:", hash);
      
      // Call the onRevive callback after successful transaction
      if (onRevive) {
        onRevive();
      }
      
      // Close the modal
      onClose();
    } catch (err) {
      console.error("Revive purchase error:", err);
      
      if (err.message?.includes("insufficient funds")) {
        setError("You need 0.5 MON to purchase a revive");
      } else if (err.message?.includes("has already used their revive")) {
        setError("You've already used your revive for this session");
      } else if (err.message?.includes("rejected")) {
        setError("Transaction rejected in your wallet");
      } else {
        setError(err.message || "Failed to purchase revive. Please try again.");
      }
    } finally {
      setIsPurchasing(false);
    }
  };
  
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };
  
  if (hasUsedRevive) {
    return (
      <SimpleModal isOpen={isOpen} onClose={onClose} title="No Revives Left">
        <div className="revive-modal-content">
          <div className="revive-icon out-of-revives">💔</div>
          <h2>Out of Revives</h2>
          <p>You've already used your revive in this session.</p>
          
          <div className="revive-actions">
            <button 
              onClick={handleCancel}
              className="play-again-btn"
            >
              Play Again
            </button>
          </div>
        </div>
      </SimpleModal>
    );
  }
  
  return (
    <SimpleModal isOpen={isOpen} onClose={onClose} title="Continue Game?">
      <div className="revive-modal-content">
        <div className="revive-icon">🚀</div>
        <h2>Revive and Continue</h2>
        <p>Don't lose your progress! Continue from where you left off.</p>
        <p className="revive-cost">Cost: <strong>0.5 MON</strong></p>
        
        {error && (
          <div className="error-message" style={{color: '#FF5252', margin: '15px 0', padding: '10px', background: 'rgba(255,82,82,0.1)', borderRadius: '4px'}}>
            {error}
          </div>
        )}
        
        <div className="revive-actions">
          <button 
            onClick={handleRevivePurchase} 
            disabled={isPurchasing}
            className="buy-revive-btn"
          >
            {isPurchasing ? 'Processing...' : 'Buy Revive (0.5 MON)'}
            {isPurchasing && (
              <span className="spinner"></span>
            )}
          </button>
          
          <button 
            onClick={handleCancel}
            className="cancel-btn"
            disabled={isPurchasing}
          >
            Cancel
          </button>
        </div>
      </div>
    </SimpleModal>
  );
};

export default ReviveModal; 