import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWeb3 } from '../contexts/Web3Context';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';
import { FaHome, FaGift, FaShoppingCart, FaCalendarCheck, FaDiscord, FaTwitter } from 'react-icons/fa';
import ShopContent from './ShopContent';
import RewardsContent from './RewardsContent';
import DailyQuestContent from './DailyQuestContent';
import MusicPlayer from './MusicPlayer';

export default function Navbar() {
  const { account, username, playerHighScore } = useWeb3();
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [transitioning, setTransitioning] = useState(false);
  const location = useLocation();
  
  // Check if we're on different pages
  const isHomepage = location.pathname === '/' && !window.location.hash.includes('game');
  const isGameScreen = window.location.hash === '#game' || 
                       location.pathname.includes('game') ||
                       document.getElementById('game-iframe') !== null;
  
  // Handle section changes with animation
  const changeSection = (section) => {
    if (section === activeSection || transitioning || isGameScreen) return;
    
    setTransitioning(true);
    
    // Start transition out
    document.querySelector('.content-container').classList.add('sliding-out');
    
    // After exit animation completes, change section and start entry animation
    setTimeout(() => {
      setActiveSection(section);
      document.querySelector('.content-container').classList.remove('sliding-out');
      document.querySelector('.content-container').classList.add('sliding-in');
      
      setTimeout(() => {
        document.querySelector('.content-container').classList.remove('sliding-in');
        setTransitioning(false);
      }, 300); // Changed from 500ms to 300ms
    }, 300); // Changed from 500ms to 300ms
  };

  // Add app-content class to main containers
  useEffect(() => {
    const appDivs = document.querySelectorAll('.app, .container, .game-container');
    appDivs.forEach(div => {
      div.classList.add('app-content');
    });
    
    // Add content container if it doesn't exist
    if (!document.querySelector('.content-container') && !isGameScreen) {
      const contentContainer = document.createElement('div');
      contentContainer.className = 'content-container';
      document.body.appendChild(contentContainer);
    }
    
    return () => {
      appDivs.forEach(div => {
        div.classList.remove('app-content');
      });
    };
  }, [isGameScreen]);
  
  // Update panel visibility in game screen
  useEffect(() => {
    if (isGameScreen) {
      const container = document.querySelector('.content-container');
      if (container) {
        // Don't hide the container, just make it transparent initially
        container.style.opacity = '0';
        container.style.pointerEvents = 'none';
      }
    } else {
      const container = document.querySelector('.content-container');
      if (container) {
        container.style.display = 'block';
        container.style.opacity = '1';
        container.style.pointerEvents = 'auto';
      }
    }
  }, [isGameScreen]);

  return (
    <>
      <nav className="vertical-navbar">
        <div className="vertical-container">
          {/* TOP SECTION - USERNAME */}
          <div className="vertical-top">
            {account && username ? (
              <>
                <div className="username-button" style={{ fontSize: '38px', margin: '5px 0' }}>
                  {username}
                </div>
                <div className="high-score" style={{ margin: '10px auto', display: 'inline-flex' }}>
                  <span role="img" aria-label="trophy">🏆</span>
                  <span className="score-value">{playerHighScore || 0}</span>
                </div>
              </>
            ) : (
              <div style={{ padding: '20px 0' }}>
                <ConnectButton showBalance={false} label="Connect" />
              </div>
            )}
          </div>
          
          {/* MIDDLE SECTION - NAV ITEMS */}
          <div className="vertical-middle">
            <button
              className={`vertical-nav-item ${activeSection === 'home' ? 'active' : ''} ${!username ? 'disabled-button' : ''}`}
              onClick={() => {
                if (!username) return; // Prevent navigation if no username
                if (isGameScreen) {
                  window.location.hash = '';
                  window.location.href = '/';
                } else {
                  changeSection('home');
                }
              }}
            >
              <FaHome size={20} />
              <span>Home</span>
            </button>
            
            <button 
              className={`vertical-nav-item ${activeSection === 'daily-quest' ? 'active' : ''} ${!username ? 'disabled-button' : ''}`}
              onClick={() => username && changeSection('daily-quest')}
            >
              <FaCalendarCheck size={20} />
              <span>Quests</span>
            </button>
            
            <button 
              className={`vertical-nav-item ${activeSection === 'rewards' ? 'active' : ''} ${!username ? 'disabled-button' : ''}`}
              onClick={() => username && changeSection('rewards')}
            >
              <FaGift size={20} />
              <span>Rewards</span>
            </button>
            
            <button 
              className={`vertical-nav-item ${activeSection === 'shop' ? 'active' : ''} ${!username ? 'disabled-button' : ''}`}
              onClick={() => username && changeSection('shop')}
            >
              <FaShoppingCart size={20} />
              <span>Shop</span>
            </button>
          </div>
          
          {/* BOTTOM SECTION - WALLET & SOCIAL */}
          <div className="vertical-bottom">
            {account && (
              <div style={{ 
                marginBottom: '15px',
                display: 'flex',
                justifyContent: 'center',
                width: '100%'
              }}>
                <ConnectButton 
                  showBalance={false} 
                  chainStatus="icon"
                  accountStatus="address"
                />
              </div>
            )}
            
            <div className="vertical-social">
              <a href="https://discord.gg/pK5SZDtypv" target="_blank" rel="noopener noreferrer">
                <FaDiscord />
              </a>
              <a href="https://x.com/jumpnads" target="_blank" rel="noopener noreferrer">
                <FaTwitter />
              </a>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Add MusicPlayer component here which will be positioned fixed */}
      <MusicPlayer />
      
      {/* Content Panel System */}
      {!isGameScreen && (
        <div className="sliding-panel-container">
          {activeSection === 'home' && (
            <div className="home-panel panel">
              {/* Main content is already rendered by routes */}
            </div>
          )}
          
          {activeSection === 'daily-quest' && (
            <div className="daily-quest-panel panel">
              <DailyQuestContent onClose={() => changeSection('home')} />
            </div>
          )}
          
          {activeSection === 'rewards' && (
            <div className="rewards-panel panel">
              <RewardsContent onClose={() => changeSection('home')} />
            </div>
          )}
          
          {activeSection === 'shop' && (
            <div className="shop-panel panel">
              <ShopContent onClose={() => changeSection('home')} />
            </div>
          )}
        </div>
      )}
    </>
  );
} 