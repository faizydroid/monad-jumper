import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWeb3 } from '../contexts/Web3Context';
import { Link } from 'react-router-dom';
import MusicPlayer from './MusicPlayer';
import './MobileGameNavbar.css';

export default function MobileGameNavbar({ isOpen, onClose }) {
  const { username, playerHighScore, totalJumps } = useWeb3();

  const handleHomeClick = (e) => {
    e.preventDefault();
    window.location.hash = '';
    window.location.href = '/';
    if (onClose) onClose();
  };

  return (
    <div className={`mobile-game-navbar ${isOpen ? 'open' : ''}`}>
      <div className="mobile-navbar-header">
        <div className="mobile-username">{username}</div>
        <div className="mobile-highscore">
          <span role="img" aria-label="trophy">🏆</span>
          <span className="score-value">{playerHighScore || 0}</span>
        </div>
      </div>
      
      <div className="mobile-navbar-content">
        <Link to="/" className="mobile-nav-item active" onClick={handleHomeClick}>
          <div className="mobile-nav-icon">🏠</div>
          <span>Home</span>
        </Link>
        
        <div className="mobile-nav-item">
          <div className="mobile-nav-icon">🎮</div>
          <span>Games</span>
        </div>
        
        <div className="mobile-nav-item">
          <div className="mobile-nav-icon">🎁</div>
          <span>Rewards</span>
        </div>
        
        <div className="mobile-nav-item">
          <div className="mobile-nav-icon">🛒</div>
          <span>Shop</span>
        </div>
        
        <div className="mobile-music-player">
          <MusicPlayer />
        </div>
      </div>
      
      <div className="mobile-navbar-footer">
        <ConnectButton 
          showBalance={false}
          chainStatus="icon"
          accountStatus="address"
        />
      </div>
    </div>
  );
} 