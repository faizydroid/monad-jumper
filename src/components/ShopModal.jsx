import React, { useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import SimpleModal from './SimpleModal';
import './ShopModal.css';

const ShopModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('characters');
  const { purchasePowerUp } = useWeb3();

  const handlePurchase = (item) => {
    console.log(`Purchasing ${item.name}`);
    if (item.type === 'boost') {
      purchasePowerUp(item.id);
    }
  };

  const characters = [
    {
      id: 1,
      name: 'Classic Jumper',
      image: '/images/monad0.png',
      price: 5,
      description: 'The original JumpNads character',
      owned: true
    },
    {
      id: 2,
      name: 'Super Jumper',
      image: '/images/monad1.png',
      price: 10,
      description: 'Jump higher with this enhanced character',
      owned: false
    },
    {
      id: 3,
      name: 'Ninja Jumper',
      image: '/images/monad2.png',
      price: 15,
      description: 'Stealthy and quick, perfect for setting high scores',
      owned: false
    }
  ];

  const boosts = [
    {
      id: 'double_jump',
      name: 'Double Jump',
      image: '/images/boost_double.png',
      price: 2,
      description: 'Jump twice in mid-air',
      type: 'boost'
    },
    {
      id: 'spring_boots',
      name: 'Spring Boots',
      image: '/images/boost_spring.png',
      price: 3,
      description: 'Bounce higher off platforms',
      type: 'boost'
    },
    {
      id: 'score_multiplier',
      name: 'Score Multiplier',
      image: '/images/boost_multiplier.png',
      price: 5,
      description: '2x score for your next game',
      type: 'boost'
    },
    {
      id: 'shield',
      name: 'Shield',
      image: '/images/boost_shield.png',
      price: 4,
      description: 'Protect yourself from one fall',
      type: 'boost'
    }
  ];

  const renderCharacterItems = () => {
    return characters.map(character => (
      <div key={character.id} className="shop-item" style={{
        background: 'white',
        borderRadius: '15px',
        padding: '20px',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transition: 'transform 0.3s ease'
      }}>
        <div className="shop-item-image" style={{
          width: '100px',
          height: '100px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '15px'
        }}>
          <img src={character.image} alt={character.name} style={{
            maxWidth: '100%',
            maxHeight: '100%'
          }} />
        </div>
        <div className="shop-item-details" style={{
          textAlign: 'center',
          width: '100%'
        }}>
          <h3 style={{
            margin: '0 0 10px 0',
            fontSize: '1.2rem',
            fontFamily: 'Bangers, cursive'
          }}>{character.name}</h3>
          <p style={{
            margin: '0 0 15px 0',
            fontSize: '0.9rem',
            color: '#666'
          }}>{character.description}</p>
          <div className="shop-item-price">
            {character.owned ? (
              <button className="owned-button" disabled style={{
                background: '#e0e0e0',
                color: '#666',
                border: 'none',
                borderRadius: '20px',
                padding: '8px 20px',
                fontWeight: 'bold',
                cursor: 'not-allowed',
                width: '100%',
                maxWidth: '200px'
              }}>Owned</button>
            ) : (
              <button 
                className="buy-button" 
                onClick={() => handlePurchase(character)}
                style={{
                  background: 'linear-gradient(135deg, #FFD166 0%, #F0B429 100%)',
                  color: '#333',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '8px 20px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: '100%',
                  maxWidth: '200px',
                  transition: 'all 0.2s'
                }}
              >
                Buy for {character.price} MON
              </button>
            )}
          </div>
        </div>
      </div>
    ));
  };

  const renderBoostItems = () => {
    return boosts.map(boost => (
      <div key={boost.id} className="shop-item" style={{
        background: 'white',
        borderRadius: '15px',
        padding: '20px',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transition: 'transform 0.3s ease'
      }}>
        <div className="shop-item-image" style={{
          width: '80px',
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '15px'
        }}>
          <img src={boost.image} alt={boost.name} style={{
            maxWidth: '100%',
            maxHeight: '100%'
          }} />
        </div>
        <div className="shop-item-details" style={{
          textAlign: 'center',
          width: '100%'
        }}>
          <h3 style={{
            margin: '0 0 10px 0',
            fontSize: '1.2rem',
            fontFamily: 'Bangers, cursive'
          }}>{boost.name}</h3>
          <p style={{
            margin: '0 0 15px 0',
            fontSize: '0.9rem',
            color: '#666'
          }}>{boost.description}</p>
          <div className="shop-item-price">
            <button 
              className="buy-button" 
              onClick={() => handlePurchase(boost)}
              style={{
                background: 'linear-gradient(135deg, #FFD166 0%, #F0B429 100%)',
                color: '#333',
                border: 'none',
                borderRadius: '20px',
                padding: '8px 20px',
                fontWeight: 'bold',
                cursor: 'pointer',
                width: '100%',
                maxWidth: '200px',
                transition: 'all 0.2s'
              }}
            >
              Buy for {boost.price} MON
            </button>
          </div>
        </div>
      </div>
    ));
  };

  return (
    <SimpleModal isOpen={isOpen} onClose={onClose} title="JumpNads SHOP">
      <div className="shop-container" style={{
        position: 'relative',
        padding: '10px'
      }}>
        <div className="shop-tabs" style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <button 
            className={`shop-tab ${activeTab === 'characters' ? 'active' : ''}`}
            onClick={() => setActiveTab('characters')}
            style={{
              padding: '8px 15px',
              borderRadius: '20px',
              border: 'none',
              background: activeTab === 'characters' ? '#4ECDC4' : '#e0e0e0',
              color: activeTab === 'characters' ? 'white' : '#666',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Characters
          </button>
          <button 
            className={`shop-tab ${activeTab === 'boosts' ? 'active' : ''}`}
            onClick={() => setActiveTab('boosts')}
            style={{
              padding: '8px 15px',
              borderRadius: '20px',
              border: 'none',
              background: activeTab === 'boosts' ? '#4ECDC4' : '#e0e0e0',
              color: activeTab === 'boosts' ? 'white' : '#666',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Boosts
          </button>
        </div>
        
        <div className="shop-items" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '20px',
          maxWidth: '100%',
          margin: '0 auto'
        }}>
          {activeTab === 'characters' ? (
            renderCharacterItems()
          ) : (
            renderBoostItems()
          )}
        </div>
        
        {/* Coming Soon Overlay */}
        <div className="shop-coming-soon-overlay" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100
        }}>
          <div className="lock-container" style={{
            marginBottom: '20px'
          }}>
            <div className="lock" style={{
              fontSize: '4rem',
              position: 'relative',
              animation: 'float 2s ease-in-out infinite'
            }}>
              <div className="lock-body">🔒</div>
              <div className="chain chain-left" style={{
                position: 'absolute',
                top: '-20px',
                left: '-15px',
                fontSize: '1.5rem'
              }}>⛓</div>
              <div className="chain chain-right" style={{
                position: 'absolute',
                top: '-20px',
                right: '-15px',
                fontSize: '1.5rem'
              }}>⛓</div>
            </div>
          </div>
          <div className="coming-soon-text" style={{
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
      </div>
      
      {/* Mobile Responsive Styles */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @media (max-width: 768px) {
          .shop-items {
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important;
            gap: 15px !important;
            padding: 0 10px !important;
          }
          
          .shop-item {
            padding: 15px !important;
          }
          
          .coming-soon-text {
            font-size: 2rem !important;
            padding: 8px 16px !important;
          }
          
          .lock {
            font-size: 3rem !important;
          }
        }
        
        @media (max-width: 480px) {
          .shop-items {
            grid-template-columns: 1fr !important;
            max-width: 280px !important;
            margin: 0 auto !important;
          }
          
          .shop-tabs {
            gap: 10px !important;
          }
          
          .shop-tab {
            padding: 6px 12px !important;
            font-size: 0.9rem !important;
          }
          
          .coming-soon-text {
            font-size: 1.5rem !important;
            padding: 6px 12px !important;
          }
          
          .lock {
            font-size: 2.5rem !important;
          }
          
          .shop-item-image {
            width: 70px !important;
            height: 70px !important;
          }
          
          .shop-item h3 {
            font-size: 1.1rem !important;
          }
          
          .shop-item p {
            font-size: 0.8rem !important;
          }
          
          .buy-button, .owned-button {
            padding: 6px 15px !important;
            font-size: 0.9rem !important;
          }
        }
      `}</style>
    </SimpleModal>
  );
};

export default ShopModal; 