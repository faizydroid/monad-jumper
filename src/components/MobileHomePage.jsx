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

  // Mobile optimization on component mount
  useEffect(() => {
    document.documentElement.classList.add('mobile-wallet-view');
    const metaViewport = document.querySelector('meta[name=viewport]');
    if (metaViewport) {
      metaViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    }
    
    return () => {
      document.documentElement.classList.remove('mobile-wallet-view');
    };
  }, []);

  // Important: Log connection status for debugging
  useEffect(() => {
    console.log('Mobile wallet connection status:', { isConnected, address });
  }, [isConnected, address]);

  // Log available connectors to debug
  useEffect(() => {
    console.log("Available wallet connectors:", 
      connectors.map(c => c.name || c.id));
  }, [connectors]);

  // Update the button click handlers
  const handlePlayClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Delay the action slightly to prevent issues with state updates
    setTimeout(() => {
      console.log('Play button clicked');
      onPlay && onPlay();
    }, 100);
  };
  
  const handleMintClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Delay the action slightly to prevent issues with state updates
    setTimeout(() => {
      console.log('Mint button clicked');
      onMint && onMint();
    }, 100);
  };

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
                  return (
                    <div
                      {...(!mounted && {
                        'aria-hidden': true,
                      })}
                    >
                      {(() => {
                        if (!mounted || !account || !chain) {
                          return (
                            <button onClick={openConnectModal} type="button" className="mobile-connect-button">
                              Connect Wallet
                            </button>
                          );
                        }
                        return (
                          <div style={{ display: 'flex', gap: 12 }}>
                            <button
                              onClick={openAccountModal}
                              type="button"
                              className="mobile-connected-button"
                            >
                              {account.displayName}
                              {account.displayBalance ? ` (${account.displayBalance})` : ''}
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
              onClick={handlePlayClick}
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
              onClick={handleMintClick}
              className="mobile-mint-button"
              type="button"
            >
              Mint to Play
            </button>
          </>
        )}
      </div>
      
      {/* Add a persistent connection status display for debugging */}
      <div className="connection-status" style={{position: 'fixed', bottom: 5, left: 5, fontSize: '10px', opacity: 0.7}}>
        {isConnected ? `Connected: ${address?.slice(0,6)}...${address?.slice(-4)}` : 'Not connected'}
      </div>
      
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