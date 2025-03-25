import React, { useEffect } from 'react';
import { AppKit } from '@reown/appkit';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
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
  const [appKit, setAppKit] = React.useState(null);

  useEffect(() => {
    // Initialize AppKit with WagmiAdapter
    const initAppKit = async () => {
      const appKit = new AppKit({
        projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
        adapter: new WagmiAdapter({
          chains: ['monad:231'], // Monad testnet
          defaultChain: 'monad:231',
          rpcMap: {
            'monad:231': 'https://rpc.monad.xyz/testnet'
          }
        }),
        // Mobile-specific options
        mobileOptions: {
          themeMode: 'dark',
          showQrModal: true,
          enableExplorer: true,
          explorerRecommendedWalletIds: [
            'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
            '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0'  // Trust Wallet
          ]
        }
      });

      await appKit.init();
      setAppKit(appKit);
    };

    initAppKit().catch(console.error);

    return () => {
      if (appKit) {
        appKit.destroy();
      }
    };
  }, []);

  const handleConnect = async () => {
    try {
      if (!appKit) return;
      await appKit.connect();
    } catch (error) {
      console.error('Connection error:', error);
    }
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
              <button 
                onClick={handleConnect}
                className="reown-connect-button"
                type="button"
              >
                Connect Wallet
              </button>
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
              onClick={onPlay} 
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
              onClick={onMint} 
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