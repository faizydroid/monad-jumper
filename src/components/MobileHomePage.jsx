import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import './MobileHomePage.css';
import { getDefaultWallets } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { mainnet, polygon } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';

const MobileHomePage = ({ characterImg }) => {
  const mobileWalletSetup = () => {
    const projectId = window.walletConnectProjectId || "YOUR_PROJECT_ID_SHOULD_BE_SET_IN_ENV";
    
    const { chains, publicClient } = configureChains(
      [mainnet, polygon],
      [publicProvider()]
    );
    
    const { connectors } = getDefaultWallets({
      appName: 'Monad Jumper',
      projectId,
      chains
    });
    
    return {
      chains,
      walletConnectProjectId: projectId,
      connectors
    };
  };

  const mobileWalletConfig = mobileWalletSetup();

  return (
    <div className="mobile-container">
      <h1 className="mobile-game-title">MONAD JUMPER</h1>
      <p className="mobile-game-subtitle">Jump through the blockchain one block at a time!</p>
      
      <div className="mobile-character-container">
        <img src={characterImg} alt="Game Character" className="mobile-character" />
      </div>
      
      <div className="mobile-welcome-message">
        <p>Connect your wallet to start your jumping adventure</p>
        <div className="mobile-wallet-connect">
          <ConnectButton 
            showBalance={false}
            chainStatus="none"
            accountStatus="address"
            label="Connect Wallet"
            modalSize="compact"
            walletConnectProjectId={mobileWalletConfig.walletConnectProjectId}
          />
        </div>
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