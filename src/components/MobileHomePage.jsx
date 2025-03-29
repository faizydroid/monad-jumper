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
  const { isConnected } = useAccount({
    onConnect: () => {
      // Only handle post-connection logic here
      console.log('Wallet connected via button click');
    }
  });

  // Single optimized handler
  const handleAction = (action) => (e) => {
    e?.preventDefault();
    action === 'play' ? onPlay?.() : onMint?.();
  };

  useEffect(() => {
    // Only handle viewport settings
    const metaViewport = document.querySelector('meta[name=viewport]');
    if (metaViewport) {
      metaViewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
      );
    }
  }, []);

  return (
    <div className="mobile-container">
      <div className="mobile-header">
        <h1 className="mobile-game-title">MONAD JUMPER</h1>
        <p className="mobile-game-subtitle">Jump through the blockchain one block at a time!</p>
      </div>
      
      <img src={characterImg} alt="Game Character" className="mobile-character" />
      
      <div className="mobile-welcome-message">
        {!isConnected ? (
          <>
            <p>Connect your wallet to start your jumping adventure</p>
            <ConnectButton showBalance={false} chainStatus="none" accountStatus="address" />
          </>
        ) : isNftLoading ? (
          <div className="mobile-loading-indicator" />
        ) : (
          <>
            <p>{hasMintedNft ? "You're ready to jump!" : "Mint an NFT to start playing"}</p>
            <button 
              onClick={handleAction(hasMintedNft ? 'play' : 'mint')}
              className={`mobile-${hasMintedNft ? 'play' : 'mint'}-button`}
            >
              {hasMintedNft ? 'Play Now' : 'Mint to Play'}
            </button>
          </>
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