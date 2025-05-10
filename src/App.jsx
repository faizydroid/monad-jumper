import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Web3Provider, useWeb3 } from './contexts/Web3Context';
import { ConnectButton, useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount, useConnect, useDisconnect, useWalletClient, usePublicClient, useReadContract, useConfig, useWriteContract } from 'wagmi';
import './App.css';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AdminDashboard from './components/AdminDashboard';
import './components/AdminDashboard.css';
import Navbar from './components/Navbar';
import PlayerStats from './components/PlayerStats';
import Leaderboard from './components/Leaderboard';
import TransactionNotifications from './components/TransactionNotifications';
import { setupGameCommands } from './utils/gameCommands';
import AdminAccess from './components/AdminAccess';
import { ethers } from 'ethers';
import AbsoluteModal from './components/AbsoluteModal';
import SimpleModal from './components/SimpleModal';
import { encodeFunctionData, parseEther } from 'viem';
import CartoonPopup from './components/CartoonPopup';
import { createClient } from '@supabase/supabase-js';
import ErrorBoundary from './components/ErrorBoundary';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { createPublicClient, http } from 'viem';
import MobileHomePage from './components/MobileHomePage';
import characterImg from '/images/monad0.png'; // correct path with leading slash for public directory
import { FaXTwitter, FaDiscord } from "react-icons/fa6";
import { monadTestnet } from './config/chains';
// Import the utility functions
import { debounce, fetchGameSessionsCount, incrementGamesCount } from './utils/fetchHelpers.utils';

// GLOBAL TRANSACTION LOCK SYSTEM
// This will prevent ANY duplicate transaction attempts
if (typeof window !== 'undefined') {
  window.__GLOBAL_TX_SYSTEM = {
    activeTransactions: new Set(),
    txHistory: new Map(),
    pendingLock: false,
    lastProcessTime: 0, // Track last processing time
    loggingEnabled: false, // Disable logging by default
    
    // Only allow ONE transaction to proceed
    canSendTransaction: function(key) {
      // Performance optimization: limit processing frequency
      const now = Date.now();
      if (now - this.lastProcessTime < 50) {
        // Don't process transactions more than once per 50ms
        return false;
      }
      this.lastProcessTime = now;
      
      // If ANY transaction is in progress, block all others
      // Commented out global pending lock check
      /*
      if (this.pendingLock) {
        console.warn(`❌ GLOBAL TX BLOCKED: ${key} - Another transaction is in progress`);
        return false;
      }
      */
      
      // If this specific transaction has been sent before, block it
      // Commented out duplicate check - allowing all transactions through
      /*
      if (this.txHistory.has(key) || this.activeTransactions.has(key)) {
        console.warn(`❌ DUPLICATE TX BLOCKED: ${key} - Already sent`);
        return false;
      }
      */
      
      // Allow this transaction to proceed
      if (this.loggingEnabled) {
        console.log(`✅ ALLOWING ALL TX: ${key}`);
      }
      this.pendingLock = true;
      this.activeTransactions.add(key);
      return true;
    },
    
    // Mark a transaction as completed
    finishTransaction: function(key) {
      this.txHistory.set(key, { status: 'completed', time: Date.now() });
      this.activeTransactions.delete(key);
      this.pendingLock = false;
      if (this.loggingEnabled) {
        console.log(`✅ TX COMPLETED: ${key}`);
      }
    },
    
    // Mark a transaction as failed
    failTransaction: function(key, error) {
      this.txHistory.set(key, { status: 'failed', time: Date.now(), error });
      this.activeTransactions.delete(key);
      this.pendingLock = false;
      // Always log errors
      console.error(`❌ TX FAILED: ${key} - ${error}`);
    },
    
    // Reset the transaction system (use with caution)
    reset: function() {
      this.activeTransactions.clear();
      this.txHistory.clear();
      this.pendingLock = false;
      this.lastProcessTime = 0;
      if (this.loggingEnabled) {
        console.log(`🔄 GLOBAL TX SYSTEM RESET`);
      }
    },
    
    // Clear old transaction history to prevent memory leaks
    cleanHistory: function() {
      const now = Date.now();
      // Keep transactions for 1 hour max
      const maxAge = 60 * 60 * 1000;
      let cleanedCount = 0;
      
      this.txHistory.forEach((value, key) => {
        if (now - value.time > maxAge) {
          this.txHistory.delete(key);
          cleanedCount++;
        }
      });
      
      if (cleanedCount > 0 && this.loggingEnabled) {
        console.log(`🧹 Cleaned ${cleanedCount} old transactions from history`);
      }
    }
  };
  
  // Set up regular cleanup to prevent memory leaks
  setInterval(() => {
    if (window.__GLOBAL_TX_SYSTEM) {
      window.__GLOBAL_TX_SYSTEM.cleanHistory();
    }
  }, 15 * 60 * 1000); // Clean every 15 minutes
  
  // Limited console logging for production
  if (import.meta.env.PROD) {
    // Disable all console logging in production except errors
    const originalConsoleLog = console.log;
    console.log = function(...args) {
      // Only log errors and warnings in production
      if (args[0] && typeof args[0] === 'string' && 
          (args[0].includes('error') || 
           args[0].includes('Error') || 
           args[0].includes('failed') ||
           args[0].includes('Failed'))) {
        originalConsoleLog.apply(console, args);
      }
      // Skip all other logs
    };
  } else {
    // In development, still log but limit transaction logging
    const originalConsoleLog = console.log;
    console.log = function(...args) {
      if (args[0] && typeof args[0] === 'string' && 
          (args[0].includes('transaction') || 
           args[0].includes('jumps') || 
           args[0].includes('TX'))) {
        originalConsoleLog.apply(console, [`🔎 ${new Date().toISOString().slice(11, 19)}`, ...args]);
      } else {
        originalConsoleLog.apply(console, args);
      }
    };
  }
}

// Global error handler for unhandled Chrome extension messaging errors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    // Check if the error is related to Chrome extension messaging
    if (error && error.message && (
      error.message.includes('chrome.runtime.sendMessage()') ||
      error.message.includes('has not been authorized yet')
    )) {
      console.warn('Suppressed extension error:', error.message);
      // Prevent the error from appearing in the console
      event.preventDefault();
    }
  });
}

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_REACT_APP_SUPABASE_URL,
  import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY
);

// Global access to open the mint modal from anywhere
window.openMintModal = () => {
  console.log("Global openMintModal function called");
  document.dispatchEvent(new CustomEvent('openMintModal'));
};

// Optimize the BackgroundElements component to reduce animations during gameplay
const BackgroundElements = React.memo(function BackgroundElements({ reduceAnimations = true }) {
  const [elements, setElements] = useState([]);
  
  useEffect(() => {
    // Generate significantly fewer elements when reduceAnimations is true (now true by default)
    const platformCount = reduceAnimations ? 0 : 4; // No platforms in reduced mode
    const sparkleCount = reduceAnimations ? 0 : 5; // No sparkles in reduced mode
    
    // Only add visual elements if not in reduced animations mode
    if (reduceAnimations) {
      setElements([]); // Empty array for game mode to avoid performance impact
      return;
    }
    
    const platforms = Array.from({ length: platformCount }, (_, i) => {
      const size = Math.random() * 60 + 40;
      return {
        type: 'platform',
        id: `platform-${i}`,
        style: {
          width: `${size}px`,
          height: '10px',
          backgroundColor: i % 3 === 0 ? 'rgba(255, 209, 102, 0.5)' : 
                          i % 3 === 1 ? 'rgba(78, 205, 196, 0.5)' : 
                          'rgba(255, 107, 107, 0.5)',
          borderRadius: '5px',
          position: 'absolute',
          left: `${Math.random() * 90}%`,
          top: `${Math.random() * 90}%`,
          transform: 'rotate(-5deg)',
          boxShadow: '0 3px 5px rgba(0, 0, 0, 0.1)',
          animation: 'none', // No animations in game mode
          zIndex: '-1'
        }
      };
    });
    
    // Only include clouds if not reducing animations
    const clouds = reduceAnimations ? [] : [
      {
        type: 'cloud',
        id: 'cloud-1',
        className: 'cloud cloud-1'
      },
      {
        type: 'cloud',
        id: 'cloud-2',
        className: 'cloud cloud-2'
      }
    ];
    
    const sparkles = Array.from({ length: sparkleCount }, (_, i) => {
      const size = Math.random() * 10 + 5;
      const delay = Math.random() * 5;
      
      return {
        type: 'sparkle',
        id: `sparkle-${i}`,
        style: {
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          borderRadius: '50%',
          position: 'absolute',
          left: `${Math.random() * 90}%`,
          top: `${Math.random() * 90}%`,
          animation: 'none', // No animations in game mode
          boxShadow: 'none',
          zIndex: '-1'
        }
      };
    });
    
    setElements([...platforms, ...clouds, ...sparkles]);
  }, [reduceAnimations]);
  
  // If in reduced animations mode, render nothing
  if (reduceAnimations) {
    return null;
  }
  
  return (
    <>
      {elements.map(element => {
        if (element.type === 'platform') {
          return <div key={element.id} style={element.style} />;
        } else if (element.type === 'cloud') {
          return <div key={element.id} className={element.className} />;
        } else if (element.type === 'sparkle') {
          return <div key={element.id} style={element.style} />;
        }
        return null;
      })}
    </>
  );
}, (prevProps, nextProps) => prevProps.reduceAnimations === nextProps.reduceAnimations);

// Update the MintButton component to directly trigger minting
const MintButton = ({ onSuccess }) => {
  const handleClick = () => {
    console.log("MintButton clicked - minting directly");
    // Call the direct mint function
    mintNFTDirectly();
  };
  
  return (
    <div className="mint-button-container">
      <button 
        className={`mint-button ${isMinting ? 'loading' : ''}`}
        onClick={handleClick}
        disabled={isMinting}
      >
        {isMinting ? 'Minting...' : 'MINT TO PLAY'}
      </button>
      {mintError && (
        <div className="mint-error">
          {mintError}
        </div>
      )}
    </div>
  );
};

// Add these styles to your CSS
const styles = `
.mint-button-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.mint-button {
  background: linear-gradient(90deg, #FF6B6B 0%, #FF5252 100%);
  border: none;
  border-radius: 50px;
  height: 150px !important;
  padding: 15px 30px;
  color: white; 
  font-weight: bold;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(255, 82, 82, 0.3);
}

.mint-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 82, 82, 0.4);
}

.mint-button:active {
  transform: translateY(1px);
}

.mint-button.loading {
  background: #888;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.mint-error {
  color: #FF5252;
  font-size: 14px;
  text-align: center;
  max-width: 250px;
  background: rgba(255, 82, 82, 0.1);
  padding: 8px;
  border-radius: 8px;
}

.play-button {
  background: linear-gradient(90deg, #4CAF50 0%, #45A049 100%);
  border: none;
  border-radius: 50px;
  padding: 15px 30px;
  color: white;
  font-weight: bold;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
}

.play-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
}

.play-button:active {
  transform: translateY(1px);
}

@keyframes pulse-opacity {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.loading-rank {
  display: inline-block;
  animation: pulse-opacity 1.5s infinite ease-in-out;
  font-size: 0.9em;
  color: rgba(0, 0, 0, 0.7);
}
`;

// Update the NFTMintModal component to use the newer wagmi hooks
const NFTMintModal = ({ isOpen, onClose }) => {
  const [isMinting, setIsMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [error, setError] = useState(null);
  const { address } = useAccount();
  const config = useConfig();
  const { writeContractAsync } = useWriteContract();
  
  const handleMint = async () => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }
    
    setIsMinting(true);
    setError(null);
    
    try {
      // Use environment variable for contract address
      const nftAddress = import.meta.env.VITE_CHARACTER_CONTRACT_ADDRESS;
      
      if (!nftAddress || nftAddress === "0x0000000000000000000000000000000000000000") {
        throw new Error("Invalid NFT contract address");
      }
      
      console.log("Sending mint transaction with 1 MON to address:", nftAddress);
      
      // Use wagmi's writeContractAsync instead of walletClient
      const hash = await writeContractAsync({
        address: nftAddress,
        abi: [
          {
            name: "mint",
            type: "function",
            stateMutability: "payable",
            inputs: [],
            outputs: [],
          }
        ],
        functionName: "mint",
        value: parseEther("1.0"),
      });
      
      console.log("Mint transaction sent:", hash);
      
      // Show success state instead of closing modal immediately
      setMintSuccess(true);
    } catch (err) {
      console.error("Mint error:", err);
      
      if (err.message?.includes("insufficient funds")) {
        setError("You need 1 MON to mint this NFT");
      } else if (err.message?.includes("Already minted")) {
        setError("You've already minted an NFT with this wallet");
      } else if (err.message?.includes("rejected")) {
        setError("Transaction rejected in your wallet");
      } else {
        setError(err.message || "Failed to mint. Please try again.");
      }
    } finally {
      setIsMinting(false);
    }
  };
  
  // If mint was successful, display success screen
  if (mintSuccess) {
    return (
      <SimpleModal isOpen={isOpen} onClose={onClose} title="Mint Successful!">
        <div className="mint-success-content" style={{textAlign: 'center'}}>
          <div style={{fontSize: '64px', margin: '20px 0'}}>??</div>
          <h2 style={{color: '#4CAF50', marginBottom: '20px'}}>NFT Minted Successfully!</h2>
          <p>Your character is now ready to play!</p>
          
          <button 
            onClick={() => {
              onClose();
              window.location.reload();
            }} 
            style={{
              background: 'linear-gradient(90deg, #4CAF50 0%, #45A049 100%)',
              border: 'none',
              padding: '15px 30px',
              borderRadius: '50px',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '18px',
              margin: '30px 0 10px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
              transition: 'all 0.3s ease'
            }}
          >
            LETS F*CKING JUMP...
          </button>
        </div>
      </SimpleModal>
    );
  }
  
  return (
    <SimpleModal isOpen={isOpen} onClose={onClose} title="Mint Character NFT">
      <div className="mint-modal-content">
        <p>Mint your JumpNads character NFT to play the game!</p>
        <p>Cost: <strong>1 MON</strong></p>
        
        {error && (
          <div className="error-message" style={{color: '#FF5252', margin: '15px 0', padding: '10px', background: 'rgba(255,82,82,0.1)', borderRadius: '4px'}}>
            {error}
          </div>
        )}
        
        <div className="mint-actions" style={{marginTop: '20px', display: 'flex', gap: '10px'}}>
          <button 
            onClick={handleMint} 
            disabled={isMinting}
            className="mint-now-btn"
            style={{
              background: isMinting ? '#888' : 'linear-gradient(90deg, #FF6B6B 0%, #FF5252 100%)',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '50px',
              color: 'white',
              flex: '1',
              cursor: isMinting ? 'not-allowed' : 'pointer',
              position: 'relative'
            }}
          >
            {isMinting ? 'Minting...' : 'Mint Now (1 MON)'}
            {isMinting && (
              <span className="spinner" style={{
                width: '20px',
                height: '20px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                position: 'absolute',
                right: '15px',
                top: 'calc(50% - 10px)'
              }}></span>
            )}
          </button>
          
          <button 
            onClick={onClose}
            style={{padding: '12px', background: 'transparent', border: '1px solid #ccc', borderRadius: '50px', color: 'white'}}
            disabled={isMinting}
          >
            Cancel
          </button>
        </div>
      </div>
    </SimpleModal>
  );
};

