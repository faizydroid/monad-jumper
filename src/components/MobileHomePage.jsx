import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useWeb3 } from '../contexts/Web3Context';
import './MobileHomePage.css';
import MusicPlayer from './MusicPlayer';
import Navbar from './Navbar';
import Leaderboard from './Leaderboard';
import { FaBars, FaTrophy, FaTimes } from 'react-icons/fa';

const MobileHomePage = ({ 
  characterImg, 
  onPlay, 
  onMint,
  hasMintedNft,
  isNftLoading 
}) => {
  const { isConnected, address } = useAccount();
  const { playerHighScore, totalJumps, username } = useWeb3();
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Add states for menu and leaderboard panels
  const [menuOpen, setMenuOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  
  // Simple animation for character
  const [characterPosition, setCharacterPosition] = useState(0);
  
  // Close panels when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuOpen && !document.getElementById('mobile-nav-menu').contains(e.target) && 
          !document.getElementById('menu-toggle-btn').contains(e.target)) {
        setMenuOpen(false);
      }
      
      if (leaderboardOpen && !document.getElementById('mobile-leaderboard').contains(e.target) && 
          !document.getElementById('leaderboard-toggle-btn').contains(e.target)) {
        setLeaderboardOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [menuOpen, leaderboardOpen]);
  
  // Character animation
  useEffect(() => {
    // Animate character jump
    let animationFrame;
    let jumpHeight = 0;
    let jumping = false;
    let jumpDirection = 'up';
    
    const animateCharacter = () => {
      if (jumping) {
        if (jumpDirection === 'up') {
          jumpHeight += 1.5;
          if (jumpHeight >= 30) {
            jumpDirection = 'down';
          }
        } else {
          jumpHeight -= 1.5;
          if (jumpHeight <= 0) {
            jumpHeight = 0;
            jumpDirection = 'up';
            jumping = false;
            // Schedule next random jump
            setTimeout(() => {
              jumping = true;
            }, Math.random() * 3000 + 1000);
          }
        }
        setCharacterPosition(-jumpHeight);
      }
      
      animationFrame = requestAnimationFrame(animateCharacter);
    };
    
    // Start animation
    jumping = true;
    animationFrame = requestAnimationFrame(animateCharacter);
    
    return () => cancelAnimationFrame(animationFrame);
  }, []);
  
  // Toggle functions
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
    if (leaderboardOpen) setLeaderboardOpen(false);
  };
  
  const toggleLeaderboard = () => {
    setLeaderboardOpen(!leaderboardOpen);
    if (menuOpen) setMenuOpen(false);
  };

  // If not connected, show standard connect screen
  if (!isConnected) {
    return (
      <div className="mobile-container">
        {/* Game logo and header */}
        <div className="mobile-header">
          <h1 className="mobile-game-title">JumpNads</h1>
          <p className="mobile-game-subtitle">Jump to the MOON!</p>
        </div>
        
        {/* Animated character */}
        <div className="mobile-character-container">
          <img 
            src={characterImg} 
            alt="Game Character" 
            className="mobile-character"
            style={{ transform: `translateY(${characterPosition}px)` }} 
          />
          <div className="mobile-character-shadow"></div>
        </div>
        
        <div className="mobile-welcome-message">
          <p>Connect your wallet to start your jumping adventure</p>
          <div className="mobile-wallet-connect">
            <ConnectButton 
              showBalance={false}
              chainStatus="none"
              accountStatus="address"
              label="Connect Wallet"
            />
          </div>
        </div>
        
        {/* Background music player */}
        <MusicPlayer />
        
        {/* Info bubbles */}
        <div className="mobile-game-facts">
          <div className="mobile-fact-bubble mobile-fact-bubble-1">
            <span>🚀</span>
            <p>Play & Earn!</p>
          </div>
          <div className="mobile-fact-bubble mobile-fact-bubble-2">
            <span>🎮</span>
            <p>Fun Gameplay!</p>
          </div>
          <div className="mobile-fact-bubble mobile-fact-bubble-3">
            <span>⛓️</span>
            <p>Powered by Monad!</p>
          </div>
        </div>
      </div>
    );
  }

  // Connected user view with new layout
  return (
    <div className="mobile-container">
      {/* Header with menu, title, and leaderboard button */}
      <div className="mobile-nav-header">
        <button 
          id="menu-toggle-btn"
          className="mobile-menu-toggle" 
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <FaBars size={24} />
        </button>
        
        <h1 className="mobile-nav-title">JumpNads</h1>
        
        <button 
          id="leaderboard-toggle-btn"
          className="mobile-leaderboard-toggle" 
          onClick={toggleLeaderboard}
          aria-label="Toggle leaderboard"
        >
          <FaTrophy size={24} />
        </button>
      </div>
      
      {/* Sliding menu panel */}
      <div id="mobile-nav-menu" className={`mobile-nav-menu ${menuOpen ? 'open' : ''}`}>
        <div className="mobile-nav-menu-header">
          <button 
            className="mobile-nav-close" 
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <FaTimes size={24} />
          </button>
          <h2>Menu</h2>
        </div>
        <div className="mobile-nav-content">
          <Navbar mobile={true} />
        </div>
      </div>
      
      {/* Sliding leaderboard panel */}
      <div id="mobile-leaderboard" className={`mobile-leaderboard-panel ${leaderboardOpen ? 'open' : ''}`}>
        <div className="mobile-leaderboard-header">
          <h2>Leaderboard</h2>
          <button 
            className="mobile-leaderboard-close" 
            onClick={() => setLeaderboardOpen(false)}
            aria-label="Close leaderboard"
          >
            <FaTimes size={24} />
          </button>
        </div>
        <div className="mobile-leaderboard-content">
          <Leaderboard mobile={true} />
        </div>
      </div>
      
      {/* Main content - only visible when panels are closed */}
      <div className={`mobile-main-content ${menuOpen || leaderboardOpen ? 'blurred' : ''}`}>
        {/* Stats */}
        {username && (
          <div className="mobile-stats-container">
            <div className="mobile-stat">
              <span className="mobile-stat-icon">🏆</span>
              <span className="mobile-stat-value">{playerHighScore || 0}</span>
              <span className="mobile-stat-label">Hi-Score</span>
            </div>
            <div className="mobile-stat">
              <span className="mobile-stat-icon">🦘</span>
              <span className="mobile-stat-value">{totalJumps || 0}</span>
              <span className="mobile-stat-label">Jumps</span>
            </div>
          </div>
        )}
        
        {/* Animated character */}
        <div className="mobile-character-container">
          <img 
            src={characterImg} 
            alt="Game Character" 
            className="mobile-character"
            style={{ transform: `translateY(${characterPosition}px)` }} 
          />
          <div className="mobile-character-shadow"></div>
        </div>
        
        {/* Play/Mint buttons */}
        <div className="mobile-action-container">
          {isNftLoading ? (
            <>
              <p>Checking NFT ownership...</p>
              <div className="mobile-loading-indicator"></div>
            </>
          ) : hasMintedNft ? (
            <>
              <button 
                onClick={onPlay}
                className="mobile-play-button"
              >
                PLAY NOW
              </button>
              <button 
                onClick={() => setShowTutorial(true)}
                className="mobile-tutorial-button"
              >
                How to Play
              </button>
            </>
          ) : (
            <>
              <p>Mint an NFT to start playing</p>
              <button 
                onClick={onMint}
                className="mobile-mint-button"
              >
                MINT TO PLAY
              </button>
            </>
          )}
        </div>
        
        {/* Background music player */}
        <MusicPlayer />
      </div>
      
      {/* Game tutorial modal */}
      {showTutorial && (
        <div className="mobile-tutorial-overlay" onClick={() => setShowTutorial(false)}>
          <div className="mobile-tutorial-content" onClick={e => e.stopPropagation()}>
            <h2>How to Play</h2>
            <div className="mobile-tutorial-instruction">
              <div className="mobile-tutorial-icon">👆</div>
              <p>Tap left side to move left</p>
            </div>
            <div className="mobile-tutorial-instruction">
              <div className="mobile-tutorial-icon">👆</div>
              <p>Tap right side to move right</p>
            </div>
            <div className="mobile-tutorial-instruction">
              <div className="mobile-tutorial-icon">🦘</div>
              <p>Jump automatically on platforms</p>
            </div>
            <div className="mobile-tutorial-instruction">
              <div className="mobile-tutorial-icon">🎮</div>
              <p>Higher jumps = more points!</p>
            </div>
            <button 
              className="mobile-tutorial-close"
              onClick={() => setShowTutorial(false)}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
      
      {/* Overlay for when menu or leaderboard is open */}
      {(menuOpen || leaderboardOpen) && (
        <div 
          className="mobile-overlay" 
          onClick={() => {
            setMenuOpen(false);
            setLeaderboardOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default MobileHomePage; 