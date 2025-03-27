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
  const { connectAsync, connectors } = useConnect();

  // Handle button clicks with connection persistence
  const handlePlayClick = async (e) => {
    e.preventDefault();
    
    // Make sure connection is maintained
    if (isConnected && address) {
      // Call the play handler
      onPlay && onPlay();
    } else {
      console.error("Wallet disconnected before play action");
      
      // Try to reconnect if possible
      try {
        const activeConnector = connectors.find(c => c.ready);
        if (activeConnector) {
          await connectAsync({ connector: activeConnector });
        }
      } catch (err) {
        console.error("Failed to reconnect wallet:", err);
      }
    }
  };
  
  // Similar pattern for mint
  const handleMintClick = async (e) => {
    e.preventDefault();
    
    // Make sure connection is maintained
    if (isConnected && address) {
      // Call the mint handler
      onMint && onMint();
    } else {
      console.error("Wallet disconnected before mint action");
      
      // Try to reconnect if possible
      try {
        const activeConnector = connectors.find(c => c.ready);
        if (activeConnector) {
          await connectAsync({ connector: activeConnector });
        }
      } catch (err) {
        console.error("Failed to reconnect wallet:", err);
      }
    }
  };

  // Mobile optimization on component mount
  useEffect(() => {
    document.documentElement.classList.add('mobile-wallet-view');
    const metaViewport = document.querySelector('meta[name=viewport]');
    if (metaViewport) {
      metaViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    }
    
    // Ensure wallet detection is properly initialized
    document.documentElement.dataset.rainbowkitIsMobile = 'true';
    
    // Reconnect wallet if we have a previously connected wallet
    const reconnectWallet = async () => {
      if (!isConnected && localStorage.getItem('previouslyConnected') === 'true') {
        try {
          const activeConnector = connectors.find(c => c.ready);
          if (activeConnector) {
            await connectAsync({ connector: activeConnector });
          }
        } catch (err) {
          console.log("Auto reconnect failed:", err);
        }
      }
    };
    
    reconnectWallet();
    
    return () => {
      document.documentElement.classList.remove('mobile-wallet-view');
      delete document.documentElement.dataset.rainbowkitIsMobile;
      
      // Store connection state when component unmounts
      if (isConnected) {
        localStorage.setItem('previouslyConnected', 'true');
      }
    };
  }, [isConnected, connectAsync, connectors]);

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
                accountStatus="address"
                chainStatus="none"
                showBalance={false}
                label="Connect Wallet"
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