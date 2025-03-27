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

  // Consolidated event handler for both buttons
  const handleAction = (action, e) => {
    e.preventDefault();
    e.stopPropagation();
    setTimeout(() => action === 'play' ? onPlay?.() : onMint?.(), 100);
  };

  // Mobile optimization and wallet detection fixes
  useEffect(() => {
    // Basic mobile optimizations
    document.documentElement.classList.add('mobile-wallet-view');
    const metaViewport = document.querySelector('meta[name=viewport]');
    if (metaViewport) metaViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    
    // Force RainbowKit to detect we're on mobile and show wallet options
    const forceMobileWalletDetection = () => {
      // Check if running in a mobile browser
      const isMobileBrowser = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobileBrowser) {
        // Set data attributes RainbowKit checks for mobile detection
        document.documentElement.setAttribute('data-rk-platform', 'mobile');
        
        // Add mobile class that RainbowKit's CSS looks for
        document.body.classList.add('rk-mobile');
        
        // Check if WalletConnect is available
        const hasWalletConnect = connectors.some(c => c.id === 'walletConnect');
        console.log("WalletConnect available:", hasWalletConnect);
        
        // Log available connectors for debugging
        console.log("Available connectors:", connectors.map(c => c.id));
      }
    };
    
    // Run detection immediately
    forceMobileWalletDetection();
    
    return () => {
      document.documentElement.classList.remove('mobile-wallet-view');
      document.documentElement.removeAttribute('data-rk-platform');
      document.body.classList.remove('rk-mobile');
    };
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
              {/* Improved mobile wallet connection */}
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

                  return (
                    <div 
                      {...(!ready && {
                        'aria-hidden': true,
                        style: {
                          opacity: 0,
                          pointerEvents: 'none',
                        },
                      })}
                      className="rk-wallet-connection-container"
                    >
                      {(() => {
                        if (!connected) {
                          return (
                            <button
                              onClick={openConnectModal}
                              type="button"
                              className="mobile-connect-wallet-button"
                              // These special attributes help RainbowKit know this is a mobile button
                              data-rk-mobile-init="true"
                              data-rk-connect-button="true"
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
                      })()}
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
      
      {/* Debug info - shows in development mode */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="connection-status">
          {isConnected ? 
            `Connected: ${address?.slice(0,6)}...${address?.slice(-4)}` : 
            'Not connected'
          }
          <div className="debug-connectors">
            Available: {connectors.map(c => c.id).join(', ')}
          </div>
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