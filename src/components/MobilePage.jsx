import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useWeb3 } from '../contexts/Web3Context';
import { FaHamburger, FaTrophy, FaPlay, FaTimes } from 'react-icons/fa';
import MobileGameNavbar from './MobileGameNavbar';
import Leaderboard from './Leaderboard';
import './MobilePage.css';

const MobilePage = ({ 
  characterImg, 
  onPlay, 
  onMint,
  hasMintedNft,
  isNftLoading 
}) => {
  const { isConnected, address } = useAccount();
  const { username, playerHighScore, totalJumps } = useWeb3();
  const [menuOpen, setMenuOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const menu = document.querySelector('.mobile-game-navbar');
      const hamburgerBtn = document.querySelector('.hamburger-btn');
      
      if (menu && !menu.contains(event.target) && !hamburgerBtn.contains(event.target)) {
        setMenuOpen(false);
      }
      
      const leaderboard = document.querySelector('.mobile-leaderboard-panel');
      const leaderboardBtn = document.querySelector('.leaderboard-btn');
      
      if (leaderboard && !leaderboard.contains(event.target) && !leaderboardBtn.contains(event.target)) {
        setLeaderboardOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Lock body scroll when menu is open
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
  
  // If not connected, show the wallet connect screen
  if (!isConnected) {
    return (
      <div className="mobile-container">
        <div className="mobile-header">
          <div className="title-container">
            <h1 className="mobile-game-title">JumpNads</h1>
          </div>
        </div>
        
        <div className="mobile-character-container">
          <img src={characterImg} alt="Game Character" className="mobile-character" />
        </div>
        
        <div className="mobile-welcome-message">
          <p>Connect your wallet to start jumping!</p>
          <div className="mobile-wallet-connect">
            <ConnectButton 
              showBalance={false}
              chainStatus="none"
              accountStatus="address"
              label="Connect Wallet"
            />
          </div>
        </div>
        
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
  
  // If connected but no username is set
  if (isConnected && !username) {
    return (
      <div className="mobile-container">
        <div className="mobile-header">
          <button className="hamburger-btn">
            <FaHamburger />
          </button>
          <div className="title-container">
            <h1 className="mobile-game-title">JumpNads</h1>
          </div>
          <button className="leaderboard-btn">
            <FaTrophy />
          </button>
        </div>
        
        <div className="mobile-welcome-message">
          <p>Please set your username in the desktop version to continue.</p>
          <div className="mobile-wallet-connect">
            <ConnectButton 
              showBalance={false}
              chainStatus="icon"
              accountStatus="address"
            />
          </div>
        </div>
      </div>
    );
  }
  
  // Connected user with username
  return (
    <div className="mobile-container">
      {/* Header with hamburger menu, title, and leaderboard button */}
      <div className="mobile-header">
        <button className="hamburger-btn" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <FaTimes /> : <FaHamburger />}
        </button>
        <div className="title-container">
          <h1 className="mobile-game-title">JumpNads</h1>
        </div>
        <button className="leaderboard-btn" onClick={() => setLeaderboardOpen(!leaderboardOpen)}>
          {leaderboardOpen ? <FaTimes /> : <FaTrophy />}
        </button>
      </div>
      
      {/* Use the MobileGameNavbar component for the sliding menu */}
      <MobileGameNavbar 
        isOpen={menuOpen} 
        onClose={() => setMenuOpen(false)} 
      />
      
      {/* Sliding leaderboard panel */}
      <div className={`mobile-leaderboard-panel ${leaderboardOpen ? 'open' : ''}`}>
        <Leaderboard />
      </div>
      
      {/* Main content */}
      <div className="mobile-content">
        <div className="mobile-character-container">
          <img src={characterImg} alt="Game Character" className="mobile-character" />
        </div>
        
        <div className="mobile-player-stats">
          <div className="stat-item">
            <div className="stat-icon">🏆</div>
            <div className="stat-value">{playerHighScore || 0}</div>
            <div className="stat-label">Hi-Score</div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">🦘</div>
            <div className="stat-value">{totalJumps || 0}</div>
            <div className="stat-label">Jumps</div>
          </div>
        </div>
        
        <div className="mobile-action-area">
          {isNftLoading ? (
            <div className="loading-spinner">Checking NFT...</div>
          ) : hasMintedNft ? (
            <button onClick={onPlay} className="mobile-play-button">
              PLAY NOW
            </button>
          ) : (
            <button onClick={onMint} className="mobile-mint-button">
              MINT TO PLAY
            </button>
          )}
        </div>
      </div>
      
      {/* Overlay that darkens the background when menu is open */}
      <div 
        className={`mobile-overlay ${menuOpen || leaderboardOpen ? 'active' : ''}`}
        onClick={() => {
          setMenuOpen(false);
          setLeaderboardOpen(false);
        }}
      />
    </div>
  );
};

export default MobilePage; 