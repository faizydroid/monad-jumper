import React from 'react';
import SimpleModal from './SimpleModal';
import { parseEther } from 'viem';

const ReviveModal = ({ 
  isOpen, 
  onClose, 
  onRevive, 
  onCancel, 
  isReviving, 
  reviveError, 
  outOfRevives,
  score
}) => {
  return (
    <SimpleModal isOpen={isOpen} onClose={onClose} title="Continue Your Run?">
      <div className="revive-modal-content" style={{textAlign: 'center'}}>
        <div style={{fontSize: '64px', margin: '20px 0'}}>💀</div>
        
        <h2 style={{color: '#FF5252', marginBottom: '20px'}}>You Fell!</h2>
        <p>Current Score: <strong>{score || 0}</strong></p>
        
        {outOfRevives ? (
          <div style={{
            background: 'rgba(255,82,82,0.1)', 
            padding: '15px', 
            borderRadius: '8px', 
            margin: '15px 0'
          }}>
            <p style={{color: '#FF5252', fontWeight: 'bold', marginBottom: '5px'}}>Out of Revives!</p>
            <p>You've already used your revive for this session.</p>
          </div>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.1)', 
            padding: '15px', 
            borderRadius: '8px', 
            margin: '15px 0'
          }}>
            <p>Continue playing from where you fell?</p>
            <p style={{fontWeight: 'bold', marginTop: '5px'}}>Cost: <span style={{color: '#FFD700'}}>0.5 MON</span></p>
          </div>
        )}
        
        {reviveError && (
          <div className="error-message" style={{color: '#FF5252', margin: '15px 0', padding: '10px', background: 'rgba(255,82,82,0.1)', borderRadius: '4px'}}>
            {reviveError}
          </div>
        )}
        
        <div className="revive-actions" style={{marginTop: '20px', display: 'flex', gap: '10px'}}>
          {!outOfRevives && (
            <button 
              onClick={onRevive} 
              disabled={isReviving || outOfRevives}
              style={{
                background: isReviving ? '#888' : 'linear-gradient(90deg, #FF6B6B 0%, #FF5252 100%)',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '50px',
                color: 'white',
                flex: '1',
                cursor: isReviving || outOfRevives ? 'not-allowed' : 'pointer',
                position: 'relative'
              }}
            >
              {isReviving ? 'Reviving...' : 'Buy Revive (0.5 MON)'}
              {isReviving && (
                <span className="spinner" style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  position: 'absolute',
                  right: '15px',
                  top: 'calc(50% - 10px)'
                }}></span>
              )}
            </button>
          )}
          
          <button 
            onClick={onCancel}
            style={{
              padding: '12px 20px', 
              background: outOfRevives ? 'linear-gradient(90deg, #4CAF50 0%, #45A049 100%)' : 'transparent', 
              border: outOfRevives ? 'none' : '1px solid #ccc', 
              borderRadius: '50px', 
              color: 'white',
              flex: outOfRevives ? '1' : 'initial'
            }}
            disabled={isReviving}
          >
            {outOfRevives ? 'Play Again' : 'Cancel'}
          </button>
        </div>
      </div>
    </SimpleModal>
  );
};

export default ReviveModal; 