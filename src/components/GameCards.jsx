import React from 'react';
import '../styles/GameCards.css';

const GameCards = () => {
  return (
    <div className="game-cards-container">
      {/* How to Play Card */}
      <div className="game-card how-to-play-card">
        <div className="card-badge">GUIDE</div>
        <h3 className="card-title">How to Play</h3>
        <div className="instruction-list">
          <div className="instruction-item">
            <div className="instruction-icon">1</div>
            <div className="instruction-text">
              <strong>Move</strong>
              Use arrow keys to move left and right
            </div>
          </div>
          
          <div className="instruction-item">
            <div className="instruction-icon">2</div>
            <div className="instruction-text">
              <strong>Jump</strong>
              Jump on platforms to go higher
            </div>
          </div>
          
          <div className="instruction-item">
            <div className="instruction-icon">3</div>
            <div className="instruction-text">
              <strong>Collect</strong>
              Gather coins and power-ups
            </div>
          </div>
          
          <div className="instruction-item">
            <div className="instruction-icon">4</div>
            <div className="instruction-text">
              <strong>Score</strong>
              Reach higher to score more points
            </div>
          </div>
        </div>
      </div>
      
      {/* Blockchain Features Card */}
      <div className="game-card features-card">
        <div className="card-badge">FEATURES</div>
        <h3 className="card-title">Blockchain Powers</h3>
        <div className="feature-list">
          <div className="feature-item">
            <div className="feature-icon">🏆</div>
            <div className="feature-text">
              <strong>On-Chain Leaderboard</strong>
              Your scores are saved on Monad blockchain
            </div>
          </div>
          
          <div className="feature-item">
            <div className="feature-icon">🎮</div>
            <div className="feature-text">
              <strong>NFT Character</strong>
              Mint your unique character to play
            </div>
          </div>
          
          <div className="feature-item">
            <div className="feature-icon">💎</div>
            <div className="feature-text">
              <strong>Earn Rewards</strong>
              Collect tokens as you play
            </div>
          </div>
          
          <div className="feature-item">
            <div className="feature-icon">🚀</div>
            <div className="feature-text">
              <strong>Community Events</strong>
              Join competitions for prizes
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameCards; 