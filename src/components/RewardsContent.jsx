import React from 'react';
import { FaTimes } from 'react-icons/fa';

const RewardsContent = ({ onClose }) => {
  return (
    <div className="rewards-content">
      <div className="coming-soon-overlay">
        <div className="coming-soon-message">COMING SOON</div>
      </div>
      
      <button className="panel-close-button" onClick={onClose}>
        <FaTimes />
      </button>
      
      <h2>Rewards</h2>
      <p>Earn special rewards by playing and completing challenges!</p>
      
      <div className="rewards-list">
        <div className="reward-item">
          <div className="reward-icon">🏆</div>
          <div className="reward-info">
            <h3>High Scorer</h3>
            <p>Reach a score of 1000</p>
            <div className="progress-bar">
              <div className="progress" style={{width: '65%'}}></div>
            </div>
            <p>Reward: 50 MON</p>
          </div>
          <button className="claim-button" disabled>Claim</button>
        </div>
        
        <div className="reward-item">
          <div className="reward-icon">🔄</div>
          <div className="reward-info">
            <h3>Daily Jumper</h3>
            <p>Play 5 days in a row</p>
            <div className="progress-bar">
              <div className="progress" style={{width: '40%'}}></div>
            </div>
            <p>Reward: 25 MON</p>
          </div>
          <button className="claim-button" disabled>Claim</button>
        </div>
        
        <div className="reward-item">
          <div className="reward-icon">💯</div>
          <div className="reward-info">
            <h3>Century Jumper</h3>
            <p>Complete 100 jumps in one game</p>
            <div className="progress-bar">
              <div className="progress" style={{width: '100%'}}></div>
            </div>
            <p>Reward: 30 MON</p>
          </div>
          <button className="claim-button">Claim</button>
        </div>
      </div>
    </div>
  );
};

export default RewardsContent; 