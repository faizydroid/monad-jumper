import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWeb3 } from '../contexts/Web3Context';
import './Navbar.css';

export default function Navbar() {
  const { account, username } = useWeb3();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <span className="logo-text">Monad Jumper</span>
        </div>
        
        <div className="navbar-info">
          {account && username && (
            <div className="wallet-info">
              <div className="username-display">
                <span role="img" aria-label="user">👤</span> {username}
              </div>
            </div>
          )}
          
          <div className="connect-button-container">
            <ConnectButton showBalance={false} chainStatus="icon" />
          </div>
        </div>
      </div>
    </nav>
  );
} 