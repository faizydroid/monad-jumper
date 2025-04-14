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
      <div key={character.id} className="shop-item">
        <div className="shop-item-image">
          <img src={character.image} alt={character.name} />
        </div>
        <div className="shop-item-details">
          <h3>{character.name}</h3>
          <p>{character.description}</p>
          <div className="shop-item-price">
            {character.owned ? (
              <button className="owned-button" disabled>Owned</button>
            ) : (
              <button 
                className="buy-button" 
                onClick={() => handlePurchase(character)}
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
      <div key={boost.id} className="shop-item">
        <div className="shop-item-image">
          <img src={boost.image} alt={boost.name} />
        </div>
        <div className="shop-item-details">
          <h3>{boost.name}</h3>
          <p>{boost.description}</p>
          <div className="shop-item-price">
            <button 
              className="buy-button" 
              onClick={() => handlePurchase(boost)}
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
      <div className="shop-container">
        <div className="shop-tabs">
          <button 
            className={`shop-tab ${activeTab === 'characters' ? 'active' : ''}`}
            onClick={() => setActiveTab('characters')}
          >
            Characters
          </button>
          <button 
            className={`shop-tab ${activeTab === 'boosts' ? 'active' : ''}`}
            onClick={() => setActiveTab('boosts')}
          >
            Boosts
          </button>
        </div>
        
        <div className="shop-items">
          {activeTab === 'characters' ? (
            renderCharacterItems()
          ) : (
            renderBoostItems()
          )}
        </div>
        
        {/* Coming Soon Overlay */}
        <div className="shop-coming-soon-overlay">
          <div className="lock-container">
            <div className="lock">
              <div className="lock-body">🔒</div>
              <div className="chain chain-left"></div>
              <div className="chain chain-right"></div>
            </div>
          </div>
          <div className="coming-soon-text">COMING SOON</div>
        </div>
      </div>
    </SimpleModal>
  );
};

export default ShopModal; 