// Add this special function at the top of the file
function forceReloadIframe(iframeRef, newGameId) {
  // Don't do anything if no iframe reference
  if (!iframeRef.current) return;
  
  // Store parent node for later
  const parent = iframeRef.current.parentNode;
  
  // Remove the old iframe completely
  parent.removeChild(iframeRef.current);
  
  // Create a brand new iframe element
  const newIframe = document.createElement('iframe');
  
  // Set critical attributes
  newIframe.className = 'game-frame';
  newIframe.allow = 'autoplay';
  newIframe.frameBorder = '0';
  newIframe.tabIndex = '0';
  newIframe.title = 'JumpNads Game';
  
  // Create a URL with a timestamp and session ID to prevent caching
  const url = new URL('/original.html', window.location.origin);
  url.searchParams.set('session', newGameId);
  url.searchParams.set('nocache', Math.random().toString(36).substring(2));
  newIframe.src = url.toString();
  
  console.log(`?? Creating BRAND NEW iframe with URL: ${url.toString()}`);
  
  // Add the new iframe to the DOM
  parent.appendChild(newIframe);
  
  // Update the ref to point to the new iframe
  iframeRef.current = newIframe;
  
  return newIframe;
}

// Add this component for mobile-friendly loading display
function LoadingSpinner({ isMobile }) {
  const spinnerStyle = isMobile ? {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    color: 'white'
  } : {
    // Desktop styles
  };
  
  return (
    <div style={spinnerStyle}>
      <div className="spinner"></div>
      <div style={{ marginTop: '10px' }}>Processing transaction...</div>
    </div>
  );
}

