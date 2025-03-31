import React, { useEffect } from 'react';
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

  // Single handler for both buttons
  const handleAction = (action, e) => {
    e.preventDefault();
    e.stopPropagation();
    setTimeout(() => {
      console.log(`${action} button clicked`);
      action === 'play' ? onPlay && onPlay() : onMint && onMint();
    }, 100);
  };

  // Mobile optimization
  useEffect(() => {
    document.documentElement.classList.add('mobile-wallet-view');
    const metaViewport = document.querySelector('meta[name=viewport]');
    if (metaViewport) metaViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    return () => document.documentElement.classList.remove('mobile-wallet-view');
  }, []);

  return (
    <div className="mobile-container">
      <div className="mobile-header">
        <h1 className="mobile-game-title">MONAD JUMPER</h1>
        <p className="mobile-game-subtitle">Jump through the blockchain one block at a time!</p>
      </div>
      
      <div className="mobile-character-container">
        <img src={characterImg} alt="Game Character" className="mobile-character" />
      </div>
      
      <div className="mobile-welcome-message">
        {!isConnected ? (
          <>
            <p>Connect your wallet to start your jumping adventure</p>
            <div className="mobile-wallet-connect">
              <ConnectButton 
                showBalance={false}
                chainStatus="none"
                accountStatus="address"
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
              onClick={(e) => handleAction('play', e)}
              className="mobile-play-button"
              type="button"
            >
              Play Now
            </button>
          </>
        ) : (
          <>
            <p>Mint an NFT to start playing</p>
            <button 
              onClick={(e) => handleAction('mint', e)}
              className="mobile-mint-button"
              type="button"
            >
              Mint to Play
            </button>
          </>
        )}
      </div>
      
      {process.env.NODE_ENV !== 'production' && (
        <div className="connection-status" style={{position: 'fixed', bottom: 5, left: 5, fontSize: '10px', opacity: 0.7}}>
          {isConnected ? `Connected: ${address?.slice(0,6)}...${address?.slice(-4)}` : 'Not connected'}
        </div>
      )}
      
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