import React from 'react';
import { FaTimes } from 'react-icons/fa';

const RewardsContent = ({ onClose }) => {
  return (
    <div className="rewards-content">
      <div className="coming-soon-overlay" style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10
      }}>
        <div className="coming-soon-message" style={{
          fontFamily: 'Bangers, cursive',
          fontSize: '2.5rem',
          color: 'white',
          textShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
          transform: 'rotate(-5deg)',
          border: '3px solid white',
          padding: '10px 20px',
          borderRadius: '10px',
          boxShadow: '0 0 20px rgba(255, 255, 255, 0.3)'
        }}>COMING SOON</div>
      </div>
      
      <button className="panel-close-button" onClick={onClose} style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 20
      }}>
        <FaTimes />
      </button>
      
      <h2 style={{
        fontFamily: 'Bangers, cursive',
        fontSize: '2.2rem',
        marginBottom: '20px',
        textAlign: 'center'
      }}>Rewards</h2>
      <p style={{
        textAlign: 'center',
        marginBottom: '30px',
        fontSize: '1.1rem'
      }}>Earn special rewards by playing and completing challenges!</p>
      
      <div className="rewards-list" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <div className="reward-item" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          background: 'white',
          borderRadius: '15px',
          padding: '20px',
          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)',
          flexWrap: 'wrap'
        }}>
          <div className="reward-icon" style={{
            fontSize: '36px',
            minWidth: '60px',
            textAlign: 'center'
          }}>🏆</div>
          <div className="reward-info" style={{
            flex: '1 1 200px'
          }}>
            <h3 style={{
              marginTop: 0,
              marginBottom: '10px',
              fontSize: '1.3rem'
            }}>High Scorer</h3>
            <p style={{
              margin: '0 0 10px 0',
              fontSize: '0.9rem'
            }}>Reach a score of 1000</p>
            <div className="progress-bar" style={{
              height: '10px',
              background: '#eee',
              borderRadius: '5px',
              margin: '10px 0',
              overflow: 'hidden'
            }}>
              <div className="progress" style={{
                width: '65%',
                height: '100%',
                background: 'linear-gradient(to right, #4ECDC4, #556270)',
                borderRadius: '5px'
              }}></div>
            </div>
            <p style={{
              margin: '10px 0 0 0',
              fontWeight: 'bold',
              fontSize: '0.9rem'
            }}>Reward: 50 MON</p>
          </div>
          <button className="claim-button" disabled style={{
            minWidth: '80px',
            padding: '8px 16px',
            borderRadius: '20px',
            background: '#ccc',
            color: 'white',
            border: 'none',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            cursor: 'not-allowed'
          }}>Claim</button>
        </div>
        
        <div className="reward-item" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          background: 'white',
          borderRadius: '15px',
          padding: '20px',
          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)',
          flexWrap: 'wrap'
        }}>
          <div className="reward-icon" style={{
            fontSize: '36px',
            minWidth: '60px',
            textAlign: 'center'
          }}>🔄</div>
          <div className="reward-info" style={{
            flex: '1 1 200px'
          }}>
            <h3 style={{
              marginTop: 0,
              marginBottom: '10px',
              fontSize: '1.3rem'
            }}>Daily Jumper</h3>
            <p style={{
              margin: '0 0 10px 0',
              fontSize: '0.9rem'
            }}>Play 5 days in a row</p>
            <div className="progress-bar" style={{
              height: '10px',
              background: '#eee',
              borderRadius: '5px',
              margin: '10px 0',
              overflow: 'hidden'
            }}>
              <div className="progress" style={{
                width: '40%',
                height: '100%',
                background: 'linear-gradient(to right, #4ECDC4, #556270)',
                borderRadius: '5px'
              }}></div>
            </div>
            <p style={{
              margin: '10px 0 0 0',
              fontWeight: 'bold',
              fontSize: '0.9rem'
            }}>Reward: 25 MON</p>
          </div>
          <button className="claim-button" disabled style={{
            minWidth: '80px',
            padding: '8px 16px',
            borderRadius: '20px',
            background: '#ccc',
            color: 'white',
            border: 'none',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            cursor: 'not-allowed'
          }}>Claim</button>
        </div>
        
        <div className="reward-item" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          background: 'white',
          borderRadius: '15px',
          padding: '20px',
          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)',
          flexWrap: 'wrap'
        }}>
          <div className="reward-icon" style={{
            fontSize: '36px',
            minWidth: '60px',
            textAlign: 'center'
          }}>💯</div>
          <div className="reward-info" style={{
            flex: '1 1 200px'
          }}>
            <h3 style={{
              marginTop: 0,
              marginBottom: '10px',
              fontSize: '1.3rem'
            }}>Century Jumper</h3>
            <p style={{
              margin: '0 0 10px 0',
              fontSize: '0.9rem'
            }}>Complete 100 jumps in one game</p>
            <div className="progress-bar" style={{
              height: '10px',
              background: '#eee',
              borderRadius: '5px',
              margin: '10px 0',
              overflow: 'hidden'
            }}>
              <div className="progress" style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(to right, #4ECDC4, #556270)',
                borderRadius: '5px'
              }}></div>
            </div>
            <p style={{
              margin: '10px 0 0 0',
              fontWeight: 'bold',
              fontSize: '0.9rem'
            }}>Reward: 30 MON</p>
          </div>
          <button className="claim-button" style={{
            minWidth: '80px',
            padding: '8px 16px',
            borderRadius: '20px',
            background: 'linear-gradient(to right, #4ECDC4, #556270)',
            color: 'white',
            border: 'none',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}>Claim</button>
        </div>
      </div>
      
      {/* Mobile Responsive Styles */}
      <style jsx>{`
        @media (max-width: 768px) {
          .coming-soon-message {
            font-size: 2rem !important;
            padding: 8px 16px !important;
          }
          
          .reward-item {
            padding: 15px !important;
            gap: 15px !important;
          }
          
          h2 {
            font-size: 1.8rem !important;
          }
        }
        
        @media (max-width: 480px) {
          .coming-soon-message {
            font-size: 1.5rem !important;
          }
          
          .reward-item {
            flex-direction: column !important;
            align-items: flex-start !important;
            padding: 12px !important;
          }
          
          .reward-icon {
            margin-bottom: 10px !important;
          }
          
          .claim-button {
            align-self: stretch !important;
            width: 100% !important;
            margin-top: 10px !important;
          }
          
          h2 {
            font-size: 1.5rem !important;
            margin-top: 30px !important;
          }
          
          p {
            font-size: 0.9rem !important;
          }
          
          .panel-close-button {
            top: 10px !important;
            right: 10px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default RewardsContent; 