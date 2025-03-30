import React, { Suspense, useCallback } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import './MobileHomePage.css';

const LoadingSpinner = () => (
  <div className="loading-spinner">
    Loading...
  </div>
);

const GameFact = ({ emoji, text }) => (
  <div className="mobile-fact-bubble">
    <span>{emoji}</span>
    <p>{text}</p>
  </div>
);

const MobileHomePage = ({ 
  characterImg = '',
  onPlay = () => {},
  onMint = () => {},
  hasMintedNft = false,
  isNftLoading = false 
}) => {
  const { address, isConnected } = useAccount() || {};

  const handleAction = useCallback((action, e) => {
    if (!e || !action) return;
    e.preventDefault();
    e.stopPropagation();
    
    try {
      if (action === 'play' && typeof onPlay === 'function') {
        onPlay();
      } else if (action === 'mint' && typeof onMint === 'function') {
        onMint();
      }
    } catch (error) {
      console.error('Action handler error:', error);
    }
  }, [onPlay, onMint]);

  const renderButton = useCallback(({ type, text }) => (
    <button 
      onClick={(e) => handleAction(type, e)}
      className={`mobile-${type}-button`}
      type="button"
      disabled={isNftLoading}
    >
      {text}
    </button>
  ), [handleAction, isNftLoading]);

  const renderContent = useCallback(() => {
    if (!isConnected) {
      return (
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
      );
    }

    if (isNftLoading) {
      return <LoadingSpinner />;
    }

    return (
      <>
        <p>{hasMintedNft ? "You're ready to jump!" : "Mint an NFT to start playing"}</p>
        {renderButton({
          type: hasMintedNft ? 'play' : 'mint',
          text: hasMintedNft ? 'Play Now' : 'Mint to Play'
        })}
      </>
    );
  }, [isConnected, isNftLoading, hasMintedNft, renderButton]);

  if (typeof window === 'undefined') {
    return null; // SSR safety
  }

  return (
    <div className="mobile-container">
      <div className="mobile-header">
        <h1 className="mobile-game-title">MONAD JUMPER</h1>
        <p className="mobile-game-subtitle">Jump through the blockchain one block at a time!</p>
      </div>
      
      <Suspense fallback={<LoadingSpinner />}>
        <div className="mobile-character-container">
          {characterImg && (
            <img 
              src={characterImg} 
              alt="Game Character" 
              className="mobile-character"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/fallback-character.png';
              }}
              loading="lazy"
            />
          )}
        </div>
      </Suspense>
      
      <div className="mobile-welcome-message">
        {renderContent()}
      </div>
      
      <div className="mobile-game-facts">
        {[
          { emoji: '🚀', text: 'Play & Earn!' },
          { emoji: '🎮', text: 'Fun Gameplay!' },
          { emoji: '⛓️', text: 'Powered by Monad!' }
        ].map((fact) => (
          <GameFact key={fact.text} {...fact} />
        ))}
      </div>
    </div>
  );
};

export default React.memo(MobileHomePage); 