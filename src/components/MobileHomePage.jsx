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
  const [menuOpen, setMenuOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  
  // Simple animation for character
  const [characterPosition, setCharacterPosition] = useState(0);
  
  // Close panels when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Check if click is outside the menu and not on the menu button
      if (menuOpen && 
          !e.target.closest('.mobile-side-menu') && 
          !e.target.closest('.hamburger-button')) {
        setMenuOpen(false);
      }
      
      // Check if click is outside the leaderboard and not on the leaderboard button
      if (leaderboardOpen && 
          !e.target.closest('.mobile-leaderboard-panel') && 
          !e.target.closest('.leaderboard-button')) {
        setLeaderboardOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpen, leaderboardOpen]);
  
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
  
  // Prevent body scrolling when menus are open
  useEffect(() => {
    if (menuOpen || leaderboardOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [menuOpen, leaderboardOpen]);

  return (
    <div className="mobile-container">
      {/* Top Navigation Bar */}
      <div className="mobile-top-nav">
        <button 
          className="hamburger-button" 
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
            if (leaderboardOpen) setLeaderboardOpen(false);
          }}
        >
          <FaBars />
        </button>
        
        <h1 className="mobile-nav-title">JumpNads</h1>
        
        <button 
          className="leaderboard-button"
          onClick={(e) => {
            e.stopPropagation();
            setLeaderboardOpen(!leaderboardOpen);
            if (menuOpen) setMenuOpen(false);
          }}
        >
          <FaTrophy />
        </button>
      </div>
      
      {/* Sliding Menu */}
      <div className={`mobile-side-menu ${menuOpen ? 'open' : ''}`}>
        <button 
          className="close-menu-button"
          onClick={() => setMenuOpen(false)}
        >
          <FaTimes />
        </button>
        <div className="mobile-navbar-container">
          <Navbar isMobile={true} />
        </div>
      </div>
      
      {/* Sliding Leaderboard Panel */}
      <div className={`mobile-leaderboard-panel ${leaderboardOpen ? 'open' : ''}`}>
        <button 
          className="close-leaderboard-button"
          onClick={() => setLeaderboardOpen(false)}
        >
          <FaTimes />
        </button>
        <h2>Leaderboard</h2>
        <div className="mobile-leaderboard-container">
          <Leaderboard isMobile={true} />
        </div>
      </div>
      
      {/* Overlay when menus are open */}
      {(menuOpen || leaderboardOpen) && (
        <div 
          className="mobile-overlay" 
          onClick={() => {
            setMenuOpen(false);
            setLeaderboardOpen(false);
          }}
        />
      )}
      
      {/* Main Content */}
      <div className="mobile-content">
        {/* Game logo and header */}
        <div className="mobile-header">
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
        
        {/* Stats only shown when connected and has username */}
        {isConnected && username && (
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
        
        {/* Main action area */}
        <div className="mobile-welcome-message">
          {!isConnected ? (
            <>
              <p>Connect your wallet to start your jumping adventure</p>
              <div className="mobile-wallet-connect">
                <ConnectButton 
                  showBalance={false}
                  chainStatus="none"
                  accountStatus="address"
                  label="Connect Wallet"
                />
              </div>
            </>
          ) : isNftLoading ? (
            <>
              <p>Checking NFT ownership...</p>
              <div className="mobile-loading-indicator"></div>
            </>
          ) : hasMintedNft ? (
            <>
              <p>You're ready to jump!</p>
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
    </div>
  );
};

export default MobileHomePage; 