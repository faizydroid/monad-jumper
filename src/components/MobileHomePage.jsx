import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import './MobileHomePage.css';
import character from '../assets/character.png'; // Adjust path as needed

const MobileHomePage = () => {
  return (
    <div className="mobile-container">
      <div className="mobile-header">
        <h1 className="mobile-game-title">MONAD JUMPER</h1>
        <p className="mobile-game-subtitle">Jump through the blockchain one block at a time!</p>
      </div>
      
      <div className="mobile-character-container">
        <img src={character} alt="Game Character" className="mobile-character" />
      </div>
      
      <div className="mobile-welcome-message">
        <p>Connect your wallet to start your jumping adventure</p>
        <div className="mobile-wallet-connect">
          <ConnectButton />
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
};

export default MobileHomePage; 