import React, { Suspense } from 'react';
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

  const handleAction = (action, e) => {
    if (!e?.preventDefault || !action) return;
    e.preventDefault();
    try {
      action === 'play' ? onPlay() : onMint();
    } catch (error) {
      console.error('Action handler error:', error);
    }
  };

  const renderContent = () => {
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

    const ButtonComponent = hasMintedNft ? (
      <button 
        onClick={(e) => handleAction('play', e)}
        className="mobile-play-button"
        type="button"
      >
        Play Now
      </button>
    ) : (
      <button 
        onClick={(e) => handleAction('mint', e)}
        className="mobile-mint-button"
        type="button"
      >
        Mint to Play
      </button>
    );

    return (
      <>
        <p>{hasMintedNft ? "You're ready to jump!" : "Mint an NFT to start playing"}</p>
        {ButtonComponent}
      </>
    );
  };

  return (
    <div className="mobile-container">
      <div className="mobile-header">
        <h1 className="mobile-game-title">MONAD JUMPER</h1>
        <p className="mobile-game-subtitle">Jump through the blockchain one block at a time!</p>
      </div>
      
      <Suspense fallback={<LoadingSpinner />}>
        <div className="mobile-character-container">
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
        </div>
      </Suspense>
      
      <div className="mobile-welcome-message">
        {renderContent()}
      </div>
      
      <div className="mobile-game-facts">
        <GameFact emoji="🚀" text="Play & Earn!" />
        <GameFact emoji="🎮" text="Fun Gameplay!" />
        <GameFact emoji="⛓️" text="Powered by Monad!" />
      </div>
    </div>
  );
};

export default MobileHomePage; 