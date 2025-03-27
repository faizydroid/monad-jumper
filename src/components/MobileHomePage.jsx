import React, { useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useConnect } from 'wagmi';
import './MobileHomePage.css';

const MobileHomePage = ({ 
  characterImg, 
  onPlay, 
  onMint,
  hasMintedNft,
  isNftLoading 
}) => {
  const { address, isConnected } = useAccount();
  const { connectors } = useConnect();

  // Action handler for buttons
  const handleAction = (action, e) => {
    e.preventDefault();
    e.stopPropagation();
    setTimeout(() => action === 'play' ? onPlay?.() : onMint?.(), 100);
  };

  // Mobile optimization and wallet detection fix
  useEffect(() => {
    // Basic mobile optimization
    document.documentElement.classList.add('mobile-wallet-view');
    const metaViewport = document.querySelector('meta[name=viewport]');
    if (metaViewport) metaViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    
    // Fix for wallet detection on mobile
    const fixWalletDetection = () => {
      // Ensure walletconnect storage is properly initialized
      if (localStorage.getItem('WALLETCONNECT_DEEPLINK_CHOICE') === null) {
        localStorage.setItem('WALLETCONNECT_DEEPLINK_CHOICE', JSON.stringify(true));
      }

      if (document.documentElement.getAttribute('data-rk-platform') !== 'mobile') {
        document.documentElement.setAttribute('data-rk-platform', 'mobile');
      }
      
      // Force RainbowKit to recognize device as mobile
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      if (/android|iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        const mobileMetaTag = document.createElement('meta');
        mobileMetaTag.setAttribute('name', 'rk-mobile');
        mobileMetaTag.setAttribute('content', 'true');
        document.head.appendChild(mobileMetaTag);
      }

      // Add metadata for better wallet detection
      document.documentElement.setAttribute('data-rk-wallets-available', 'true');
    };
    
    fixWalletDetection();
    
    // Clean up function
    return () => {
      document.documentElement.classList.remove('mobile-wallet-view');
      document.documentElement.removeAttribute('data-rk-platform');
      document.documentElement.removeAttribute('data-rk-wallets-available');
      const mobileMetaTag = document.querySelector('meta[name="rk-mobile"]');
      if (mobileMetaTag) mobileMetaTag.remove();
    };
  }, []);

  // Log available connectors for debugging
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Available connectors:', connectors.map(c => c.name));
    }
  }, [connectors]);

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
                  mounted,
                }) => {
                  const ready = mounted;
                  const connected = ready && account && chain;

                  if (!connected) {
                    return (
                      <button 
                        className="mobile-connect-wallet-button"
                        type="button"
                        onClick={openConnectModal}
                        data-rk-connection-status="disconnected"
                      >
                        Connect Wallet
                      </button>
                    );
                  }

                  return (
                    <div className="connected-account">
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
      
      {/* Debug info - only in development */}
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