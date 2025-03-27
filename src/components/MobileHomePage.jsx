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

  // Consolidated event handler for both buttons
  const handleAction = (action, e) => {
    e.preventDefault();
    e.stopPropagation();
    setTimeout(() => action === 'play' ? onPlay?.() : onMint?.(), 100);
  };

  // Mobile optimization - cleaned up
  useEffect(() => {
    document.documentElement.classList.add('mobile-wallet-view');
    const metaViewport = document.querySelector('meta[name=viewport]');
    if (metaViewport) metaViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    
    // Force mobile wallet detection
    const forceMobileWalletDetection = () => {
      // Add a tag to help RainbowKit detect mobile properly
      const mobileTag = document.createElement('meta');
      mobileTag.name = 'rainbow-kit-ui-mode';
      mobileTag.content = 'mobile';
      document.head.appendChild(mobileTag);
      
      // Add a data attribute to force mobile detection
      document.documentElement.setAttribute('data-rk-platform', 'mobile');
    };
    
    forceMobileWalletDetection();
    
    return () => {
      document.documentElement.classList.remove('mobile-wallet-view');
      const mobileTag = document.querySelector('meta[name="rainbow-kit-ui-mode"]');
      if (mobileTag) mobileTag.remove();
      document.documentElement.removeAttribute('data-rk-platform');
    };
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
              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  openAccountModal,
                  openChainModal,
                  openConnectModal,
                  authenticationStatus,
                  mounted,
                }) => {
                  const ready = mounted && authenticationStatus !== 'loading';
                  const connected =
                    ready &&
                    account &&
                    chain &&
                    (!authenticationStatus ||
                      authenticationStatus === 'authenticated');

                  if (!connected) {
                    return (
                      <button 
                        className="mobile-connect-wallet-button"
                        type="button"
                        onClick={openConnectModal}
                        data-rk-is-mobile="true"
                      >
                        Connect Wallet
                      </button>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button
                        onClick={openAccountModal}
                        type="button"
                        className="mobile-account-button"
                      >
                        {account.displayName}
                      </button>
                    </div>
                  );
                }}
              </ConnectButton.Custom>
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
      
      {/* Only show debug info in development */}
      {process.env.NODE_ENV !== 'production' && address && (
        <div className="connection-status">
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