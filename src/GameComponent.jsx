import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useAccount, useConnectModal } from 'wagmi';
import { createClient } from '@supabase/supabase-js';
import MobileHomePage from './MobileHomePage';

const supabase = createClient(
  import.meta.env.VITE_REACT_APP_SUPABASE_URL,
  import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY
);

function GameComponent({ hasMintedNft, isNftLoading, onOpenMintModal }) {
  const web3Context = useWeb3();
  const { username: webUsername, setUserUsername, isLoading: walletLoading, gameScore, setGameScore, updateScore } = web3Context || {};
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
  }, [isConnected, address]);

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

  // Render functions
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
              {/* Desktop homepage content */}
            </div>
          </>
        )}
      </>
    );
  }

  // Rest of rendering logic...
}

export default GameComponent; 