import React from 'react';
import './CartoonPopup.css';

const CartoonPopup = ({ isOpen, onClose, title, message, buttons }) => {
  if (!isOpen) return null;
  
  return (
    <div className="cartoon-popup-overlay">
      <div className="cartoon-popup">
        <div className="popup-cloud">
          <h2 className="popup-title bangers-font">{title}</h2>
          <div className="popup-content">
            {typeof message === 'string' ? <p>{message}</p> : message}
          </div>
          <div className="popup-buttons">
            {buttons.map((button, index) => (
              <button 
                key={index} 
                className={`popup-button ${button.type || 'primary'}`}
                onClick={button.onClick}
              >
                {button.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartoonPopup; 