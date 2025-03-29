import React, { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import './MobileHomePage.css';

const MobileHomePage = ({ 
  characterImg, 
  onPlay, 
  onMint,
  hasMintedNft,
  isNftLoading 
}) => {
  const { address, isConnected } = useAccount();
  const [isMobile] = useState(window.innerWidth <= 768);

  // Prevent double-tap zoom on mobile
  useEffect(() => {
    if (isMobile) {
      document.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) {
          e.preventDefault();
        }
      }, { passive: false });
    }
  }, [isMobile]);

  // Mobile viewport optimization
  useEffect(() => {
    const meta = document.querySelector('meta[name=viewport]');
    if (meta) {
      meta.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overscrollBehavior = 'auto';
    };
  }, []);

  // Optimized action handler with debounce for mobile
  const handleAction = (action) => (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    // Prevent double-tap
    const button = e?.target;
    if (button) {
      button.disabled = true;
      setTimeout(() => {
        button.disabled = false;
      }, 1000);
    }

    action === 'play' ? onPlay?.() : onMint?.();
  };

  return (
    <div className="mobile-container safe-area-inset">
      <div className="mobile-header">
        <h1 className="mobile-game-title">MONAD JUMPER</h1>
        <p className="mobile-game-subtitle">Jump through the blockchain one block at a time!</p>
      </div>
      
      <div className="mobile-character-wrapper">
        <img 
          src={characterImg} 
          alt="Game Character" 
          className="mobile-character"
          loading="eager"
        />
      </div>
      
      <div className="mobile-welcome-message">
        {!isConnected ? (
          <div className="mobile-connect-section">
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
        ) : isNftLoading ? (
          <div className="mobile-loading-section">
            <div className="mobile-loading-indicator" />
            <p>Checking NFT ownership...</p>
          </div>
        ) : (
          <div className="mobile-action-section">
            <p>{hasMintedNft ? "You're ready to jump!" : "Mint an NFT to start playing"}</p>
            <button 
              onClick={handleAction(hasMintedNft ? 'play' : 'mint')}
              className={`mobile-${hasMintedNft ? 'play' : 'mint'}-button`}
            >
              {hasMintedNft ? 'Play Now' : 'Mint to Play'}
            </button>
          </div>
        )}
      </div>
      
      <div className="mobile-game-facts">
        {[
          ['🚀', 'Play & Earn!'],
          ['🎮', 'Fun Gameplay!'],
          ['⛓️', 'Powered by Monad!']
        ].map(([icon, text], i) => (
          <div key={text} className={`mobile-fact-bubble mobile-fact-bubble-${i + 1}`}>
            <span>{icon}</span>
            <p>{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileHomePage; 