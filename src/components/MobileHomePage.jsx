import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useWeb3 } from '../contexts/Web3Context';
import './MobileHomePage.css';
import MusicPlayer from './MusicPlayer';

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
  
  // Simple animation for character
  const [characterPosition, setCharacterPosition] = useState(0);
  
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