import React, { useEffect } from 'react';
import '../styles/GameCards.css';

const GameCards = () => {
  useEffect(() => {
    console.log('GameCards component mounted');
  }, []);

  return (
    <div className="game-cards-container">
      <div className="game-card how-to-play-card">
        <div className="card-badge">HOW TO PLAY</div>
        <div className="card-content">
          <h2 className="card-title">🎮 Jump Your Way Up!</h2>
          
          <div className="instruction-list">
            <div className="instruction-item">
              <span className="instruction-icon">⬅️➡️</span>
              <div className="instruction-text">
                <strong>Left & Right Arrows</strong> to move horizontally
              </div>
            </div>
            
            <div className="instruction-item">
              <span className="instruction-icon">🔄</span>
              <div className="instruction-text">
                <strong>Auto-Jump</strong> helps you navigate platforms
              </div>
            </div>
            
            <div className="instruction-item">
              <span className="instruction-icon">⌨️</span>
              <div className="instruction-text">
                <strong>Space Bar</strong> to shoot enemies
              </div>
            </div>
            
            <div className="instruction-item">
              <span className="instruction-icon">⚡</span>
              <div className="instruction-text">
                <strong>Level Up</strong>
              </div>
            </div>
            
           
          </div>
        </div>
      </div>
      
      <div className="game-card features-card">
        <div className="card-badge">FEATURES</div>
        <div className="card-content">
          <h2 className="card-title">⛓️ Blockchain Powers</h2>
          
          <div className="feature-list">
            <div className="feature-item">
              <span className="feature-icon">🔐</span>
              <div className="feature-text">
                
                <strong>On-Chain Scores</strong>
                <p>Your high scores are stored on Monad blockchain</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">👾</span>
              <div className="feature-text">
                <strong>Mint your character</strong>
                <p>Play with your minted character</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🦘</span>
              <div className="feature-text">
                <strong>Jump NFTs</strong>
                <p>Each jump is recorded as a transaction</p>
              </div>
            </div>
            
           
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <div className="feature-text">
                <strong>Monad Speed | 10,000 TPS</strong>
                <p>Experience lightning-fast transactions</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Make sure to properly export the component as default
export default GameCards; 