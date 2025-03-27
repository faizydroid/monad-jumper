import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useWeb3 } from '../contexts/Web3Context';
import { createClient } from '@supabase/supabase-js';
import BackgroundElements from './BackgroundElements';
import MobileHomePage from './MobileHomePage';

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_REACT_APP_SUPABASE_URL,
  import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY
);

const NFT_CONTRACT_ADDRESS = import.meta.env.VITE_CHARACTER_CONTRACT_ADDRESS;
const GAME_CONTRACT_ADDRESS = import.meta.env.VITE_GAME_CONTRACT_ADDRESS;

// Username Modal component
function UsernameModal({ onSubmit }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    setError('');
    onSubmit(username);
  };
  
  return (
    <div className="username-modal">
      <div className="modal-content">
        <h2>Choose Your Name!</h2>
        <p>Pick a cool username for your jumping adventure</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="text" value={username} onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter awesome username (min 3 chars)" required autoFocus
          />
          <button type="submit">Let's Jump!</button>
        </form>
      </div>
    </div>
  );
}

const GameComponent = ({ hasMintedNft, isNftLoading, onOpenMintModal }) => {
  const web3Context = useWeb3();
  const { username: webUsername, setUserUsername, gameScore, setGameScore, updateScore } = web3Context || {};
  const [username, setUsername] = useState(webUsername || null);
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [showGame, setShowGame] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [currentJumps, setCurrentJumps] = useState(0);
  const [gameId, setGameId] = useState(Date.now());
  const [transactionPending, setTransactionPending] = useState(false);
  const [showPlayAgain, setShowPlayAgain] = useState(false);
  const iframeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth <= 768 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Username check
  useEffect(() => {
    const checkUsername = async () => {
      if (!isConnected || !address) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('username')
          .eq('wallet_address', address.toLowerCase())
          .maybeSingle();
        
        if (data?.username) {
          setUsername(data.username);
          setUserUsername?.(data.username);
          setShowModal(false);
          setShowUsernameModal(false);
        } else {
          setUsername(null);
          setShowModal(true);
          setShowUsernameModal(true);
        }
      } catch (error) {
        console.error("Error checking username:", error);
      }
    };

    if (isConnected && address) checkUsername();
  }, [isConnected, address, setUserUsername]);

  // Username submit handler
  const handleUsernameSubmit = async (newUsername) => {
    if (!address) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .upsert({ 
          wallet_address: address.toLowerCase(),
          username: newUsername,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      setUsername(newUsername);
      setUserUsername?.(newUsername);
      setShowModal(false);
      setShowUsernameModal(false);
    } catch (error) {
      console.error("Error saving username:", error);
      alert("Error saving username. Please try again.");
    }
  };

  // Play button handler
  const handlePlayClick = useCallback(() => {
    window.location.hash = 'game';
    console.log('Setting showGame to true while preserving wallet connection');
    setShowGame(true);
  }, []);

  // Play again handler
  const handlePlayAgain = useCallback(() => {
    setCurrentJumps(0);
    setGameScore(0);
    setShowPlayAgain(false);
    setTransactionPending(false);
    
    const newGameId = Date.now();
    setGameId(newGameId);
    
    if (iframeRef.current) {
      const parent = iframeRef.current.parentNode;
      parent.removeChild(iframeRef.current);
      
      const newIframe = document.createElement('iframe');
      newIframe.className = 'game-frame';
      newIframe.allow = 'autoplay';
      newIframe.frameBorder = '0';
      newIframe.tabIndex = '0';
      newIframe.title = 'Monad Jumper Game';
      
      const url = new URL('/original.html', window.location.origin);
      url.searchParams.set('session', newGameId);
      url.searchParams.set('nocache', Math.random().toString(36).substring(2));
      newIframe.src = url.toString();
      
      parent.appendChild(newIframe);
      iframeRef.current = newIframe;
    }
  }, [setGameScore]);

  // Game message handler - consolidated
  useEffect(() => {
    const handleMessages = (event) => {
      const { data } = event;
      
      if (!data || typeof data !== 'object') return;
      
      if (data.type === 'gameLoaded') {
        console.log('Game loaded');
        setIsLoading(false);
      } else if (data.type === 'gameOver') {
        console.log('Game over', data);
        setShowPlayAgain(true);
        setGameScore(data.score || 0);
        updateScore?.(data.score || 0);
      } else if (data.type === 'jump') {
        setCurrentJumps(prev => prev + 1);
      }
    };
    
    window.addEventListener('message', handleMessages);
    return () => window.removeEventListener('message', handleMessages);
  }, [setGameScore, updateScore]);
  
  // Not connected view
  if (!isConnected) {
    return (
      <>
        {isMobileView ? (
          <MobileHomePage 
            characterImg="/images/monad0.png" 
            onPlay={() => {
              console.log("Play clicked from mobile");
              window.location.hash = 'game';
              setShowGame(true);
            }}
            onMint={() => {
              console.log("Mint clicked from mobile");
              onOpenMintModal();
            }}
            hasMintedNft={hasMintedNft}
            isNftLoading={isNftLoading}
          />
        ) : (
          <>
            <BackgroundElements />
            <div className="container">
              <h1 className="game-title">MONAD JUMPER</h1>
              <p className="game-subtitle">Jump through the blockchain one block at a time!</p>
              
              <div className="character-container">
                <img src="/images/monad0.png" alt="Game Character" className="character" />
              </div>
              
              <div className="welcome-message">
                <p>Connect your wallet to start your jumping adventure</p>
                <button onClick={openConnectModal} className="connect-button">
                  Connect Wallet
                </button>
              </div>
              
              <div className="game-facts">
                <div className="fact-bubble fact-bubble-1">
                  <span>🚀</span>
                  <p>Play & Earn!</p>
                </div>
                <div className="fact-bubble fact-bubble-2">
                  <span>🎮</span>
                  <p>Fun Gameplay!</p>
                </div>
                <div className="fact-bubble fact-bubble-3">
                  <span>⛓️</span>
                  <p>Powered by Monad!</p>
                </div>
              </div>
            </div>
          </>
        )}
      </>
    );
  }
  
  // Username modal
  if (showUsernameModal) {
    return (
      <>
        <BackgroundElements />
        <div className="container">
          <h1 className="game-title">MONAD JUMPER</h1>
          <UsernameModal onSubmit={handleUsernameSubmit} />
        </div>
      </>
    );
  }
  
  // Game screen
  if (showGame) {
    return (
      <div className="game-container">
        {isLoading && (
          <div className="game-loading">
            <div className="spinner"></div>
            <p>Loading game...</p>
          </div>
        )}
        
        <iframe
          ref={iframeRef}
          className="game-frame"
          src={`/original.html?session=${gameId}`}
          allow="autoplay"
          frameBorder="0"
          tabIndex="0"
          title="Monad Jumper Game"
        />
        
        {showPlayAgain && (
          <div className="game-over-popup">
            <h2>GAME OVER</h2>
            <p className="final-score">Score: {gameScore}</p>
            <button onClick={handlePlayAgain} className="play-again-button">
              Play Again
            </button>
          </div>
        )}
      </div>
    );
  }
  
  // Game start screen
  return (
    <>
      <BackgroundElements />
      <div className="container">
        <h1 className="game-title">MONAD JUMPER</h1>
        <p className="game-subtitle">Jump through the blockchain one block at a time!</p>
        
        <div className="character-container">
          <img src="/images/monad0.png" alt="Game Character" className="character" />
        </div>
        
        {isNftLoading ? (
          <div className="loading-nft-check">
            <p>Checking NFT ownership...</p>
            <div className="loading-spinner"></div>
          </div>
        ) : hasMintedNft ? (
          <button 
            className="play-button"
            onClick={handlePlayClick}
          >
            PLAY
          </button>
        ) : (
          <button 
            className="mint-to-play-button"
            onClick={onOpenMintModal}
          >
            MINT TO PLAY
          </button>
        )}
        
        <div className="game-facts">
          <div className="fact-bubble fact-bubble-1">
            <span>🚀</span>
            <p>Play & Earn!</p>
          </div>
          <div className="fact-bubble fact-bubble-2">
            <span>🎮</span>
            <p>Fun Gameplay!</p>
          </div>
          <div className="fact-bubble fact-bubble-3">
            <span>⛓️</span>
            <p>Powered by Monad!</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default GameComponent; 