import React from 'react';
import { FaTimes } from 'react-icons/fa';

const ShopContent = ({ onClose }) => {
  return (
    <div className="shop-content">
      <div className="coming-soon-overlay">
        <div className="coming-soon-message">COMING SOON</div>
      </div>
      
      <button className="panel-close-button" onClick={onClose}>
        <FaTimes />
      </button>
      
      <h2>Shop</h2>
      <p>Welcome to the JumpNads shop! Browse our items below.</p>
      
      <div className="shop-items">
        {/* Shop items go here */}
        <div className="shop-item">
          <div className="item-image">🚀</div>
          <h3>Rocket Boost</h3>
          <p>Jump 2x higher for 30 seconds</p>
          <button className="buy-button">Buy for 10 MON</button>
        </div>
        
        <div className="shop-item">
          <div className="item-image">🛡️</div>
          <h3>Shield</h3>
          <p>Protect from one fall</p>
          <button className="buy-button">Buy for 20 MON</button>
        </div>
        
        <div className="shop-item">
          <div className="item-image">⭐</div>
          <h3>Score Multiplier</h3>
          <p>2x points for your next game</p>
          <button className="buy-button">Buy for 15 MON</button>
        </div>
      </div>
    </div>
  );
};

export default ShopContent; 