import React, { useState, useEffect, useRef } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWeb3 } from '../contexts/Web3Context';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';
import { FaHome, FaGift, FaShoppingCart, FaCalendarCheck, FaDiscord, FaTwitter, FaBars, FaStar, FaTimes } from 'react-icons/fa';
import ShopContent from './ShopContent';
import RewardsContent from './RewardsContent';
import DailyQuestContent from './DailyQuestContent';
import MusicPlayer from './MusicPlayer';
import Leaderboard from './Leaderboard';

function NavbarContent({ activeSection, onSectionChange, onClose, isMobilePanel }) {
  const { account, username, playerHighScore } = useWeb3();
  const location = useLocation();
  const [hasNewHighScore, setHasNewHighScore] = useState(false);
  const prevHighScoreRef = useRef(0);
  
  // Check if we're on different pages
  const isGameScreen = window.location.hash === '#game' || 
                       location.pathname.includes('game') ||
                       document.getElementById('game-iframe') !== null;
  
  // Effect to detect high score changes and show animation
  useEffect(() => {
    if (playerHighScore > prevHighScoreRef.current && prevHighScoreRef.current > 0) {
      setHasNewHighScore(true);
      const timer = setTimeout(() => {
        setHasNewHighScore(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
    prevHighScoreRef.current = playerHighScore;
  }, [playerHighScore]);

  // Handle click on a navigation item
  const handleNavClick = (section) => {
    console.log('NavbarContent: clicked on', section);
    
    // If we're in a game, go back to home first
    if (isGameScreen && section === 'home') {
      window.location.hash = '';
      window.location.href = '/';
      return;
    }
    
    // Change active section immediately
    onSectionChange(section);
    
    // Close mobile panel if applicable, but with a delay to allow state to update
    if (isMobilePanel && onClose) {
      // Give browser time to process state change before closing panel
      setTimeout(() => onClose(), 300);
    }
  };

  return (
    <div className="vertical-container">
      {/* TOP SECTION - USERNAME */}
      <div className="vertical-top">
        {account && username ? (
          <>
            <div className="username-button bangers-font">
              {username}
            </div>
            <div className={`high-score ${hasNewHighScore ? 'highlight-score' : ''}`} style={{ display: 'inline-flex' }}>
              <span role="img" aria-label="trophy">🏆</span>
              <span className="score-value bangers-font">{playerHighScore || 0}</span>
              {hasNewHighScore && <span className="new-high-score-badge">NEW!</span>}
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
          onClick={() => username && handleNavClick('home')}
          disabled={!username}
        >
          <FaHome size={20} />
          <span>HOME</span>
        </button>
        
        <button 
          className={`vertical-nav-item ${activeSection === 'daily-quest' ? 'active' : ''} ${!username ? 'disabled-button' : ''}`}
          onClick={() => username && handleNavClick('daily-quest')}
          disabled={!username}
        >
          <FaCalendarCheck size={20} />
          <span>QUESTS</span>
        </button>
        
        <button 
          className={`vertical-nav-item ${activeSection === 'rewards' ? 'active' : ''} ${!username ? 'disabled-button' : ''}`}
          onClick={() => username && handleNavClick('rewards')}
          disabled={!username}
        >
          <FaGift size={20} />
          <span>REWARDS</span>
        </button>
        
        <button 
          className={`vertical-nav-item ${activeSection === 'shop' ? 'active' : ''} ${!username ? 'disabled-button' : ''}`}
          onClick={() => username && handleNavClick('shop')}
          disabled={!username}
        >
          <FaShoppingCart size={20} />
          <span>SHOP</span>
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
  );
}

export default function Navbar({ onClose, mobileView }) {
  const [activeSection, setActiveSection] = useState('home');
  const [transitioning, setTransitioning] = useState(false);
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  // Check if being rendered in mobile slide panel
  const isMobilePanel = !!onClose || mobileView === true;

  // Check if we're on game screen
  const isGameScreen = window.location.hash === '#game' || 
                       location.pathname.includes('game') ||
                       document.getElementById('game-iframe') !== null;
  
  // Handle section changes with animation
  const changeSection = (section) => {
    console.log('Main navbar: changing section to', section);
    
    if (section === activeSection || transitioning || isGameScreen) return;
    
    // Set state immediately
    setActiveSection(section);
    setTransitioning(true);
    
    // Force panels to update immediately
    const panelContainer = document.querySelector('.sliding-panel-container');
    if (panelContainer) {
      // Hide all panels first
      const panels = panelContainer.querySelectorAll('.panel');
      panels.forEach(panel => {
        panel.style.display = 'none';
      });
      
      // Show the selected panel
      const activePanel = panelContainer.querySelector(`.${section}-panel`);
      if (activePanel) {
        activePanel.style.display = 'block';
      }
    }
    
    // Start transition animations
    const contentContainer = document.querySelector('.content-container');
    if (contentContainer) {
      contentContainer.classList.add('sliding-out');
      
      // After exit animation completes, start entry animation
      setTimeout(() => {
        contentContainer.classList.remove('sliding-out');
        contentContainer.classList.add('sliding-in');
        
        setTimeout(() => {
          contentContainer.classList.remove('sliding-in');
          setTransitioning(false);
        }, 300);
      }, 300);
    } else {
      // No content container, just clear transitioning state
      setTimeout(() => {
        setTransitioning(false);
      }, 300);
    }
  };

  // Set up content container on mount
  useEffect(() => {
    // Add app-content class to main containers
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
    const container = document.querySelector('.content-container');
    if (!container) return;
    
    if (isGameScreen) {
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
    } else {
      container.style.display = 'block';
      container.style.opacity = '1';
      container.style.pointerEvents = 'auto';
    }
  }, [isGameScreen]);
  
  // When rendered in mobile panel, return the content with section state
  if (isMobilePanel) {
    return (
      <NavbarContent 
        activeSection={activeSection} 
        onSectionChange={changeSection}
        onClose={onClose}
        isMobilePanel={true}
      />
    );
  }

  return (
    <>
      {/* Desktop vertical navbar, hidden on mobile */}
      <nav className="vertical-navbar hide-on-mobile">
        <NavbarContent 
          activeSection={activeSection} 
          onSectionChange={changeSection} 
          isMobilePanel={false}
        />
      </nav>
      
      {/* Mobile hamburger/leaderboard buttons */}
      <div className="mobile-navbar-buttons">
        <button className="menu-btn" onClick={() => setShowMenu(true)}>
          <FaBars size={32} />
        </button>
        <button className="leaderboard-btn" onClick={() => setShowLeaderboard(true)}>
          <FaStar size={32} />
        </button>
      </div>
      
      {/* Sliding Menu Panel (mobile) */}
      <div className={`mobile-slide-panel left ${showMenu ? 'open' : ''}`}
           onClick={() => setShowMenu(false)}>
        <div className="panel-content" onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowMenu(false)} className="close-btn">
            <FaTimes /> Close
          </button>
          <NavbarContent 
            activeSection={activeSection} 
            onSectionChange={changeSection}
            onClose={() => setShowMenu(false)}
            isMobilePanel={true}
          />
        </div>
      </div>
      
      {/* Sliding Leaderboard Panel (mobile) */}
      <div className={`mobile-slide-panel right ${showLeaderboard ? 'open' : ''}`}
           onClick={() => setShowLeaderboard(false)}>
        <div className="panel-content" onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowLeaderboard(false)} className="close-btn">
            <FaTimes /> Close
          </button>
          <Leaderboard />
        </div>
      </div>
      
      {/* Music Player */}
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
            <div className="daily-quest-panel panel visible">
              <DailyQuestContent onClose={() => changeSection('home')} />
            </div>
          )}
          
          {activeSection === 'rewards' && (
            <div className="rewards-panel panel visible">
              <RewardsContent onClose={() => changeSection('home')} />
            </div>
          )}
          
          {activeSection === 'shop' && (
            <div className="shop-panel panel visible">
              <ShopContent onClose={() => changeSection('home')} />
            </div>
          )}
        </div>
      )}
    </>
  );
} 