import React, { useEffect } from 'react';
import './AbsoluteModal.css';

// This is a modal that deliberately avoids fancy React patterns and just uses DOM
const AbsoluteModal = ({ isOpen, onClose, children }) => {
  // Just use direct DOM manipulation
  useEffect(() => {
    if (isOpen) {
      // Create a div for the modal
      const modalOverlay = document.createElement('div');
      modalOverlay.className = 'absolute-modal-overlay';
      
      // Create modal content
      const modalContent = document.createElement('div');
      modalContent.className = 'absolute-modal-content';
      
      // Create close button
      const closeButton = document.createElement('button');
      closeButton.className = 'absolute-modal-close';
      closeButton.textContent = '×';
      closeButton.onclick = () => {
        document.body.removeChild(modalOverlay);
        if (onClose) onClose();
      };
      
      // Create content container
      const contentContainer = document.createElement('div');
      contentContainer.className = 'absolute-modal-inner';
      contentContainer.innerHTML = '<h2>Mint Character</h2>' +
        '<div class="character-image"><img src="/monad0.png" alt="Character"></div>' +
        '<p>Price: 1 MON</p>' +
        '<button class="mint-now-btn">Mint Character</button>';
      
      // Add click handler for mint button
      contentContainer.querySelector('.mint-now-btn').onclick = () => {
        alert('Minting character... (This is a simplified version)');
      };
      
      // Build the modal
      modalContent.appendChild(closeButton);
      modalContent.appendChild(contentContainer);
      modalOverlay.appendChild(modalContent);
      
      // Add to body
      document.body.appendChild(modalOverlay);
      
      // Click outside to close
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
          document.body.removeChild(modalOverlay);
          if (onClose) onClose();
        }
      });
    }
    
    // Cleanup function
    return () => {
      const existingOverlay = document.querySelector('.absolute-modal-overlay');
      if (existingOverlay) {
        document.body.removeChild(existingOverlay);
      }
    };
  }, [isOpen, onClose]);
  
  // This component doesn't render anything itself
  return null;
};

export default AbsoluteModal; 