import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWeb3 } from '../contexts/Web3Context';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';
import ShopModal from './ShopModal';

export default function Navbar() {
  const { account, username, playerHighScore } = useWeb3();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const location = useLocation();
  
  // Check if we're on the homepage (not game screen or other pages)
  const isHomepage = location.pathname === '/' && !window.location.hash.includes('game');
  
  // Check if we're on the game screen 
  const isGameScreen = window.location.hash === '#game' || 
                      location.pathname.includes('game') ||
                      document.getElementById('game-iframe') !== null;

  // Log the values for debugging
  console.log('Current path:', location.pathname);
  console.log('Current hash:', window.location.hash);
  console.log('Game iframe exists:', document.getElementById('game-iframe') !== null);
  console.log('Is game screen?', isGameScreen);
  console.log('Is homepage?', isHomepage);
  console.log('Account exists?', !!account);
  console.log('Should show connect button?', isHomepage && !account);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleHomeClick = (e) => {
    if (isGameScreen) {
      e.preventDefault();
      window.location.hash = '';
      window.location.href = '/';
    }
  };

  const openShopModal = () => {
    setShowShopModal(true);
  };

  const closeShopModal = () => {
    setShowShopModal(false);
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-left">
            <div className="navbar-logo">
              <span className="logo-text">JumpNads</span>
            </div>
          </div>
          
          <div className="navbar-right">
            {isGameScreen && (
              <div className="game-controls">
                <Link to="/" className="home-button" onClick={handleHomeClick}>
                  <button className="nav-button home-nav-button">
                    🏠 Home
                  </button>
                </Link>
                
                <div className="high-score">
                  <span role="img" aria-label="trophy">🏆</span>
                  <span className="score-label">Hi-Score:</span>
                  <span className="score-value">{playerHighScore || 0}</span>
                </div>
              </div>
            )}
            
            {account && username && (
              <>
                <button 
                  className="nav-button shop-button"
                  onClick={openShopModal}
                >
                  🛒 SHOP
                </button>
                
                <div className="wallet-info">
                  <div className="username-wrapper">
                    <button 
                      className="username-button" 
                      onClick={toggleDropdown}
                    >
                      <span role="img" aria-label="user">👤</span> 
                      {username}
                      {isGameScreen && <span className="dropdown-arrow">▼</span>}
                    </button>
                    
                    {showDropdown && isGameScreen && (
                      <div className="dropdown-menu">
                        <div className="connect-button-wrapper">
                          <ConnectButton 
                            showBalance={false} 
                            chainStatus="icon"
                            accountStatus="address"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            
            {/* Show connect button only on homepage - FIXED VERSION */}
            {isHomepage && (
              <div className="navbar-connect-button-fixed">
                <ConnectButton showBalance={true} />
              </div>
            )}
            
          
          </div>
        </div>
      </nav>
      
      {/* Shop Modal */}
      {showShopModal && <ShopModal isOpen={showShopModal} onClose={closeShopModal} />}
    </>
  );
} 