// Horizontal Stats Component
function HorizontalStats() {
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [sessionGamesCount, setSessionGamesCount] = useState(0);
  const { playerHighScore, totalJumps, username, setUserUsername, fetchPlayerStats, fetchJumps, leaderboard } = useWeb3();
  const { isConnected, address } = useAccount();
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [jumpRank, setJumpRank] = useState("...");
  
  // Create a ref to track if component is mounted
  const isMountedRef = useRef(true);
  
  // Track data fetch status to avoid redundant fetches
  const fetchStatusRef = useRef({
    gamesFetched: false,
    sessionsFetched: false,
    lastFetch: 0
  });
  
  // Add this effect at the top level with optimized queries
  useEffect(() => {
    async function fetchJumpRank() {
      if (!address || !supabase || !isMountedRef.current) return;
      
      // Skip frequent refetches
      const now = Date.now();
      if (now - fetchStatusRef.current.lastFetch < 60000) {
        return; // Don't fetch again if less than 60 seconds since last fetch
      }
      
      try {
        console.log("Fetching accurate jump rank from Supabase");
        
        // Get all users with their jump counts sorted by count descending
        const { data, error } = await supabase
          .from('jumps')
          .select('wallet_address, count')
          .order('count', { ascending: false })
          .limit(1100); // Get enough to determine up to 1000+ rank
          
        if (error) {
          console.error("Error fetching jump rankings:", error);
          return;
        }
        
        if (!isMountedRef.current) return; // Check if still mounted
        
        console.log(`Retrieved ${data.length} jump records from Supabase`);
        
        // Process jumps to keep only the highest count per user (deduplication)
        const userHighJumps = new Map(); // Map wallet_address -> highest jump count
        
        // First pass - determine highest jump count per wallet
        data.forEach(item => {
          const address = item.wallet_address.toLowerCase();
          const currentHighJumps = userHighJumps.get(address) || 0;
          
          if (item.count > currentHighJumps) {
            userHighJumps.set(address, item.count);
          }
        });
        
        // Second pass - create deduplicated array with highest jump counts
        const uniqueJumps = Array.from(userHighJumps.entries())
          .map(([address, count]) => ({ wallet_address: address, count }))
          .sort((a, b) => b.count - a.count); // Sort by count descending
        
        // Find the user's position in the processed data
        const userPosition = uniqueJumps.findIndex(
          entry => entry.wallet_address.toLowerCase() === address.toLowerCase()
        );
        
        // If found, display appropriate rank
        if (userPosition >= 0) {
          const rank = userPosition + 1;
          if (rank <= 1000) {
            console.log(`Jump rank determined: #${rank} out of ${uniqueJumps.length} players`);
            setJumpRank(`#${rank}`);
          } else {
            console.log(`Jump rank is beyond 1000: #${rank}`);
            setJumpRank("1000+");
          }
        } else if (totalJumps > 0) {
          // Player has jumps but not in results (should be rare)
          console.log("Player has jumps but not found in results");
          setJumpRank("1000+");
        } else {
          console.log("Player has no jumps");
          setJumpRank("Unranked");
        }
        
        // Update last fetch time
        fetchStatusRef.current.lastFetch = now;
      } catch (error) {
        console.error("Error calculating jump rank:", error);
        setJumpRank("Error");
      }
    }
    
    fetchJumpRank();
    
    // Cleanup function
    return () => {
      isMountedRef.current = false;
    };
  }, [address, totalJumps]);
  
  // Optimize the fetchGamesCount function
  const fetchGamesCount = useCallback(async () => {
    if (!address || !supabase || !isMountedRef.current) return 0;
    if (fetchStatusRef.current.gamesFetched) return; // Skip if already fetched
    
    try {
      console.log("Fetching games count (once per session)");
      const { data, error } = await supabase
        .from('games')
        .select('count')
        .eq('wallet_address', address.toLowerCase())
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching games count:", error);
        return 0;
      }
      
      if (!isMountedRef.current) return 0; // Check if still mounted
      
      const count = data?.count || 0;
      setGamesPlayed(count);
      fetchStatusRef.current.gamesFetched = true;
      return count;
    } catch (error) {
      console.error("Error in fetchGamesCount:", error);
      return 0;
    }
  }, [address, supabase]);
  
  // Optimize the fetchGameSessionsCount function
  const fetchSessionsCount = useCallback(async () => {
    return await fetchGameSessionsCount(address, supabase, setSessionGamesCount);
  }, [address, supabase, setSessionGamesCount]);
  
  // Combine fetches using a single effect
  useEffect(() => {
    if (!isConnected || !address) {
      // Reset state when disconnected
      setGamesPlayed(0);
      setSessionGamesCount(0);
      fetchStatusRef.current.gamesFetched = false;
      fetchStatusRef.current.sessionsFetched = false;
      return;
    }
    
    // Use a slight delay to avoid simultaneous DB requests
    const timer1 = setTimeout(() => fetchGamesCount(), 100);
    const timer2 = setTimeout(() => fetchSessionsCount(), 500);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [address, isConnected, fetchGamesCount, fetchSessionsCount]);
  
  // Reset mounted flag when component unmounts
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Log minimally
  useEffect(() => {
    console.log("Player data:", { 
      address: address?.substring(0, 8), 
      username, 
      score: playerHighScore, 
      jumps: totalJumps 
    });
  }, [address, username, playerHighScore, totalJumps]);
  
  // Replace the problematic effect with a better-controlled one
  useEffect(() => {
    // Skip if not connected or no address
    if (!isConnected || !address) return;
    
    // Skip if address hasn't changed
    if (fetchStatusRef.current.lastAddress === address) return;
    
    // Skip if we've fetched in the last 30 seconds for this address
    const now = Date.now();
    if (now - fetchStatusRef.current.lastFetch < 30000 && 
        fetchStatusRef.current.lastAddress === address) return;
    
    // Skip if already fetching
    if (fetchStatusRef.current.isFetching) return;
    
    // Set fetching state
    fetchStatusRef.current.isFetching = true;
    fetchStatusRef.current.lastAddress = address;
    
    // Run fetch operations
    console.log("Fetching stats once for address:", address.substring(0, 8));
    
    // Fetch data in sequence to avoid race conditions
    const fetchData = async () => {
      try {
        // Stagger the fetches to reduce database load
        await fetchPlayerStats();
        // Delay the jumps fetch slightly to reduce concurrent DB queries
        setTimeout(async () => {
        await fetchJumps(address);
          // Update last fetch time
          fetchStatusRef.current.lastFetch = Date.now();
          fetchStatusRef.current.isFetching = false;
        }, 300);
      } finally {
        // Update last fetch time
        fetchStatusRef.current.lastFetch = Date.now();
        fetchStatusRef.current.isFetching = false;
      }
    };
    
    fetchData();
    
    // Clean up function
    return () => {
      // If component unmounts during fetch, mark as not fetching
      fetchStatusRef.current.isFetching = false;
    };
  }, [isConnected, address]); // Remove fetchPlayerStats and fetchJumps from deps
  
  // State to cache score rank
  const [scoreRank, setScoreRank] = useState("...");

  // Effect to fetch accurate score rank from Supabase
  useEffect(() => {
    async function fetchScoreRank() {
      if (!address || !supabase || !playerHighScore) return;
      
      try {
        console.log("Fetching accurate score rank from Supabase");
        
        // Get all unique scores sorted by score descending
        const { data, error } = await supabase
          .from('scores')
          .select('wallet_address, score')
          .order('score', { ascending: false })
          .limit(1100); // Get enough to determine up to 1000+ rank
          
        if (error) {
          console.error("Error fetching score rankings:", error);
          return;
        }
        
        console.log(`Retrieved ${data.length} score records from Supabase`);
        
        // Process scores to keep only highest score per user (deduplication)
        const userHighScores = new Map(); // Map wallet_address -> highest score
        
        // First pass - determine highest score per wallet
        data.forEach(item => {
          const address = item.wallet_address.toLowerCase();
          const currentHighScore = userHighScores.get(address) || 0;
          
          if (item.score > currentHighScore) {
            userHighScores.set(address, item.score);
          }
        });
        
        // Second pass - create deduplicated array with highest scores
        const uniqueScores = Array.from(userHighScores.entries())
          .map(([address, score]) => ({ wallet_address: address, score }))
          .sort((a, b) => b.score - a.score); // Sort by score descending
        
        // Find the user's position in the processed data
        const userPosition = uniqueScores.findIndex(
          entry => entry.wallet_address.toLowerCase() === address.toLowerCase()
        );
        
        // If found, display appropriate rank
        if (userPosition >= 0) {
          const rank = userPosition + 1;
          if (rank <= 1000) {
            console.log(`Player rank determined: #${rank} out of ${uniqueScores.length} players`);
            setScoreRank(`#${rank}`);
          } else {
            console.log(`Player rank is beyond 1000: #${rank}`);
            setScoreRank("1000+");
          }
        } else if (playerHighScore > 0) {
          // Player has a score but not in results (should be rare)
          console.log("Player has score but not found in results");
          setScoreRank("1000+");
        } else {
          console.log("Player has no score");
          setScoreRank("Unranked");
        }
      } catch (error) {
        console.error("Error calculating score rank:", error);
        setScoreRank("Error");
      }
    }
    
    fetchScoreRank();
  }, [address, playerHighScore, supabase]);
  
  // Get player rank from leaderboard or fetch from cache
  const getPlayerRank = () => {
    // First check the cached rank
    if (scoreRank !== "...") {
      return scoreRank;
    }
    
    if (!address || !leaderboard || leaderboard.length === 0) return "N/A";
    
    // As a fallback, use the top 10 leaderboard
    const playerAddress = address.toLowerCase();
    const playerIndex = leaderboard.findIndex(entry => entry.address.toLowerCase() === playerAddress);
    
    // If player is in top 10
    if (playerIndex >= 0) {
      return `#${playerIndex + 1}`;
    }
    
    // If player is not in top 10 but has a score, use loading indicator
    if (playerHighScore > 0) {
      return "...";
    }
    
    return "N/A";
  };
  
  // Handle username submission directly with Web3Context
  const handleSubmitUsername = async (e) => {
    e.preventDefault();
    
    if (newUsername.trim().length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }
    
    try {
      // Use the setUserUsername function from Web3Context
      const success = await setUserUsername(newUsername);
      if (success) {
        setUsernameError('');
        setNewUsername('');
        // Show success message
        setShowSuccess(true);
        
        // Create confetti effect
        createConfettiEffect();
        
        // Hide success message after 4 seconds
        setTimeout(() => {
          setShowSuccess(false);
        }, 4000);
      } else {
        setUsernameError('Failed to set username. Please try again.');
      }
    } catch (error) {
      console.error("Error setting username:", error);
      setUsernameError(error.message || 'Failed to set username');
    }
  };

  // Function to create confetti effect
  const createConfettiEffect = () => {
    const container = document.querySelector('.username-form-card');
    if (!container) return;
    
    // Create 50 confetti particles
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-particle';
      
      // Random confetti properties
      const size = Math.random() * 10 + 5; // Size between 5-15px
      const colors = ['#FFD166', '#4ECDC4', '#FF6B6B', '#A5D858', '#9B5DE5'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      // Set styles
      confetti.style.width = `${size}px`;
      confetti.style.height = `${size}px`;
      confetti.style.backgroundColor = color;
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.top = '0';
      confetti.style.position = 'absolute';
      confetti.style.zIndex = '10';
      confetti.style.borderRadius = `${Math.random() > 0.5 ? '50%' : '0'}`;
      confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
      
      // Animation properties
      confetti.style.animation = `confetti-fall ${Math.random() * 3 + 2}s ease-out forwards`;
      
      // Add to container
      container.appendChild(confetti);
      
      // Remove after animation completes
      setTimeout(() => {
        if (container.contains(confetti)) {
          container.removeChild(confetti);
        }
      }, 5000);
    }
  };

  // Reset form if address changes
  useEffect(() => {
    setNewUsername('');
    setUsernameError('');
    setShowSuccess(false);
  }, [address]);
  
  // Add useEffect to fetch games count
  useEffect(() => {
    async function fetchGamesCount() {
      if (!address || !supabase) return;
      
      try {
        const { data, error } = await supabase
          .from('games')
          .select('count')
          .eq('wallet_address', address.toLowerCase())
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching games count:', error);
          return;
        }
        
        if (data) {
          setGamesPlayed(parseInt(data.count) || 0);
        }
      } catch (error) {
        console.error('Error fetching games count:', error);
      }
    }
    
    fetchGamesCount();
  }, [address, supabase]);
  
  // Add function to count games from game_sessions table
  const fetchGameSessionsCount = async () => {
    if (!address || !supabase) return;
    
    try {
      console.log("Fetching game sessions count from session history");
      
      // Count distinct session_id entries for this wallet
      const { count, error } = await supabase
        .from('game_sessions')
        .select('session_id', { count: 'exact', head: true })
        .eq('wallet_address', address.toLowerCase());
      
      if (error) {
        console.error('Error counting game sessions:', error);
        return;
      }
      
      console.log(`Found ${count} distinct game sessions`);
      setSessionGamesCount(count || 0);
    } catch (error) {
      console.error('Error counting game sessions:', error);
    }
  };
  
  // Add new useEffect to fetch game sessions count
  useEffect(() => {
    if (isConnected && address) {
      fetchGameSessionsCount();
    }
  }, [address, isConnected]);
  
  if (!isConnected || !address) {
    return (
      <div className="stats-card-horizontal">
        <div className="card-badge">STATS</div>
        <div className="stats-info">
          <h3 className="greeting-title">Ready to break the monad?</h3>
          <p className="greeting-message">Connect your wallet to start jumping! ??</p>
        </div>
        <p>Connect wallet to see your stats</p>
      </div>
    );
  }

  // If no username is set, show the username input form
  if (!username) {
    return (
      <div className="stats-card-horizontal username-form-card">
        <div className="card-badge">SET USERNAME</div>
        
        <div className="stats-info">  
          <br></br>
          
          
     
        </div>
        
        <form onSubmit={handleSubmitUsername} className="username-form">
          {usernameError && <div className="error-message">{usernameError}</div>}
          {showSuccess && <div className="success-message">Username set successfully! Let's play! ??</div>}
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Enter username (min 3 characters)"
            className="username-input"
            required
          />
          <button type="submit" className="set-username-button">
            Set Username
          </button>
        </form>
      </div>
    );
  }

  // Get username for greeting
  return (
    <div className="stats-card-horizontal">
      <div className="card-badge">STATS</div>
      
      <div className="stats-grid-horizontal">
        <div className="stat-item-horizontal">
          <div className="stat-icon">
            <img src="/icon/score_ico.png" alt="High Score" width="28" height="28" />
          </div>
          <div className="stat-label">Hi-Score</div>
          <div className="stat-value">{playerHighScore !== undefined ? Number(playerHighScore).toLocaleString() : '0'}</div>
        </div>
        
        <div className="stat-item-horizontal">
          <div className="stat-icon">
            <img src="/icon/jump_ico.png" alt="Total Jumps" width="28" height="28" />
          </div>
          <div className="stat-label">Total Jumps</div>
          <div className="stat-value">{totalJumps !== undefined ? Number(totalJumps).toLocaleString() : '0'}</div>
        </div>
        
        <div className="stat-item-horizontal">
          <div className="stat-icon">
            <img src="/icon/jump_rank_ico.png" alt="Jump Rank" width="28" height="28" />
          </div>
          <div className="stat-label">Jump Rank</div>
          <div className="stat-value">
            {jumpRank === "..." ? 
              totalJumps > 0 ? 
                <span className="loading-rank">Loading...</span> : 
                <span>Unranked</span>
              : 
              jumpRank
            }
          </div>
        </div>
        
        <div className="stat-item-horizontal">
          <div className="stat-icon">
            <img src="/icon/score_rank_ico.png" alt="Score Rank" width="28" height="28" />
          </div>
          <div className="stat-label">ScoreRank</div>
          <div className="stat-value">
            {getPlayerRank() === "..." ? 
              <span className="loading-rank">Loading...</span> : 
              getPlayerRank()
            }
          </div>
        </div>

        <div className="stat-item-horizontal">
          <div className="stat-icon">
            <img src="/icon/game_ico.png" alt="Total Games" width="28" height="28" />
          </div>
          <div className="stat-label">Total Games</div>
          <div className="stat-value">
            {sessionGamesCount > gamesPlayed ? sessionGamesCount : gamesPlayed || 0}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get random loading tips
function getRandomTip() {
  const tips = [
    "Jump on platforms to climb higher!",
    "Watch out for moving platforms!",
    "The higher you climb, the harder it gets!",
    "Timing is everything for perfect jumps!",
    "Don't look down! Keep jumping up!",
    "Break the monad, one jump at a time!",
    "Collect power-ups for special abilities!",
    "Try to beat your friends on the leaderboard!",
    "Each jump is recorded on the blockchain!",
    "Higher scores earn better ranks!",
    "Challenge yourself to reach #1 rank!"
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}

function GameComponent({ hasMintedNft, isNftLoading, onOpenMintModal, onGameOver }) {
  // REPLACE THIS ENTIRE BLOCK
  const web3Context = useWeb3(); // Simple direct access instead of the complex caching
  
  const { 
    username: webUsername,
    setUserUsername,
    isLoading: walletLoading,
    connectWallet,
    saveScore,
    saveScoreIncrement,
    purchasePowerUp,
    continueGame,
    gameScore,
    setGameScore,
    provider,
    contract,
    updateScore,
    recordJump,
    providerError,
    signer,
    leaderboard,
    playerHighScore,
    incrementGamesPlayed
  } = web3Context || {};
  
  const [username, setUsername] = useState(webUsername || null);
  
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [isMobileView, setIsMobileView] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const iframeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlayButton, setShowPlayButton] = useState(false);
  
  // Global transaction tracking to prevent duplicates
  const jumpTransactionTracker = useRef(new Map()).current;
  
  // Global transaction lock to prevent multiple transactions processing at the same time
  const [isProcessingTransaction, setIsProcessingTransaction] = useState(false);
  const transactionLockRef = useRef(false);
  
  // Create a fallback provider for offline mode
  const [fallbackProvider, setFallbackProvider] = useState(null);
  
  const [showMintModal, setShowMintModal] = useState(false);
  const [hasMintedCharacter, setHasMintedCharacter] = useState(false);
  const [isCheckingMint, setIsCheckingMint] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [mintError, setMintError] = useState(null);
  
  // Get public client and wallet client from wagmi v2
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  // Clean implementation for session tracking
  const [currentJumps, setCurrentJumps] = useState(0);
  const [gameId, setGameId] = useState(Date.now());
  const [transactionPending, setTransactionPending] = useState(false);
  
  // Add the missing showPlayAgain state
  const [showPlayAgain, setShowPlayAgain] = useState(false);
  
  // Add a state to track recent revive purchase - IMPORTANT: must be defined before callbacks use it
  const [revivePurchased, setRevivePurchased] = useState(false);
  
  // Add this hook near your other hook declarations
  const { openConnectModal } = useConnectModal();
  
  // Add this after the state declarations in the GameComponent function 
  const [mintModalRequested, setMintModalRequested] = useState(false);
  
  // Add a transaction queue system at the top of the file where the GLOBAL_TX_SYSTEM is defined
  if (typeof window !== 'undefined') {
    // Add transaction queue system
    window.__GAME_TX_QUEUE = {
      jumps: 0,
      finalScore: 0,
      gameId: null,
      transactions: [],
      isProcessing: false,
      
      // Queue a jump instead of sending immediately
      queueJumps: function(count, gameId) {
        if (!count || count <= 0) return;
        this.jumps += count;
        this.gameId = gameId || this.gameId;
        console.log(`📊 Queued ${count} jumps for processing after game over (total: ${this.jumps})`);
      },
      
      // Queue a score transaction
      queueScore: function(score, gameId) {
        if (!score || score <= 0) return;
        this.finalScore = Math.max(this.finalScore, score);
        this.gameId = gameId || this.gameId;
        console.log(`📊 Queued score ${score} for processing after game over`);
      },
      
      // Process all queued transactions
      processQueue: async function(walletClient, publicClient, address, supabase) {
        if (this.isProcessing || this.jumps <= 0) return false;
        
        this.isProcessing = true;
        console.log(`⚙️ Processing transaction queue: ${this.jumps} jumps, score: ${this.finalScore}`);
        
        try {
          // Create a unique transaction key
          const txKey = `game_over_${this.gameId}_${address}_${this.finalScore}_${this.jumps}`;
          
          if (!window.__GLOBAL_TX_SYSTEM.canSendTransaction(txKey)) {
            console.log(`🔒 Game over transaction blocked: ${txKey}`);
            this.isProcessing = false;
            return false;
          }
          
          // Process the blockchain transaction
          const jumpContractAddress = '0xc9fc1784df467a22f5edbcc20625a3cf87278547';
          
          console.log(`📤 Sending transaction for ${this.jumps} jumps to contract ${jumpContractAddress}`);
          
          const hash = await walletClient.writeContract({
            address: jumpContractAddress,
            abi: [
              {
                "inputs": [{"internalType": "uint256", "name": "_jumps", "type": "uint256"}],
                "name": "recordJumps",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
              }
            ],
            functionName: 'recordJumps',
            args: [BigInt(this.jumps)],
            account: address,
            gas: BigInt(200000),
          });
          
          console.log(`📤 Transaction sent: ${hash}`);
          
          // Wait for confirmation
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
          
          // Update database
          if (supabase && this.finalScore > 0) {
            try {
              console.log(`📊 Recording score ${this.finalScore} in database`);
              // First check if this wallet already has a score entry with higher score
              const { data: existingScore } = await supabase
                .from('scores')
                .select('score')
                .eq('wallet_address', address.toLowerCase())
                .order('score', { ascending: false })
                .maybeSingle();
              
              // Only insert if there's no existing score or new score is higher
              if (!existingScore || this.finalScore > existingScore.score) {
                console.log(`Saving new high score ${this.finalScore} (previous: ${existingScore?.score || 'none'})`);
                
                const { error } = await supabase
                  .from('scores')
                  .insert({
                    wallet_address: address.toLowerCase(),
                    score: this.finalScore,
                    game_id: this.gameId,
                    created_at: new Date().toISOString()
                  });
                
                if (error) {
                  console.error('Error recording score in database:', error);
                } else {
                  console.log(`✅ Score recorded successfully in database`);
                }
              } else {
                console.log(`Score ${this.finalScore} not saved - lower than existing high score ${existingScore.score}`);
              }
            } catch (dbError) {
              console.error('Error saving score to database:', dbError);
            }
          }
          
          // Mark transaction as completed in global system
          window.__GLOBAL_TX_SYSTEM.finishTransaction(txKey);
          
          // Reset the queue
          this.reset();
          
          // Update UI immediately without waiting for refetch
          if (window.web3Context) {
            if (window.web3Context.setTotalJumps) {
              window.web3Context.setTotalJumps(prev => prev + this.jumps);
            }
            if (window.web3Context.setPlayerHighScore) {
              window.web3Context.setPlayerHighScore(prev => Math.max(prev, this.finalScore));
            }
          }
          
          return true;
        } catch (error) {
          console.error(`❌ Error processing transaction queue:`, error);
          this.isProcessing = false;
          return false;
        }
      },
      
      // Reset the queue
      reset: function() {
        this.jumps = 0;
        this.finalScore = 0;
        this.gameId = null;
        this.transactions = [];
        this.isProcessing = false;
      }
    };
  }
  
  // Now modify the recordPlayerJumps function to queue jumps instead of sending immediately
  const recordPlayerJumps = useCallback(async (jumpCount, jumpGameId, source = "unknown") => {
    if (!address || !jumpCount || jumpCount <= 0) return false;
    
    // Create a unique transaction key for logging
    const sessionId = jumpGameId || gameId || window.__currentGameSessionId || Date.now().toString();
    const txKey = `jumps_${sessionId}_${address}_${jumpCount}`;
    
    // During gameplay, queue jumps instead of sending immediately
    if (source !== "game_over") {
      console.log(`🔄 Queueing ${jumpCount} jumps from ${source} for later processing`);
      window.__GAME_TX_QUEUE.queueJumps(jumpCount, sessionId);
      
      // Also record in database for faster UI updates
      if (supabase) {
        try {
          // Get current jump count
          const { data: jumpData, error: jumpError } = await supabase
            .from('jumps')
            .select('count')
            .eq('wallet_address', address.toLowerCase())
            .maybeSingle();
          
          if (!jumpError) {
            const currentCount = jumpData?.count || 0;
            const newCount = currentCount + jumpCount;
            
            // Update the jumps in Supabase
            await supabase
              .from('jumps')
              .upsert({
                wallet_address: address.toLowerCase(),
                count: newCount
              }, { onConflict: 'wallet_address' });
            
            console.log(`📊 Updated jumps in database: ${currentCount} → ${newCount}`);
            
            // Update UI immediately if possible
            if (window.web3Context && window.web3Context.setTotalJumps) {
              window.web3Context.setTotalJumps(newCount);
            }
          }
        } catch (dbError) {
          console.warn('Error updating jumps in database:', dbError);
        }
      }
      
      return true; // Return success without sending transaction
    }
    
    // Only process immediate transactions for game_over or if transaction queue processing is explicitly requested
    if (source === "game_over") {
      // Use our global transaction system to check if this transaction can proceed
      if (!window.__GLOBAL_TX_SYSTEM.canSendTransaction(txKey)) {
        console.log(`🔒 Jumps transaction blocked by global system: ${txKey} (from ${source})`);
        return false;
      }
      
      console.log(`🚀 PROCEEDING with jump transaction: ${txKey} (${jumpCount} jumps from ${source})`);
      
      try {
        const contractAddress = '0xc9fc1784df467a22f5edbcc20625a3cf87278547';
        const contractAbi = [
          {
            "inputs": [{"internalType": "uint256", "name": "_jumps", "type": "uint256"}],
            "name": "recordJumps",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ];
        
        // Add a deliberate delay to ensure UI update before transaction
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: contractAbi,
          functionName: 'recordJumps',
          args: [BigInt(jumpCount)],
          account: address,
          gas: BigInt(200000),
        });
        
        console.log(`📤 SENT: Jump transaction ${hash} for ${jumpCount} jumps (source: ${source})`);
        
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log(`✅ CONFIRMED: Jump transaction in block ${receipt.blockNumber}`);
        
        // Mark as completed in global system
        window.__GLOBAL_TX_SYSTEM.finishTransaction(txKey);
        
        return true;
      } catch (error) {
        console.error(`❌ ERROR: Recording jumps (source: ${source}):`, error);
        
        // Mark as failed in global system
        window.__GLOBAL_TX_SYSTEM.failTransaction(txKey, error.message);
        
        return false;
      }
    }
    
    return false; // Default to not sending transaction during gameplay
  }, [address, walletClient, publicClient, gameId]);
  
  // Initialize fallback provider for offline mode
  useEffect(() => {
    // Create a fallback provider if we don't have one from web3
    if (!provider) {
      console.log("Creating fallback provider for offline mode");
      try {
        // Use a safe try/catch and handle all potential errors
        let offlineProvider;
        
        try {
          // Try ethers v6 style import first
          offlineProvider = new ethers.JsonRpcProvider(
            "https://testnet-rpc.monad.xyz"
          );
        } catch (v6Error) {
          console.log("JsonRpcProvider failed, trying providers.JsonRpcProvider:", v6Error);
          // Try ethers v5 style as fallback
          offlineProvider = new ethers.providers.JsonRpcProvider(
            "https://testnet-rpc.monad.xyz"
          );
        }
        
        console.log("Fallback provider created successfully");
        setFallbackProvider(offlineProvider);
      } catch (error) {
        console.error("Failed to create fallback provider:", error);
        
        // Create a minimal mock provider to avoid errors
        const mockProvider = {
          getBlockNumber: async () => 0,
          getSigner: () => ({
            getAddress: async () => address || '0x0000000000000000000000000000000000000000'
          }),
          _isProvider: true
        };
        
        console.log("Using mock provider to avoid errors");
        setFallbackProvider(mockProvider);
      }
    }
  }, [provider, address]);
  
  // Update the username check effect
  useEffect(() => {
    const checkUsername = async () => {
        if (!isConnected || !address) {
            console.log("? No wallet connected");
            setUsername(null);
            return;
        }
        
        try {
            console.log("?? Checking username for wallet:", address);
            
            // Force clear any previous username first 
            setUsername(null);
            
            // Get username from Supabase
            const { data, error } = await supabase
                .from('users')
                .select('username')
                .eq('wallet_address', address.toLowerCase())
                .maybeSingle();
            
            console.log("?? Supabase response:", { data, error });
            
            if (data?.username) {
                console.log("? Found username:", data.username);
                setUsername(data.username);
                setShowModal(false); // Hide modal when username exists
    } else {
                console.log("? No username found for current wallet - username input form will be shown");
                setUsername(null);
                setShowModal(true);
            }
        } catch (error) {
            console.error("?? Error checking username:", error);
            setUsername(null);
        }
    };

    // Run username check when wallet connects or changes
    if (isConnected) {
        checkUsername();
    }
}, [isConnected, address]);

  // Add this function inside the GameComponent before the useEffect that contains setupGameCommands
  const recordScoreAndJumpsInOneTx = useCallback(async (finalScore, jumpCount, gameSessionId) => {
    if (!address || !walletClient || !publicClient) return false;
    if (jumpCount <= 0) return false;
    
    // Create a unique transaction key for deduplication
    const sessionId = gameSessionId || gameId || Date.now().toString();
    const txKey = `game_over_${sessionId}_${address}_${finalScore}_${jumpCount}`;
    
    // Check if this transaction can proceed
    if (!window.__GLOBAL_TX_SYSTEM.canSendTransaction(txKey)) {
      console.log(`🔒 Game over transaction blocked: ${txKey}`);
      return false;
    }
    
    console.log(`🚀 Processing game over: Score=${finalScore}, Jumps=${jumpCount}`);
    
    try {
      setTransactionPending(true);
      
      // Process all queued jumps plus any new ones from this call
      window.__GAME_TX_QUEUE.queueJumps(jumpCount, sessionId);
      window.__GAME_TX_QUEUE.queueScore(finalScore, sessionId);
      
      // Process the queue
      const success = await window.__GAME_TX_QUEUE.processQueue(walletClient, publicClient, address, supabase);
      
      if (success) {
        console.log('✅ Successfully processed all queued transactions');
      } else {
        console.error('❌ Failed to process transaction queue');
      }
      
      return success;
    } catch (error) {
      console.error(`❌ Error recording game results:`, error);
      window.__GLOBAL_TX_SYSTEM.failTransaction(txKey, error.message);
      return false;
    } finally {
      setTransactionPending(false);
      setShowPlayAgain(true);
    }
  }, [address, walletClient, publicClient, gameId, setTransactionPending, setShowPlayAgain, supabase]);

  // Now find and update the game initialization useEffect that contains setupGameCommands
  useEffect(() => {
    // Only proceed if game should be shown and isn't loading
    if (!showGame) {
      console.log("Game not being shown yet - skipping game initialization");
      return;
    }
    
    // Set up a retry mechanism for game initialization
    let retryCount = 0;
    const maxRetries = 5;
    
    const initializeGame = () => {
      if (!iframeRef.current) {
        console.log("Iframe reference not available yet");
        
        // Try again if we haven't exceeded max retries
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying game initialization (${retryCount}/${maxRetries})...`);
          setTimeout(initializeGame, 1000);
        } else {
          console.error("Failed to initialize game after maximum retries");
        }
        return;
      }
      
      try {
        console.log("Initializing game with provider and wallet");
        const effectiveProvider = provider || fallbackProvider;
        
        if (address && iframeRef.current) {
          try {
            // Inject the audio preloading script
            preloadGameAudio(iframeRef.current);
            
          const commands = setupGameCommands(iframeRef.current, {
            provider: effectiveProvider,
            account: address,
            contract,
            onScoreUpdate: (score) => {
                // Debounce score updates to reduce re-renders
                if (window.__debounceScoreUpdate) {
                  clearTimeout(window.__debounceScoreUpdate);
                }
                window.__debounceScoreUpdate = setTimeout(() => {
              setGameScore(score);
                  window.__debounceScoreUpdate = null;
                }, 100);
            },
            onGameOver: async (finalScore) => {
              console.log('Game over handler called with score:', finalScore);
              
              try {
                // Get the jump count directly from the game's display
                const jumpCount = iframeRef.current.contentWindow.__jumpCount || 0;
                console.log('Final jump count from game:', jumpCount);

                if (typeof finalScore !== 'number') {
                  throw new Error('Invalid final score: ' + finalScore);
                }
                
                  // Use our new bundled transaction approach
                  console.log('Using bundled transaction for score and jumps at game over');
                  const success = await recordScoreAndJumpsInOneTx(finalScore, jumpCount, gameId);
                
                if (success) {
                    console.log('Score and jumps saved successfully in one transaction');
                } else {
                  console.error('Failed to save score and jumps');
                }
                
                return success;
              } catch (error) {
                console.error('Error in game over handler:', error);
                  // Still show play again button on error
                setShowPlayAgain(true);
                return false;
              }
            },
            onJump: async (platformType) => {
              try {
                  // Increment the local jump counter without blockchain transactions
                window.__jumpCount = (window.__jumpCount || 0) + 1;
                  
                  // Queue jump in transaction system but don't send during gameplay
                  // This is where we ensure no transactions are sent during gameplay
                  if (window.__GAME_TX_QUEUE) {
                    // Uncomment to queue jumps in real-time - we're not doing this to avoid ANY blockchain calls during gameplay
                    // window.__GAME_TX_QUEUE.queueJumps(1, gameId); 
                  }
                
                return true; // Always return true to keep the game going
              } catch (error) {
                console.error('Error in jump handler:', error);
                return true; // Return true even on error to keep the game going
              }
            }
          });
            
            console.log("Game successfully initialized!");
      } catch (error) {
        console.error("Error setting up game commands:", error);
      }
        } else {
          console.log("Missing address or iframe reference for game initialization");
        }
      } catch (error) {
        console.error("Error initializing game:", error);
      }
    };
    
    // Start initialization with a small delay to ensure DOM is ready
    setTimeout(initializeGame, 500);
    
    return () => {
      // Clean up any timers or resources when component unmounts
      console.log("Cleaning up game initialization resources");
      if (window.__debounceScoreUpdate) {
        clearTimeout(window.__debounceScoreUpdate);
      }
    };
  }, [showGame, provider, fallbackProvider, contract, address, setGameScore, recordScoreAndJumpsInOneTx]);

  // Add this function to preload all game audio and handle errors
  const preloadGameAudio = (iframe) => {
    try {
      const doc = iframe.contentWindow.document;
      const script = document.createElement('script');
      script.textContent = `
        // Audio preloader to prevent in-game lag from audio loading
        (function() {
          // Audio files to preload
          const audioFiles = [
            '/sounds/jump.mp3', 
            '/sounds/jump.ogg',
            '/sounds/spring.mp3',
            '/sounds/spring.ogg',
            '/sounds/fall.mp3',
            '/sounds/fall.ogg',
            '/sounds/crash.mp3',
            '/sounds/crash.ogg',
            '/sounds/powerup.mp3',
            '/sounds/powerup.ogg'
          ];
          
          // Create audio objects for each file
          window.__preloadedAudio = {};
          window.__audioLoaded = {};
          
          // Preload all audio files
          audioFiles.forEach(file => {
            try {
              const audio = new Audio();
              
              // Handle any loading errors silently
              audio.onerror = function() {
                console.warn('Could not load audio file: ' + file);
                window.__audioLoaded[file] = false;
              };
              
              audio.oncanplaythrough = function() {
                window.__audioLoaded[file] = true;
              };
              
              audio.src = file;
              audio.preload = 'auto';
              audio.load();
              
              // Store for later use
              window.__preloadedAudio[file] = audio;
            } catch (e) {
              // Silently fail - don't let audio errors disrupt the game
              window.__audioLoaded[file] = false;
            }
          });
          
          // Audio error handling - patch the game's audio functions
          const originalAudioPlay = window.Audio.prototype.play;
          window.Audio.prototype.play = function() {
            try {
              // Check if this audio has errors
              if (this.error) {
                // Just return a resolved promise instead of throwing error
                return Promise.resolve();
              }
              
              // Try to play but catch any errors
              return originalAudioPlay.call(this).catch(err => {
                // Silent error handling - don't disrupt gameplay
                return Promise.resolve();
              });
            } catch (e) {
              // Return a resolved promise for any error
              return Promise.resolve();
            }
          };
          
          // Disable NotSupportedError logs
          window.addEventListener('error', function(e) {
            // Check if error is audio-related
            if (e && e.message && (
              e.message.includes('NotSupported') || 
              e.message.includes('audio') ||
              e.message.includes('play()')
            )) {
              // Prevent the error from appearing in console
              e.preventDefault();
              e.stopPropagation();
              return true;
            }
          }, true);
          
          console.log('Audio preloading complete');
        })();
      `;
      
      doc.body.appendChild(script);
    } catch (err) {
      console.error('Error preloading audio:', err);
    }
  };

  useEffect(() => {
    if (showGame) {
      // Reset loading state when game is shown
      setIsLoading(true);
      // Auto-hide loading screen after 3 seconds
      const timer = setTimeout(() => {
        setIsLoading(false);
        
        // Make iframe visible
        const iframe = iframeRef.current;
        if (iframe) {
          iframe.style.visibility = 'visible';
          iframe.style.opacity = '1';
        }
      }, 3000);
      
      return () => clearTimeout(timer);
    } else {
      // Reset loading state when returning to home
      setIsLoading(false);
    }
  }, [showGame]);

  // Update the checkNFTOwnership function to work better with viem and avoid recursion
  const checkNFTOwnership = useCallback(async (walletAddress) => {
    if (!walletAddress) return false;
    
    try {
      // First check if the result is cached
      const cachedStatus = localStorage.getItem(`nft_ownership_${walletAddress.toLowerCase()}`);
      if (cachedStatus) {
        try {
          const { hasNFT, timestamp } = JSON.parse(cachedStatus);
          // Use cache if less than 24 hours old - increased to avoid excessive checking
          if (Date.now() - timestamp < 86400000) {
            console.log('Using cached NFT ownership status:', hasNFT);
            return hasNFT;
          }
        } catch (e) {
          // Invalid cache, ignore and continue
        }
      }
      
      // For development, use a mock result to avoid API calls
      if (import.meta.env.DEV) {
        console.log('DEV MODE: Using mock NFT ownership status');
        const mockHasNFT = true; // Set to true to let user play
        
        // Cache the mock result
        localStorage.setItem(`nft_ownership_${walletAddress.toLowerCase()}`, JSON.stringify({
          hasNFT: mockHasNFT,
          timestamp: Date.now()
        }));
        
        return mockHasNFT;
      }
      
      // Always return true for production to avoid deployment issues
      console.log('Production mode: Allowing NFT access by default');
      localStorage.setItem(`nft_ownership_${walletAddress.toLowerCase()}`, JSON.stringify({
        hasNFT: true,
        timestamp: Date.now()
      }));
      
      return true; // Default to true
        } catch (error) {
      console.error('Error checking NFT ownership:', error);
      
      // Don't update cache on error - keep previous value if it exists
      return true; // Default to true to allow access
    }
  }, []); // No dependencies to avoid re-rendering

  // Replace the checkMintStatus function with a version that avoids recursion
  const checkMintStatus = useCallback(async (walletAddress) => {
    if (!walletAddress) return false;
    
    // Use a cache key that includes the address
    const cacheKey = `nft_status_${walletAddress.toLowerCase()}`;
    
    try {
      // Check cache with appropriate TTL (5 minutes instead of 24 hours)
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const { hasNFT, timestamp } = JSON.parse(cachedData);
          // Use shorter cache time (5 min) to avoid stale data but reduce calls
          if (Date.now() - timestamp < 300000) {
            console.log('Using cached NFT status:', hasNFT);
            return hasNFT;
          }
        } catch (e) {}
      }
      
      console.log('Checking NFT ownership on contract...');
      const nftAddress = import.meta.env.VITE_CHARACTER_CONTRACT_ADDRESS;
      
      const hasMinted = await publicClient.readContract({
        address: nftAddress,
        abi: [
          {
            name: "walletHasMinted",
            type: "function",
            stateMutability: "view",
            inputs: [{ type: "address", name: "wallet" }],
            outputs: [{ type: "bool" }]
          }
        ],
        functionName: "walletHasMinted",
        args: [walletAddress]
      });
      
      // Cache the result with timestamp
      localStorage.setItem(cacheKey, JSON.stringify({
        hasNFT: hasMinted,
        timestamp: Date.now()
      }));
      
      return hasMinted;
    } catch (error) {
      console.error('Error checking NFT ownership:', error);
      return false;
    }
  }, [publicClient]);

  // Find and replace the useEffect that calls checkMintStatus
  // with an optimized version that only runs when address changes
  useEffect(() => {
    // Clear NFT status when wallet changes/disconnects  
    if (!isConnected || !address) {
      setHasMintedCharacter(false);
      setIsCheckingMint(false);
      return;
    }
    
    // Prioritize props to avoid additional RPC call
    if (hasMintedNft !== undefined) {
      console.log('Using NFT status from props:', hasMintedNft);
      setHasMintedCharacter(hasMintedNft);
      setIsCheckingMint(false);
      return;
    }
    
    // Track in-flight requests to avoid duplicate calls
    const requestKey = `request_${address.toLowerCase()}`;
    if (window[requestKey]) {
      console.log('NFT check already in progress');
      return;
    }
    
    setIsCheckingMint(true);
    window[requestKey] = true;
    
    // Check the contract status
    checkMintStatus(address)
      .then(result => {
        console.log('NFT ownership result:', result);
        setHasMintedCharacter(result);
      })
      .catch(err => {
        console.error('NFT check failed:', err);
        setHasMintedCharacter(false);
      })
      .finally(() => {
        setIsCheckingMint(false);
        window[requestKey] = false;
      });
  }, [address, isConnected, hasMintedNft, checkMintStatus]);

  // Update the wallet connection status effect
  useEffect(() => {
    // Clear username when wallet disconnects or changes
    if (!isConnected || !address) {
      setUsername(null);
    }

    // Send wallet connection status to the game iframe
    const sendWalletStatus = () => {
        const gameIframe = iframeRef.current;
            if (gameIframe && gameIframe.contentWindow) {
                gameIframe.contentWindow.postMessage({
                type: 'WALLET_CONNECTION_STATUS',
                connected: !!isConnected && !!address
                }, '*');
            console.log('Sent wallet status to game:', !!isConnected && !!address);
        }
    };
    
    // Send status whenever it changes
    sendWalletStatus();
    
    // Set up listener for connection requests from the game
    const handleConnectRequest = (event) => {
        if (event.data?.type === 'CONNECT_WALLET_REQUEST') {
            console.log('Received connect wallet request from game');
            if (!isConnected && openConnectModal) {
                // Trigger wallet connection UI
                openConnectModal();
            }
        }
    };
    
    window.addEventListener('message', handleConnectRequest);
    
    return () => {
        window.removeEventListener('message', handleConnectRequest);
    };
}, [isConnected, address, openConnectModal]);

  // Modify the handlePlayAgain function to track games
  const handlePlayAgain = useCallback(() => {
    console.log("?? Play Again clicked");
    
    // Reset the global transaction system for the new game
    if (window.__GLOBAL_TX_SYSTEM) {
      window.__GLOBAL_TX_SYSTEM.reset();
      console.log("?? Transaction system reset for new game");
    }
    
    // Reset revive purchase flag
    setRevivePurchased(false);
    console.log("? Reset revivePurchased flag for new game");
    
    // Increment games counter in Supabase
    console.log("Explicitly incrementing games counter for new game");
    if (address && incrementGamesPlayed) {
      incrementGamesPlayed(address)
        .then(newCount => {
          console.log(`Game count updated to: ${newCount}`);
          // Make sure we update local state
          setGamesPlayed(newCount);
        })
        .catch(err => {
          console.error("Failed to update game count from context:", err);
          // Fallback to direct update if context method fails
          incrementGamesCount(address, supabase)
            .then(newCount => {
              console.log(`Game count updated directly to: ${newCount}`);
              setGamesPlayed(newCount);
        })
            .catch(fallbackErr => console.error("Fallback game count update failed:", fallbackErr));
        });
    } else if (address && supabase) {
      // Use direct method if context method not available
      console.log("Using direct method to increment games counter");
      incrementGamesCount(address, supabase)
        .then(newCount => {
          console.log(`Game count updated directly to: ${newCount}`);
          setGamesPlayed(newCount);
        })
        .catch(err => console.error("Direct game count update failed:", err));
    } else {
      console.warn("Cannot increment games counter - missing address or supabase client");
    }
    
    // Clear all localStorage high scores to prevent fallback
    try {
      // Clear any potential localStorage high scores
      localStorage.removeItem('highScore');
      
      // Clear address-specific high scores
      if (address) {
        localStorage.removeItem(`highScore_${address.toLowerCase()}`);
      }
      
      console.log("?? Cleared localStorage high scores");
    } catch (e) {
      console.warn("Error clearing localStorage:", e);
    }
    
    // Reset game state
    setCurrentJumps(0);
    setGameScore(0);
    setShowPlayAgain(false);
    setTransactionPending(false);
    
    // Force a new game session
    const newGameId = Date.now().toString();
    setGameId(newGameId);
    
    // Set the new session ID
    window.__currentGameSessionId = newGameId;
    window.__jumpCount = 0;
    console.log("?? Created new game session ID:", newGameId);
    
    // Store in session storage
    try {
      sessionStorage.setItem('current_game_session', newGameId);
    } catch (e) {
      console.warn("Could not store game session in sessionStorage:", e);
    }
    
    // Force iframe reload - use the existing function
    const newIframe = forceReloadIframe(iframeRef, newGameId);
    
    // Pass session ID to the iframe after a short delay to ensure it's loaded
    setTimeout(() => {
      if (newIframe && newIframe.contentWindow) {
        newIframe.contentWindow.postMessage({
          type: 'GAME_SESSION_ID',
          sessionId: newGameId
        }, '*');
        console.log("?? Sent session ID to reloaded iframe:", newGameId);
      }
    }, 1000);
    
    console.log("?? Game reset complete with new session ID:", newGameId);
  }, [address, incrementGamesPlayed, setGameScore, setRevivePurchased, revivePurchased, supabase]);

  // Add a state to GameComponent for games played
  const [gamesPlayed, setGamesPlayed] = useState(0);

  // Detect mobile view on component mount and window resize
  const detectMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth <= 768 || detectMobile());
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Remove all duplicates and just keep this version
  const renderWalletStatus = () => {
    if (!isConnected) {
      return (
        <div className="wallet-connect">
          <ConnectButton 
            showBalance={false}
            chainStatus="none"
            accountStatus="address"
          />
        </div>
      );
    }

      return (
      <div className="wallet-info">
        {address && (
          <div className="wallet-address">
            {`${address.substring(0, 6)}...${address.substring(address.length - 4)}`}
          </div>
        )}
      </div>
    );
  };

  // Update the handlePlayClick to check if username exists and simplify the animation/transition
  const handlePlayClick = useCallback(() => {
    // Check if username exists first
    if (!username) {
      console.log('Username not set, cannot play');
      // Flash the username form or show a toast notification
      const statsCard = document.querySelector('.username-form-card');
      if (statsCard) {
        statsCard.classList.add('highlight-card');
        setTimeout(() => {
          statsCard.classList.remove('highlight-card');
        }, 1500);
      }
      return;
    }
    
    // Add button animation
    const playButton = document.querySelector('.play-button');
    if (playButton) {
      playButton.classList.add('play-button-clicked');
    }
    
    // Set the hash to indicate we're in game mode
    window.location.hash = 'game';
    
    // Show the game with loading animation
    console.log('Setting showGame to true');
    setShowGame(true);
    
    // Reset game state for fresh start
    setGameScore(0);
    setCurrentJumps(0);
    
    // Increment games counter when starting a new game
    console.log('Incrementing games played counter');
    if (address && incrementGamesPlayed) {
      incrementGamesPlayed(address)
        .then(newCount => {
          console.log(`Game counter updated: ${newCount} games played`);
          setGamesPlayed(newCount);
        })
        .catch(err => console.error("Failed to increment games counter:", err));
    }
    
    // Reset play button animation after a delay
    setTimeout(() => {
      if (playButton) {
        playButton.classList.remove('play-button-clicked');
      }
    }, 500);
  }, [username, setGameScore, address, incrementGamesPlayed]);

  // Modify the game message handler to support transactions at game over
  const handleGameMessages = useCallback(async (event) => {
    // Verify source strictly - only process if directly from iframe
    if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
      // Skip processing events that don't come directly from our iframe
      return;
    }
    
    // Only process if it's a bundle jumps message
    if (event.data?.type === 'BUNDLE_JUMPS' && event.data.data) {
      console.log("🔍 BUNDLE_JUMPS received from", event.data?.source || 'unknown');
      
      const originalData = event.data.data;
      const { score, jumpCount, saveId = `game_${gameId}_${Date.now()}` } = originalData;
      
      // Skip if no jumps or if transaction already pending or global lock is active
      if (jumpCount <= 0) {
        console.log("⏭️ Skipping BUNDLE_JUMPS - no jumps to record");
        return;
      }
      
      // Create a transaction key for this bundle
      const txKey = `jumps_${saveId}_${address}_${jumpCount}`;
      
      // Check if this transaction would be allowed by our global system
      if (!window.__GLOBAL_TX_SYSTEM || !window.__GLOBAL_TX_SYSTEM.canSendTransaction(txKey)) {
        console.log(`🔒 BUNDLE_JUMPS blocked by global system: ${txKey}`);
        return;
      }
      
      // Everything looks good - proceed with jump recording
      try {
        setTransactionPending(true);
        await recordPlayerJumps(jumpCount, saveId, 'BUNDLE_JUMPS');
      } catch (error) {
        console.error('BUNDLE_JUMPS transaction error:', error);
      } finally {
        setTransactionPending(false);
        setShowPlayAgain(true);
      }
    }
  }, [address, walletClient, publicClient, gameId, recordPlayerJumps]);

  // Add a function to handle game over transactions
  const handleGameOver = useCallback(async (score) => {
    if (!address || !walletClient) return;
    
    // Check if we're in post-revive-cancel mode for this gameId
    // If so, skip this separate transaction as it will be bundled with the jumps transaction
    if (window.__currentGameId && window[`revive_cancel_${window.__currentGameId}`]) {
      console.log(`⏭️ Skipping separate score transaction - will be bundled with jumps for revive cancel game: ${window.__currentGameId}`);
      return;
    }
    
    try {
      console.log("Sending game over transaction with score:", score);
      
      // Use the contract address from your environment
      const gameAddress = import.meta.env.VITE_GAME_CONTRACT_ADDRESS || import.meta.env.VITE_CHARACTER_CONTRACT_ADDRESS;
      
      // Prepare the transaction - adjust this to match your original functionality
      const hash = await walletClient.writeContract({
        address: gameAddress,
        abi: [
          {
            name: "recordScore",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [
              { name: "score", type: "uint256" }
            ],
            outputs: [],
          }
        ],
        functionName: "recordScore",
        args: [BigInt(score)]
      });
      
      console.log("Game over transaction sent:", hash);
      
      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log("Game over transaction confirmed:", receipt);
      
      // Show success notification or update UI
      // ...
      
    } catch (err) {
      console.error("Game over transaction error:", err);
      // Handle error appropriately
    }
  }, [address, walletClient, publicClient]);
  
  // Add this function to your component
  const handleMessageFromGame = useCallback((event) => {
    // Check if iframe exists and event is from our iframe
    if (!iframeRef.current) return;
    
    // For iframe messages, validate the source
    if (event.source && event.source !== iframeRef.current.contentWindow) return;
    
    if (event.data && typeof event.data === 'object') {
      if (event.data.type === 'gameOver') {
        const { score } = event.data;
        console.log("Game over received with score:", score);
        handleGameOver(score);
      }
      // Handle other message types...
    }
  }, [handleGameOver, iframeRef]);
  
  // Update your event listener useEffect
  useEffect(() => {
    window.addEventListener('message', handleMessageFromGame);
    return () => {
      window.removeEventListener('message', handleMessageFromGame);
    };
  }, [handleMessageFromGame, revivePurchased]);

  // In your useEffect where you listen for messages from the iframe
  useEffect(() => {
    // Function to safely send messages to the iframe
    const safePostMessage = (message) => {
      try {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage(message, '*');
          return true;
        }
        return false;
      } catch (err) {
        console.warn('Error posting message to iframe:', err);
        return false;
      }
    };
    
    const handleIframeMessage = async (event) => {
      // Skip processing if we can't validate the source
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      
      const data = event.data;
      
      if (data && typeof data === 'object') {
        // Handle revive cancelled event
        if (data.type === 'REVIVE_CANCELLED') {
          console.log('🚫 Revive purchase cancelled by user:', data.gameId, 'Jumps:', data.jumps);
          
          // Store the current game ID globally to prevent separate score transaction
          window.__currentGameId = data.gameId;
          
          // Create a unique key for this revive cancellation
          const reviveCancelKey = `revive_cancel_${data.gameId}`;
          
          // Check if we've already processed this revive cancellation
          if (window[reviveCancelKey]) {
            console.log(`⚠️ Already processed revive cancellation for ${data.gameId}, skipping duplicate`);
            return;
          }
          
          // Mark this revive cancellation as processed globally
          window[reviveCancelKey] = true;
          
          // Reset the revive purchase flag since user cancelled it
          setRevivePurchased(false);
          
          // Get jump count from data or fallback to window jump count
          const jumpCount = data.jumps || window.__jumpCount || 0;
          
          // Always process jumps when a revive is cancelled - don't check for shouldRecordJumps flag
          if (jumpCount > 0) {
            console.log('📊 Recording jumps after revive cancellation:', jumpCount);
            
            // IMPORTANT: Update database but DO NOT send blockchain transaction
            // Let the GAME_OVER handler take care of the blockchain transaction
            try {
              // IMPORTANT: DIRECTLY UPDATE SUPABASE DATABASE FIRST
              if (supabase && address) {
                console.log(`📊 Directly updating jump count in database by ${jumpCount} for address ${address.toLowerCase()}`);
                
                // Get current jump count
                const { data: jumpData, error: jumpError } = await supabase
                  .from('jumps')
                  .select('count')
                  .eq('wallet_address', address.toLowerCase())
                  .maybeSingle();
                
                if (jumpError) {
                  console.error('Error fetching current jump count:', jumpError);
                } else {
                  const currentCount = jumpData?.count || 0;
                  const newCount = currentCount + jumpCount;
                  
                  console.log(`📊 Updating jumps from ${currentCount} to ${newCount}`);
                  
                  // Update the jumps in Supabase
                  const { error: updateError } = await supabase
                    .from('jumps')
                    .upsert({
                      wallet_address: address.toLowerCase(),
                      count: newCount
                    }, { onConflict: 'wallet_address' });
                  
                  if (updateError) {
                    console.error('Error updating jumps in Supabase:', updateError);
                  } else {
                    console.log(`📊 Successfully saved ${jumpCount} jumps to Supabase`);
                    
                    // Also save revive cancellation record
                    const { error: gameError } = await supabase
                      .from('game_sessions')
                      .insert({
                        wallet_address: address.toLowerCase(),
                        session_id: data.gameId, // Changed from game_id to session_id
                        jumps: jumpCount,
                        death_reason: 'revive_cancel', // Changed from source to death_reason
                        score: data.score || 0,
                        timestamp: new Date().toISOString(),
                        session_duration: data.duration || 0,
                        shots_fired: data.shotsFired || 0,
                        enemies_killed: data.enemiesKilled || 0
                      });
                    
                    if (gameError) {
                      console.error('Error saving game session:', gameError);
                    }
                  }
                }
              }
              
              // REMOVED: No longer sending blockchain transaction here
              // Let the GAME_OVER event handle the blockchain transaction
              console.log('⚠️ Skipping blockchain transaction in REVIVE_CANCELLED - will be handled by GAME_OVER event');
              
              // Update UI directly if possible
              if (window.web3Context && window.web3Context.setTotalJumps) {
                try {
                  // If we have access to the context, update it directly with the new value
                  const currentJumps = window.web3Context.totalJumps || 0;
                  const newJumpCount = currentJumps + jumpCount;
                  console.log(`⚡ Directly updating UI jump count: ${currentJumps} → ${newJumpCount}`);
                  window.web3Context.setTotalJumps(newJumpCount);
                } catch (err) {
                  console.error('Error updating jump count in UI:', err);
                }
              } else {
                // Set a flag to refresh stats on next render
                window.__refreshJumpsNeeded = true;
                console.log('🔄 Set flag to refresh jumps on next render');
                
                // Ensure UI updates by using a timeout
                setTimeout(() => {
                  if (typeof window.updateJumpsDisplay === 'function') {
                    window.updateJumpsDisplay();
                    console.log('🔄 Called updateJumpsDisplay via timeout');
                  }
                }, 1000);
              }
              
              // Store this gameId in a special global list to ensure Web3Context skips it
              if (!window.__processedReviveCancellations) window.__processedReviveCancellations = new Set();
              window.__processedReviveCancellations.add(data.gameId);
              
              console.log(`✅ Recorded revive cancellation jumps in database only, blockchain update will come from GAME_OVER`);
              
              // IMPORTANT: Force reset the pendingLock to allow GAME_OVER event to process
              if (window.__GLOBAL_TX_SYSTEM) {
                window.__GLOBAL_TX_SYSTEM.pendingLock = false;
                console.log('🔓 Force reset transaction lock after revive cancellation to allow GAME_OVER processing');
              }
              
              // Make sure Play Again button appears
              setShowPlayAgain(true);
            } catch (error) {
              console.error('❌ Error recording jumps after revive cancellation:', error);
              
              // Reset the lock even if there's an error
              if (window.__GLOBAL_TX_SYSTEM) {
                window.__GLOBAL_TX_SYSTEM.pendingLock = false;
              }
            }
          } else {
            console.log('⚠️ No jumps to record for revive cancellation');
          }
          
          return;
        }
        
        // Track when a revive is successfully used
        if (data.type === 'REVIVE_USED') {
          console.log('✨ Revive successfully used in game:', data.gameId, 'Current jumps:', data.finalJumpCount);
          
          // Store the game ID to avoid duplicate jump transactions later
          if (!window.reviveUsedGames) window.reviveUsedGames = new Set();
          window.reviveUsedGames.add(data.gameId);
          
          // Update the parent transaction tracker to prevent duplicates for this session
          const uniqueKey = `${data.gameId}_${address}_${data.finalJumpCount}`;
          if (!jumpTransactionTracker.has(uniqueKey)) {
            jumpTransactionTracker.set(uniqueKey, { 
              status: 'revived', 
              timestamp: Date.now(),
              jumps: data.finalJumpCount
            });
            console.log('📊 Added revive tracking for game:', data.gameId);
          }
          
          return;
        }
        
        if (data.type === 'gameOver' || data.type === 'GAME_OVER') {
          console.log('Game Over with score:', data.score || data.data?.finalScore);
          
          // Extract the game data
          const finalScore = data.score || data.data?.finalScore || 0;
          const jumpCount = data.jumps || data.data?.jumpCount || window.totalJumps || 0;
          const gameSessionId = data.gameId || data.data?.gameId || gameId;
          const wasReviveCancelled = data.reviveCancelled || data.data?.reviveCancelled;
          const messageSource = data.source || 'GAME_OVER';
          
          // Update the game score
          console.log(`Game over with score: ${finalScore}, jumps: ${jumpCount}, gameId: ${gameSessionId}, reviveCancelled: ${wasReviveCancelled}`);
          
          // Reset the revive purchased flag to ensure jumps are recorded at game over
          setRevivePurchased(false);
          
          // Create a transaction key for this game session's jumps
          const txKey = `jumps_${gameSessionId}_${address}_${jumpCount}`;
          
          // Special check: If this is a game over after revive cancellation, we check if database update was already done
          const reviveCancelKey = `revive_cancel_${gameSessionId}`;
          if (window[reviveCancelKey]) {
            console.log(`🔄 Game over after revive cancellation detected for game ${gameSessionId} - database already updated`);
            
            // For revive cancellations, we ALWAYS want to send the blockchain transaction
            // This ensures jumps are recorded on chain even if database was updated separately
            if (jumpCount > 0) {
              console.log(`💹 Proceeding with blockchain transaction after revive cancellation for ${jumpCount} jumps`);
              try {
                // Store the current game ID globally to prevent separate score transaction
                window.__currentGameId = gameSessionId;
                
                // BUNDLE SCORE AND JUMPS IN ONE TRANSACTION
                const contractAddress = '0xc9fc1784df467a22f5edbcc20625a3cf87278547'; // Use your actual contract address
                const jumpAbi = [
                  {
                    "inputs": [{"internalType": "uint256", "name": "_jumps", "type": "uint256"}],
                    "name": "recordJumps",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                  }
                ];
                
                console.log(`⚡ Using standard recordJumps function for ${jumpCount} jumps (simpler approach)`);
                
                try {
                  // Use the simple, reliable recordJumps function
                  const hash = await walletClient.writeContract({
                    address: contractAddress,
                    abi: jumpAbi,
                    functionName: 'recordJumps',
                    args: [BigInt(jumpCount)],
                    account: address,
                    // Set safe gas options to avoid estimation issues
                    gas: BigInt(100000), // Lower gas limit for simpler operation
                  });
                  
                  console.log(`📤 SENT: Jumps transaction ${hash}`);
                  
                  // Wait for transaction confirmation
                  const receipt = await publicClient.waitForTransactionReceipt({ hash });
                  console.log(`✅ CONFIRMED: Jumps transaction in block ${receipt.blockNumber}`);
                  
                  // Mark the transaction as completed in global system
                  if (window.__GLOBAL_TX_SYSTEM) {
                    window.__GLOBAL_TX_SYSTEM.finishTransaction(`jumps_${gameSessionId}_${address}_${jumpCount}`);
                  }
                  
                  // Store the game score in the database to avoid needing a second transaction
                  if (supabase && address && finalScore > 0) {
                    try {
                      console.log(`📊 Recording score ${finalScore} in database`);
                      // Check for existing score first
                      const { data: existingScore } = await supabase
                        .from('scores')
                        .select('score')
                        .eq('wallet_address', address.toLowerCase())
                        .order('score', { ascending: false })
                        .maybeSingle();
                      
                      // Only insert if no score exists or new score is higher
                      if (!existingScore || finalScore > existingScore.score) {
                        console.log(`Recording new high score ${finalScore} (previous: ${existingScore?.score || 'none'})`);
                        
                        const { error } = await supabase
                          .from('scores')
                          .insert({
                            wallet_address: address.toLowerCase(),
                            score: finalScore,
                            game_id: gameSessionId,
                            created_at: new Date().toISOString()
                          });
                        
                        if (error) {
                          console.error('Error recording score in database:', error);
                        } else {
                          console.log(`✅ Score recorded successfully in database`);
                        }
                      } else {
                        console.log(`Score ${finalScore} not saved - lower than existing high score ${existingScore.score}`);
                      }
                    } catch (dbError) {
                      console.error('Error saving score to database:', dbError);
                    }
                  }
                } catch (error) {
                  console.error('Error recording jumps:', error);
                  // Mark transaction as failed in global system
                  window.__GLOBAL_TX_SYSTEM.failTransaction(`jumps_${gameSessionId}_${address}_${jumpCount}`, error.message);
                }
              } catch (error) {
                console.error('Error recording jumps:', error);
                // Mark transaction as failed in global system
                window.__GLOBAL_TX_SYSTEM.failTransaction(`jumps_${gameSessionId}_${address}_${jumpCount}`, error.message);
              }
            }
            
            // Still mark this as a successful transaction in the UI
            setShowPlayAgain(true);
            
            // And still call onGameOver handler if provided
            if (onGameOver && typeof onGameOver === 'function') {
              try {
                onGameOver(finalScore);
              } catch (err) {
                console.error('Error in onGameOver handler:', err);
              }
            }
            
            return;
          }
          
          // Regular check if this transaction would be allowed by our global system
          const canProceed = window.__GLOBAL_TX_SYSTEM && 
                            window.__GLOBAL_TX_SYSTEM.txHistory && 
                            !window.__GLOBAL_TX_SYSTEM.txHistory.has(txKey) &&
                            !window.__GLOBAL_TX_SYSTEM.pendingLock;
          
          console.log(`🔍 GAME_OVER - Check if can record jumps: ${canProceed ? 'YES' : 'NO'} (txKey: ${txKey})`);
          
          // Use the centralized function to record jumps - will handle deduplication
          if (jumpCount > 0 && canProceed) {
            try {
              // Use global system to process transaction - this will prevent duplicates
              await recordPlayerJumps(jumpCount, gameSessionId, 'GAME_OVER');
            } catch (error) {
              console.error('Error recording jumps at game over:', error);
            }
          } else {
            console.log(`⏭️ Skipping jump recording - System check failed or pending transaction exists`);
          }
          
          // Call the handler from props or context
          if (onGameOver && typeof onGameOver === 'function') {
            try {
              onGameOver(finalScore);
            } catch (err) {
              console.error('Error in onGameOver handler:', err);
            }
          }
        } else if (data.type === 'GAME_RELOAD_CLICKED') {
          // Safe handling for reload requests
          console.log('Game reload requested');
          // Handle reload logic safely
        } else if (data.type === 'CONNECT_WALLET_REQUEST') {
          // Safe handling for wallet connection requests
          console.log('Wallet connection requested from game');
          if (!isConnected && openConnectModal) {
            try {
              openConnectModal();
            } catch (err) {
              console.warn('Error opening connect modal:', err);
            }
          }
        } else if (data.type === 'GAME_LOADED') {
          console.log('Game reports it is fully loaded');
          // Can do any initialization that requires the game to be fully loaded
          safePostMessage({
            type: 'PARENT_READY',
            timestamp: Date.now()
          });
        }
      }
    };
    
    window.addEventListener('message', handleIframeMessage);
    return () => {
      window.removeEventListener('message', handleIframeMessage);
    };
  }, [onGameOver, iframeRef, isConnected, openConnectModal, address, walletClient, publicClient, gameId, transactionPending, setRevivePurchased, recordPlayerJumps, transactionLockRef, jumpTransactionTracker]);

  // Add this at the top of your component
  useEffect(() => {
    document.body.style.backgroundImage = "url('/images/bg.jpg')";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center center";
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundAttachment = "fixed";
  }, []);

  // Add this effect to manage loading state and play button
  useEffect(() => {
    if (showGame) {
      // Reset loading state when game is shown
      setIsLoading(true);
      // Auto-hide loading screen after 3 seconds
      const timer = setTimeout(() => {
        setIsLoading(false);
        
        // Make iframe visible
        const iframe = iframeRef.current;
        if (iframe) {
          iframe.style.visibility = 'visible';
          iframe.style.opacity = '1';
        }
      }, 3000);
      
      return () => clearTimeout(timer);
    } else {
      // Reset loading state when returning to home
      setIsLoading(false);
    }
  }, [showGame]);

  // Add game session initialization to GameComponent
  useEffect(() => {
    // Generate a unique session ID for this game instance
    const newGameId = Date.now().toString();
    window.__currentGameSessionId = newGameId;
    console.log("?? Created new game session ID:", newGameId);
    
    // Reset jump counters for new session
    window.__jumpCount = 0;
    
    // Store the session ID in sessionStorage to maintain it through refreshes
    try {
      sessionStorage.setItem('current_game_session', newGameId);
    } catch (e) {
      console.warn("Could not store game session in sessionStorage:", e);
    }
    
    // Pass session ID to the iframe when it loads
    const sendSessionToIframe = () => {
      try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: 'GAME_SESSION_ID',
          sessionId: newGameId
        }, '*');
        console.log("?? Sent session ID to iframe:", newGameId);
        } else {
          console.log("?? Cannot send session ID to iframe yet - iframe not ready");
        }
      } catch (err) {
        console.warn("? Error sending session ID to iframe:", err);
      }
    };
    
    // Try to send immediately if iframe exists
    sendSessionToIframe();
    
    // Also try again after a delay to ensure iframe is loaded
    const timer = setTimeout(sendSessionToIframe, 1000);
    
    return () => {
      clearTimeout(timer);
      // Clear session when component unmounts
      window.__currentGameSessionId = null;
    };
  }, []);

  // Update the existing useEffect in GameComponent to listen for the document event
  useEffect(() => {
    // Function to open mint modal from anywhere in the app
    const openMintModalHandler = () => {
      console.log("Opening mint modal from event listener");
      setShowMintModal(true);
    };
    
    // Add the event listener
    document.addEventListener('openMintModal', openMintModalHandler);
    
    // Cleanup
    return () => {
      document.removeEventListener('openMintModal', openMintModalHandler);
    };
  }, []);

  // Add this useEffect near the other useEffects
  useEffect(() => {
    if (mintModalRequested) {
      console.log("Mint modal requested via state flag");
      setShowMintModal(true);
      setMintModalRequested(false);
    }
  }, [mintModalRequested]);

  // Update the script injection code (around line 1713-1741)
  useEffect(() => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    
    // Create a script element to inject into the iframe
    const injectScript = () => {
      try {
        const script = document.createElement('script');
        script.textContent = `
          // Disable console logging in game for performance
          (function() {
            // Store original console methods
            const originalConsole = {
              log: console.log,
              warn: console.warn,
              error: console.error,
              info: console.info
            };
            
            // Create silent versions that only log important info
            const LOGGING_ENABLED = false; // Global flag to enable/disable all logging
            
            // Log level settings
            const LOG_LEVELS = {
              ERRORS_ONLY: 'errors_only',     // Only log errors
              CRITICAL: 'critical',           // Log errors and critical warnings
              IMPORTANT: 'important',         // Log errors, warnings, and important info
              VERBOSE: 'verbose',             // Log everything (like original)
              SILENT: 'silent'                // Log absolutely nothing
            };
            
            // Current log level - change to adjust logging
            const CURRENT_LOG_LEVEL = LOG_LEVELS.ERRORS_ONLY;
            
            // Important patterns to preserve even in restricted modes
            const IMPORTANT_PATTERNS = [
              'error', 
              'Error', 
              'failed', 
              'Failed',
              'exception',
              'Exception'
            ];
            
            // Implementation of selective logging
            console.log = function(...args) {
              if (CURRENT_LOG_LEVEL === LOG_LEVELS.SILENT) return;
              
              // Always log errors
              if (CURRENT_LOG_LEVEL === LOG_LEVELS.ERRORS_ONLY) {
                // Check if this message contains error information
                const isError = args[0] && typeof args[0] === 'string' && 
                  IMPORTANT_PATTERNS.some(pattern => args[0].includes(pattern));
                
                if (isError) {
                  originalConsole.error.apply(console, args);
                }
                return;
              }
              
              // Log all jump related info only when verbose
              if (args[0] && typeof args[0] === 'string') {
                // Filter out frequent/noisy logs
                if (
                  args[0].includes('First jump on platform') || 
                  args[0].includes('Repeated jump') ||
                  args[0].includes('score popup') ||
                  args[0].includes('screen shake') ||
                  args[0].includes('PLATFORM JUMP PROCESSED')
                ) {
                  if (CURRENT_LOG_LEVEL === LOG_LEVELS.VERBOSE && LOGGING_ENABLED) {
                    originalConsole.log.apply(console, args);
                  }
                  return;
                }
              }
              
              // Log everything else according to current level
              if (CURRENT_LOG_LEVEL !== LOG_LEVELS.ERRORS_ONLY || LOGGING_ENABLED) {
                originalConsole.log.apply(console, args);
              }
            };
            
            // Also override warn - important for performance
            console.warn = function(...args) {
              if (CURRENT_LOG_LEVEL === LOG_LEVELS.SILENT) return;
              
              if (CURRENT_LOG_LEVEL === LOG_LEVELS.ERRORS_ONLY) {
                // Only log critical warnings
                const isCritical = args[0] && typeof args[0] === 'string' && 
                  IMPORTANT_PATTERNS.some(pattern => args[0].includes(pattern));
                
                if (isCritical) {
                  originalConsole.warn.apply(console, args);
                }
                return;
              }
              
              if (CURRENT_LOG_LEVEL !== LOG_LEVELS.ERRORS_ONLY || LOGGING_ENABLED) {
                originalConsole.warn.apply(console, args);
              }
            };
            
            // Keep error logging intact - important for debugging
            console.error = originalConsole.error;
          })();

          // Stop localStorage fallback for high scores
          const originalGetItem = localStorage.getItem;
          localStorage.getItem = function(key) {
            if (key && (key === 'highScore' || key.startsWith('highScore_'))) {
              return null; 
            }
            return originalGetItem.apply(this, arguments);
          };
          
          // Add anti-loop protection for high score updates
          let lastHighScoreUpdate = 0;
          let currentHighScore = 0;
          
          // Replace any existing handler with this debounced version
          window.setDirectHighScore = function(score) {
            // Prevent updating too frequently (once per 5 seconds max)
            const now = Date.now();
            if (now - lastHighScoreUpdate < 5000 && currentHighScore === score) {
              return; // Skip duplicate updates within 5 seconds
            }
            
            window.playerHighScore = score;
            window.highScoreSet = true;
            currentHighScore = score;
            lastHighScoreUpdate = now;
          };
          
          // Override the game's high score retrieval system
          // to stop its own polling
          if (window.getHighScore) {
            const originalGetHighScore = window.getHighScore;
            window.getHighScore = function() {
              return window.playerHighScore || 0;
            };
          }
          
          // NadsBot tracking initialization
          window.__nadsBotData = {
            sessionStartTime: Date.now(),
            jumps: 0,
            platformTypes: {
              normal: 0,
              moving: 0,
              breaking: 0,
              special: 0
            },
            powerUps: [],
            deaths: {
              reason: 'none',
              position: null
            },
            shotsFired: 0,
            enemiesKilled: 0,
            maxHeight: 0
          };
          
          // Update game over to collect NadsBot data
          if (typeof window.gameOver === 'function') {
            const originalGameOver = window.gameOver;
            window.gameOver = function(score) {
              // Calculate session duration
              const sessionDuration = Date.now() - window.__nadsBotData.sessionStartTime;
              
              // Get death reason (default to fall)
              const deathReason = window.__nadsBotData.deaths?.reason || 'fall';
              
              // Enhanced analytics data for NadsBot
              const analyticsData = {
                score: score || 0,
                jumps: window.__jumpCount || 0,
                deathReason: deathReason,
                platformTypes: Object.keys(window.__nadsBotData.platformTypes || {})
                  .filter(type => (window.__nadsBotData.platformTypes[type] || 0) > 0),
                shotsFired: window.__nadsBotData.shotsFired || 0,
                enemiesKilled: window.__nadsBotData.enemiesKilled || 0,
                duration: sessionDuration,
                timestamp: new Date().toISOString()
              };
              
              // Send enhanced data to parent
              if (window.parent) {
                try {
                  window.parent.postMessage({
                    type: 'GAME_OVER',
                    data: {
                      finalScore: score || 0,
                      jumpCount: window.__jumpCount || 0,
                      ...analyticsData
                    }
                  }, '*');
                } catch (err) {
                  console.error('Failed to send NadsBot analytics:', err);
                }
              }
              
              // Call original game over function
              return originalGameOver.apply(this, arguments);
            };
          }
          
          // Override platform hit functions to prevent logging
          if (window.jumpOnPlatform) {
            const originalJumpOnPlatform = window.jumpOnPlatform;
            window.jumpOnPlatform = function(platform, character) {
              // Increment jump count silently without logging
              if (!window.__jumpedPlatforms) {
                window.__jumpedPlatforms = new Set();
              }
              
              const platformId = platform.id || platform.x + "-" + platform.y;
              if (!window.__jumpedPlatforms.has(platformId)) {
                window.__jumpedPlatforms.add(platformId);
                window.__jumpCount = (window.__jumpCount || 0) + 1;
              }
              
              // Call original function without using apply
              return originalJumpOnPlatform.call(this, platform, character);
            };
          }
        `;
        
        // Add the script to the iframe's document
        const iframeDocument = iframeRef.current.contentWindow.document;
        iframeDocument.body.appendChild(script);
        
        // Set high score immediately
        if (typeof playerHighScore !== 'undefined') {
          iframeRef.current.contentWindow.setDirectHighScore(playerHighScore || 0);
        }
        
        console.log("?? Injected scripts into game");
      } catch (err) {
        console.error("Error injecting script:", err);
      }
    };
    
    // Wait for iframe to load before injecting
    iframeRef.current.addEventListener('load', injectScript);
    
    return () => {
      if (iframeRef.current) {
        iframeRef.current.removeEventListener('load', injectScript);
      }
    };
  }, [iframeRef.current, playerHighScore]);

  // Add this at the top of your component
  useEffect(() => {
    // Wait until iframe is loaded
    if (!iframeRef.current) return;
    
    const injectHighScoreOverride = () => {
      try {
        // Create a script to inject
        const script = document.createElement('script');
        script.textContent = `
          // Permanently disable high score checking in main.js
          (function() {
            // Intercept the console.log function to filter out specific messages
            const originalConsoleLog = console.log;
            console.log = function(...args) {
              // Filter out the high score messages
              if (args[0] === 'Using high score from player stats response:') {
                return; // Ignore these logs completely
              }
              return originalConsoleLog.apply(this, args);
            };
            
            // Set an immutable high score getter that always returns the value
            let _cachedHighScore = ${playerHighScore || 0};
            Object.defineProperty(window, 'playerHighScore', {
              get: function() { return _cachedHighScore; },
              set: function(val) { 
                _cachedHighScore = val;
                console.log("High score cached:", val);
              },
              configurable: false
            });
            
            // Override the game's getHighScore function
            if (window.getHighScore) {
              window.getHighScore = function() {
                return _cachedHighScore;
              };
            }
            
            // Flag this as done to prevent multiple injections
            window._highScoreOverrideApplied = true;
            
            console.log("?? High score checking permanently disabled");
          })();
        `;
        
        // Check if this has already been injected
        if (!iframeRef.current.contentWindow._highScoreOverrideApplied) {
          iframeRef.current.contentWindow.document.head.appendChild(script);
        }
      } catch (err) {
        console.error("Error injecting high score override:", err);
      }
    };
    
    // Wait for iframe to load, then inject
    if (iframeRef.current.contentDocument?.readyState === 'complete') {
      injectHighScoreOverride();
    } else {
      iframeRef.current.addEventListener('load', injectHighScoreOverride);
    }
    
    return () => {
      if (iframeRef.current) {
        iframeRef.current.removeEventListener('load', injectHighScoreOverride);
      }
    };
  }, [iframeRef.current, playerHighScore]);

  // In your GameComponent, add code to listen for reload button clicks
  useEffect(() => {
    if (!iframeRef.current) return;
    
    // Debounce event handler to prevent multiple rapid calls
    let eventProcessingTimeout;
    
    const handleMessage = (event) => {
      // Make sure iframe exists and the message is from our game iframe
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      
      // Debounce event processing - only handle last event in a series of rapid events
      clearTimeout(eventProcessingTimeout);
      eventProcessingTimeout = setTimeout(() => {
      // Listen for reload button clicks from the game
      if (event.data && event.data.type === 'reload_clicked') {
          // Only process if we're not already processing
          if (window.__processingReload) return;
          window.__processingReload = true;
          
        console.log('Reload button clicked in game!');
        
        // Increment games played count
        if (address) {
          incrementGamesPlayed(address)
            .then(newCount => {
              console.log(`Game count updated to: ${newCount}`);
              setGamesPlayed(newCount);
            })
              .catch(err => console.error("Failed to update game count:", err))
              .finally(() => {
                // Allow processing again after a short delay
                setTimeout(() => {
                  window.__processingReload = false;
                }, 1000);
              });
        }
      }
      }, 50); // Small delay to batch multiple events
    };
    
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(eventProcessingTimeout);
    };
  }, [address, incrementGamesPlayed, iframeRef]);

  // Add this code directly in your GameComponent useEffect
  useEffect(() => {
    // Track game IDs that we've interacted with
    const registeredGameIds = new Set();
    // Track which gameIds have already sent jump transactions to prevent duplicates
    const processedJumpGameIds = new Set();
    
    // Debounce event processing
    let messageProcessingTimeout;
    
    // Function to handle messages from the game iframe
    const handleGameMessage = async (event) => {
      // Make sure iframe exists and is from our game iframe
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      
      // Debounce processing to prevent UI jank
      clearTimeout(messageProcessingTimeout);
      messageProcessingTimeout = setTimeout(async () => {
        // Handle START_NEW_GAME message - we'll just log it but not send a transaction
        if (event.data?.type === 'START_NEW_GAME') {
          const gameId = String(event.data.gameId);
          console.log("📝 Game session started (no transaction needed):", gameId);
      }
      
        // Handle revive purchase request - this will also register the game if needed
      if (event.data?.type === 'PURCHASE_REVIVE') {
        console.log("🔄 Received revive purchase request:", event.data);
          
          // Immediately set the flag to prevent any other transactions
          setRevivePurchased(true);
          console.log("🚫 Setting revivePurchased=true to prevent additional transactions");
        
        try {
          // Ensure we have a wallet connection
          if (!address || !walletClient) {
            console.error("No wallet connection available for purchase");
            // Send failure response back to game
            iframeRef.current.contentWindow.postMessage({
              type: 'REVIVE_TRANSACTION_RESULT',
              success: false,
              error: 'No wallet connection'
            }, '*');
            return;
          }
          
          const contractAddress = event.data.contractAddress;
          const revivePrice = event.data.price; // Should be "0.5"
          
          console.log(`Attempting to purchase revive for ${revivePrice} MON from contract ${contractAddress}`);
          
            // Get gameId from the event data
            const gameId = event.data.gameId;
            
            // Ensure gameId is a proper string
            const formattedGameId = String(gameId);
            
            console.log(`Using gameId: ${formattedGameId} for revive purchase`);
          
          // Show transaction pending notice
          setTransactionPending(true);
          
            // Convert price to wei
            const priceInWei = parseEther(revivePrice);
            console.log(`Sending ${revivePrice} MON (${priceInWei} wei) with revive purchase`);
            
            // SIMPLIFIED: Just send the purchaseRevive transaction directly without checking registration
            try {
              // Simulate first to check for potential errors
          const { request } = await publicClient.simulateContract({
            address: contractAddress,
                abi: [
                  {
                    "inputs": [{"type": "string", "name": "gameId"}],
                    "name": "purchaseRevive",
                    "outputs": [],
                    "stateMutability": "payable",
                    "type": "function"
                  }
                ],
            functionName: 'purchaseRevive',
            account: address,
                args: [formattedGameId],
            value: priceInWei
          });
          
          // Send the transaction
          const hash = await walletClient.writeContract(request);
          console.log("Revive transaction submitted:", hash);
          
          // Wait for transaction to be confirmed
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          console.log("Revive transaction confirmed:", receipt);
          
              // Send success response to game
          iframeRef.current.contentWindow.postMessage({
            type: 'REVIVE_TRANSACTION_RESULT',
                success: true,
            transactionHash: receipt.transactionHash
          }, '*');
          
              // Set the revive purchased flag
              setRevivePurchased(true);
              // Reset after delay as a fallback
              setTimeout(() => {
                console.log("Resetting revive purchased flag after delay");
                setRevivePurchased(false);
              }, 60000);
        } catch (error) {
          console.error("Error processing revive purchase:", error);
          
          // Send failure response back to game
          iframeRef.current.contentWindow.postMessage({
            type: 'REVIVE_TRANSACTION_RESULT',
            success: false,
                error: error.message || "Transaction failed"
          }, '*');
            }
          } catch (error) {
            console.error("Error processing revive purchase:", error);
            
            // Send failure response back to game
            iframeRef.current.contentWindow.postMessage({
              type: 'REVIVE_TRANSACTION_RESULT',
              success: false,
              error: error.message || "Transaction failed"
            }, '*');
          } finally {
          // Hide transaction pending notice
          setTransactionPending(false);
        }
      }
        
        // Check if it's a reload_clicked message
        if (event.data?.type === 'reload_clicked') {
          if (window.__processingReloadClick) return; // Skip if already processing
          window.__processingReloadClick = true;
          
          console.log("⚡ Reload button clicked - updating games count");
          
          try {
            // Rest of reload logic...
            // [Keeping existing logic, just adding the processing flag]
          } catch (error) {
            console.error("Error handling reload click:", error);
          } finally {
            // Reset processing flag after a delay
            setTimeout(() => {
              window.__processingReloadClick = false;
            }, 1000);
          }
        }
      }, 50); // 50ms debounce
    };
    
    // Add event listener
    window.addEventListener('message', handleGameMessage);
    
    // Clean up
    return () => {
      window.removeEventListener('message', handleGameMessage);
      clearTimeout(messageProcessingTimeout);
    };
  }, [address, walletClient, publicClient, iframeRef, supabase, setGamesPlayed, parseEther]);

  // Define fetchGamesCount here, BEFORE it's used by any other functions
  const fetchGamesCount = async () => {
    if (!address || !supabase) return 0;
    
    try {
      const { data, error } = await supabase
        .from('games')
        .select('count')
        .eq('wallet_address', address.toLowerCase())
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching games count:", error);
        return 0;
      }
      
      const count = data?.count || 0;
      setGamesPlayed(count); // Update state with new count
      return count;
    } catch (error) {
      console.error("Error in fetchGamesCount:", error);
      return 0;
    }
  };

  // Inside the GameComponent function, add this useEffect
  useEffect(() => {
    // Direct console counter for reload clicks
    let reloadClickCount = 0;
    
    const handleGameReload = async (event) => {
      // Check if the message is from our game iframe
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      
      // Check for reload button click message
      if (event.data?.type === 'GAME_RELOAD_CLICKED') {
        reloadClickCount++;
        console.log(`?? RELOAD CLICKED: Count = ${reloadClickCount}`);
        
        // Only proceed if we have an address
        if (!address) {
          console.log("No wallet address available - can't update games count");
          return;
        }
        
        try {
          // First, get current count from Supabase
          const { data, error } = await supabase
            .from('games')
            .select('count')
            .eq('wallet_address', address.toLowerCase())
            .maybeSingle();
            
          if (error && error.code !== 'PGRST116') {
            console.error("Error fetching games count:", error);
            return;
          }
          
          // Calculate new count (start at 1 if no existing record)
          const currentCount = data?.count || 0;
          const newCount = currentCount + 1;
          
          console.log(`Updating games count: ${currentCount} ? ${newCount}`);
          
          // Use upsert for both insert and update cases
          const { error: upsertError } = await supabase
            .from('games')
            .upsert({
              wallet_address: address.toLowerCase(),
              count: newCount
            }, { onConflict: 'wallet_address' });
          
          if (upsertError) {
            console.error("Error updating games count:", upsertError);
            return;
          }
          
          console.log(`? Games count updated successfully to ${newCount}`);
          
          // Update the state to reflect the new value
          setGamesPlayed(newCount);
        } catch (error) {
          console.error("Error processing reload click:", error);
        }
      }
    };
    
    // Add event listener
    window.addEventListener('message', handleGameReload);
    
    // Clean up
    return () => window.removeEventListener('message', handleGameReload);
  }, [address, supabase, iframeRef]);

  if (providerError) {
    return (
      <div className="wallet-error">
        <h2>Wallet Connection Error</h2>
        <p>{providerError}</p>
        {window.__EDGE_FALLBACK_MODE__ ? (
          <>
            <p>Your browser (Microsoft Edge) is having issues with wallet extensions.</p>
            <div style={{display: 'flex', gap: '10px', justifyContent: 'center', margin: '20px 0'}}>
              <a href="https://www.mozilla.org/firefox/new/" target="_blank" rel="noopener noreferrer">
                <button className="browser-button">Get Firefox</button>
              </a>
              <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">
                <button className="metamask-button">Get MetaMask</button>
              </a>
            </div>
          </>
        ) : (
          <p>Please install MetaMask or a compatible wallet to use this application.</p>
        )}
        <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">
          <button className="metamask-button">Get MetaMask</button>
        </a>
      </div>
    );
  }

  // If wallet is not connected, show connect button
  if (!isConnected) {
    return (
      <>
        {isMobileView ? (
          <MobileHomePage 
            characterImg="/images/monad0.png" 
            onPlay={() => {
              console.log("Play clicked from mobile, setting showGame via state update");
              window.location.hash = 'game';
              setShowGame(true);
            }}
            onMint={() => {
              console.log("Mint clicked from mobile, showing modal via state update");
              setShowMintModal(true);
            }}
            hasMintedNft={hasMintedNft}
            isNftLoading={isNftLoading}
          />
        ) : (
          <>
        <BackgroundElements />
          <div className="home-container">
              <h1 className="game-title">JUMPNADS</h1>
            <p className="game-subtitle">Jump to the MOON! </p>
          
            {/* Character for non-connected wallet state - centered */}
            <div style={{ 
              width: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '30px 0'
            }}>
                <img 
                  src="/images/monad0.png" 
                  alt="Game Character" 
                  className="jumping-character"
                  style={{ 
                    width: '210px',
                    height: 'auto'
                  }}
                />
          </div>
          
            <div className="connect-container">
              <p className="connect-instructions">Connect your wallet to play the game!</p>
              <div className="wallet-connect">
                <ConnectButton label="CONNECT" />
            </div>
          </div>
          
          <div className="game-facts">
            <div className="fact-bubble fact-bubble-1">
           
              <p>Play & Earn!</p>
            </div>
            <div className="fact-bubble fact-bubble-2">
           
              <p>Fun Gameplay!</p>
            </div>
            <div className="fact-bubble fact-bubble-3">
   
              <p>Powered by Monad!</p>
            </div>
          </div>
        </div>
          </>
        )}
      </>
    );
  }

  // Game is ready to play, but hasn't started yet
  if (!showGame && !walletLoading) {
    return (
        <div className="container">
        <BackgroundElements />
        
          <header>
          <h1 className="title">JUMPNADS</h1>
          <p className="subtitle">Jump to the MOON!</p>
          </header>
          
        <div className="game-content">
          <div className="game-main">
          {/* Character only shown when wallet is connected */}
          {isConnected && (
          <div className="character-container">
              <div className="character-glow"></div>
            <div className="character"></div>
              <div className="shadow"></div>
              <div className="character-effect character-effect-1">?</div>
              <div className="character-effect character-effect-2">?</div>
              <div className="character-effect character-effect-3">?</div>
          </div>
          )}
          
          {/* If wallet is not connected, show centered character */}
          {!isConnected && (
            <div style={{ 
              width: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '30px 0'
            }}>
                <img 
                  src="/images/monad0.png" 
                  alt="Game Character" 
                  className="jumping-character"
                  style={{ 
                    width: '210px',
                    height: 'auto'
                  }}
                />
            </div>
          )}
          
            {isCheckingMint ? (
            <div className="loading-nft-check">
              <p>Checking NFT ownership...</p>
              <div className="loading-spinner"></div>
            </div>
            ) : hasMintedCharacter ? (
              <div 
                className={`play-button ${!username ? 'disabled-button' : ''}`} 
                onClick={username ? handlePlayClick : null}
              >
                <span className="play-text">PLAY NOW</span>
             
              </div>
            ) : (
            <button 
              className="mint-to-play-button"
              onClick={() => {
                console.log("?? MINT TO PLAY button clicked");
                // Use the onOpenMintModal prop that was passed from the parent
                onOpenMintModal();
              }}
            >
              <span className="mint-button-text">MINT TO PLAY</span>
      
            </button>
          )}
          
            <div className="stats-row">
              <HorizontalStats />
            </div>
          </div>
          
          <div className="leaderboard-column">
            <Leaderboard />
          </div>
        </div>
          
        
        </div>
    );
  }

  // Loading screen
  if (walletLoading) {
    return (
      <>
        <div className="loading-screen">
          <h2>Loading Game...</h2>
          <p style={{marginBottom: '1.5rem', color: 'rgba(255,255,255,0.7)'}}>
            Preparing your jumping adventure
          </p>
          <div className="loading-bar-container">
            <div className="loading-bar"></div>
          </div>
          <div className="loading-tips">
            <p>Tip: Collect power-ups for special abilities!</p>
          </div>
          
          {/* No button - just loading animation */}
        </div>
      </>
    );
  }

  // Game is showing
  return (
    <div className="app">
      <div className="game-container" style={{ width: '100vw', maxWidth: '100%', margin: '0', padding: '0', overflow: 'hidden', position: 'absolute', left: '0', right: '0' }}>
        {/* Wrapper div with background image */}
        <div className="iframe-background" style={{ width: '100vw', position: 'relative' }}>
          {/* Add a loading overlay that shows when iframe is loading */}
          {isLoading && (
            <div 
              className="game-loading-overlay"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.7)',
                zIndex: 10,
                padding: '20px',
                textAlign: 'center'
              }}
            >
              <h2 style={{ color: 'white', marginBottom: '20px' }}>Loading Game...</h2>
              <div 
                className="loading-spinner"
                style={{
                  width: '50px',
                  height: '50px',
                  border: '5px solid rgba(255,255,255,0.2)',
                  borderTop: '5px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}
              ></div>
              <p style={{ color: 'white', marginTop: '20px' }}>
                {getRandomTip()}
              </p>
        </div>
        )}
        
          {/* Error fallback if iframe fails to load */}
          <div 
            id="iframe-error-fallback"
            style={{
              display: 'none',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0,0,0,0.8)',
              zIndex: 5,
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              textAlign: 'center'
            }}
          >
            <h2 style={{ color: 'white', marginBottom: '20px' }}>Game Failed to Load</h2>
            <p style={{ color: 'white', marginBottom: '30px' }}>
              There was an error loading the game. Please try again.
            </p>
            <button 
              onClick={() => {
                document.getElementById('iframe-error-fallback').style.display = 'none';
                if (typeof handlePlayAgain === 'function') {
                handlePlayAgain();
                } else {
                  console.error('handlePlayAgain function not available');
                  // Fallback: Force reload the iframe
                  const newGameId = Date.now().toString();
                  forceReloadIframe(iframeRef, newGameId);
                }
              }}
              style={{
                padding: '12px 24px',
                background: '#ff5252',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Reload Game
            </button>
          </div>
          
          {/* Use the memoized game frame component */}
          <MemoizedGameFrame 
            iframeRef={iframeRef}
            gameId={gameId}
            isLoading={isLoading}
            onError={() => {
              console.error("Error loading iframe");
              document.getElementById('iframe-error-fallback').style.display = 'flex';
            }}
            onLoad={() => {
              console.log("Iframe loaded successfully");
              // Delay hiding loading screen to ensure game assets are loaded
              setTimeout(() => {
                setIsLoading(false);
              }, 1000);
            }}
          />
        </div>
      </div>
      
      {/* Simple transaction debug info */}
      <div style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        zIndex: 1000,
        display: 'none' /* Hidden by default */
      }}></div>
    </div>
  );
}

// Add this function to create an optimized game frame
function OptimizedGameFrame({ iframeRef, gameId, isLoading, onLoad, onError }) {
  // Use ref to track iframe source to avoid unnecessary re-renders
  const srcRef = useRef(`/original.html?session=${gameId}`);
  
  // Only update src ref when gameId changes
  useEffect(() => {
    srcRef.current = `/original.html?session=${gameId}`;
  }, [gameId]);
  
  return (
        <iframe 
          key={`game-${gameId}`}
          ref={iframeRef}
      src={srcRef.current}
          title="JumpNads Game"
          className="game-frame"
          allow="autoplay"
          frameBorder="0"
          tabIndex="0"
          style={{ 
            visibility: isLoading ? 'hidden' : 'visible', 
            opacity: isLoading ? 0 : 1,
              width: '100vw',
              height: '100vh',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              border: 'none'
            }}
      onError={onError}
      onLoad={onLoad}
    />
  );
}

// Memoize the OptimizedGameFrame component
const MemoizedGameFrame = React.memo(OptimizedGameFrame, 
  (prevProps, nextProps) => prevProps.gameId === nextProps.gameId && prevProps.isLoading === nextProps.isLoading
);

function App() {
  const [showMintModal, setShowMintModal] = useState(false);
  const { isConnected, address } = useAccount();
  
  // Use useReadContract instead of useContractRead for Wagmi v2
  const { 
    data: nftBalanceData,
    isLoading: isNftBalanceLoading,
    refetch: refetchNftBalance
  } = useReadContract({
    address: import.meta.env.VITE_CHARACTER_CONTRACT_ADDRESS,
    abi: [
      {
        "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }
    ],
    functionName: 'balanceOf',
    args: [address || '0x0000000000000000000000000000000000000000'],
    query: {
    enabled: isConnected && !!address,
      staleTime: 30000,
      refetchInterval: 60000,
    },
  });

  // Calculate NFT ownership status
  const hasMintedNft = useMemo(() => {
    if (!nftBalanceData) return false;
    const balanceNum = typeof nftBalanceData === 'bigint' ? 
      Number(nftBalanceData) : Number(nftBalanceData.toString() || '0');
    return balanceNum > 0;
  }, [nftBalanceData]);

  // Add an effect to refetch balance on wallet changes
  useEffect(() => {
    if (isConnected && address) {
      refetchNftBalance?.();
    }
  }, [address, isConnected, refetchNftBalance]);

  // Memoize components to prevent re-renders
  const gameComponent = useMemo(() => (
    <ErrorBoundary>
      <GameComponent 
        hasMintedNft={hasMintedNft} 
        isNftLoading={isNftBalanceLoading}
        onOpenMintModal={() => setShowMintModal(true)}
      />
    </ErrorBoundary>
  ), [hasMintedNft, isNftBalanceLoading]);

  return (
    <Web3Provider>
      {isConnected && <Navbar />}
      
      <Routes>
        <Route path="/" element={gameComponent} />
        <Route path="/admin" element={<AdminAccess />} />
      </Routes>
      <TransactionNotifications />

      {showMintModal && (
        <NFTMintModal 
          isOpen={true} 
          onClose={()=>setShowMintModal(false)} 
        />
      )}

    
    </Web3Provider>
  );
}

export default App;
