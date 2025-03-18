import React from 'react';
import ReactDOM from 'react-dom';
import './SimpleModal.css';

const SimpleModal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  
  return ReactDOM.createPortal(
    <div 
      className="simple-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="simple-modal-content">
        <div className="simple-modal-header">
          <h2>{title}</h2>
          <button className="simple-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="simple-modal-body">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SimpleModal; 