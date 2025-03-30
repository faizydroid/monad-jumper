import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import './MobileHomePage.css';

const MobileHomePage = ({ 
  characterImg = '',
  onPlay = () => {},
  onMint = () => {},
  hasMintedNft = false,
  isNftLoading = false 
}) => {
  const { address, isConnected } = useAccount() || {};

  const handleAction = (action, e) => {
    if (!e || !action) return;
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
      return <p>Checking NFT ownership...</p>;
    }

    return hasMintedNft ? (
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
    );
  };

  if (!characterImg) {
    return <div>Loading game assets...</div>;
  }

  return (
    <div className="mobile-container">
      <div className="mobile-header">
        <h1 className="mobile-game-title">MONAD JUMPER</h1>
        <p className="mobile-game-subtitle">Jump through the blockchain one block at a time!</p>
      </div>
      
      <div className="mobile-character-container">
        <img 
          src={characterImg} 
          alt="Game Character" 
          className="mobile-character"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/fallback-character.png';
          }}
        />
      </div>
      
      <div className="mobile-welcome-message">
        {renderContent()}
      </div>
      
      <div className="mobile-game-facts">
        {['Play & Earn!', 'Fun Gameplay!', 'Powered by Monad!'].map((text, i) => (
          <div key={text} className={`mobile-fact-bubble mobile-fact-bubble-${i + 1}`}>
            <span>{['🚀', '🎮', '⛓️'][i]}</span>
            <p>{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileHomePage; 