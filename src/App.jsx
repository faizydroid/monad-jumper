import React, { useState, useRef, useEffect, useCallback, useMemo, useLayoutEffect } from 'react';
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
import characterImg from '/images/monad0.png'; 
import { FaXTwitter, FaDiscord } from "react-icons/fa6";
import { monadTestnet } from './config/chains';
import { fetchGameSessionsCount, incrementGamesCount } from './utils/fetchHelpers.utils.js';
import characterABI from "./data/characterABI.json";
import { debounce } from './utils/fetchHelpers.utils.js';
import { 
  processGameOverAfterRevive, 
  registerSessionToken 
} from './utils/gameHelpers';

// GLOBAL TRANSACTION LOCK SYSTEM
// This will prevent ANY duplicate transaction attempts
if (typeof window !== 'undefined') {
  // Initialize tracking variables for scores and jumps
  window.__FORCE_SCORE_SAVE = false;
  window.__SCORE_VERIFIED = false;
  window.__LATEST_SCORE = 0;
  window.__LATEST_JUMPS = 0;
  window.__LATEST_GAME_SESSION = null;
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
        console.warn(`? GLOBAL TX BLOCKED: ${key} - Another transaction is in progress`);
        return false;
      }
      */
      
      // If this specific transaction has been sent before, block it
      // Commented out duplicate check - allowing all transactions through
      /*
      if (this.txHistory.has(key) || this.activeTransactions.has(key)) {
        console.warn(`? DUPLICATE TX BLOCKED: ${key} - Already sent`);
        return false;
      }
      */
      
      // Allow this transaction to proceed
      if (this.loggingEnabled) {
        console.log(`? ALLOWING ALL TX: ${key}`);
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
      
      // Always log transaction completions for debugging
      const isReviveCancel = key.includes('cancel_');
      if (isReviveCancel) {
        console.log(`? REVIVE CANCEL TRANSACTION COMPLETED: ${key}`);
      } else {
        console.log(`? TRANSACTION COMPLETED: ${key}`);
      }
    },
    
    // Mark a transaction as failed
    failTransaction: function(key, error) {
      this.txHistory.set(key, { status: 'failed', time: Date.now(), error });
      this.activeTransactions.delete(key);
      this.pendingLock = false;
      // Always log errors
      console.error(`? TX FAILED: ${key} - ${error}`);
    },
    
    // Reset the transaction system (use with caution)
    reset: function() {
      this.activeTransactions.clear();
      this.txHistory.clear();
      this.pendingLock = false;
      this.lastProcessTime = 0;
      if (this.loggingEnabled) {
        console.log(`?? GLOBAL TX SYSTEM RESET`);
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
        console.log(`?? Cleaned ${cleanedCount} old transactions from history`);
      }
    }
  };
  
  // Add a global transaction lock for game over specifically
  window.__GAME_OVER_PROCESSED = {
    sessionIds: new Set(),
    isProcessing: false,
    lastProcessed: null,
    processingTimeout: null,
    
    // Check if this game over has been processed
    hasProcessed: function(sessionId) {
      // If this is after a revive, don't block the transaction!
      if (window.__reviveUsedForGameId === sessionId) {
        console.log(`?? Allowing game over after revive for session: ${sessionId}`);
        // Don't reset the revive flag yet so other handlers can also detect it
        return false;
      }
      
      // First check exact match
      if (this.sessionIds.has(sessionId)) {
        console.log(`?? Found exact session ID match: ${sessionId}`);
        return true;
      }
      
      // Also check if we're currently processing ANY game over
      if (this.isProcessing && Date.now() - this.lastProcessed < 5000) {
        console.log(`?? Another game over is still processing (started ${Date.now() - this.lastProcessed}ms ago)`);
        return true;
      }
      
      // Also check close timestamps (within 3 seconds)
      if (this.lastProcessed && Date.now() - this.lastProcessed < 3000) {
        console.log(`?? Game over was processed recently (${Date.now() - this.lastProcessed}ms ago)`);
        return true;
      }
      
      return false;
    },
    
    // Mark a session as processed
    markProcessed: function(sessionId) {
      if (!sessionId) return;
      
      this.sessionIds.add(sessionId);
      this.lastProcessed = Date.now();
      this.isProcessing = true;
      
      console.log(`?? Game over for session ${sessionId} marked as processed`);
      
      // Auto-reset processing flag after 5 seconds
      clearTimeout(this.processingTimeout);
      this.processingTimeout = setTimeout(() => {
        this.isProcessing = false;
        console.log(`?? Game over processing lock auto-released after timeout`);
      }, 5000);
    },
    
    // Reset processing state
    resetProcessing: function() {
      this.isProcessing = false;
      clearTimeout(this.processingTimeout);
      console.log(`?? Game over processing lock manually released`);
    },
    
    // Reset tracking for a specific session ID
    resetSession: function(sessionId) {
      if (sessionId && this.sessionIds.has(sessionId)) {
        this.sessionIds.delete(sessionId);
        console.log(`?? Tracking reset for session: ${sessionId}`);
        return true;
      }
      return false;
    }
  };
  
  // Global variable to track the most recent game session
  window.__LATEST_GAME_SESSION = null;
  
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
        const timestampArgs = Array.from(arguments);
        if (timestampArgs.length > 0) {
          timestampArgs.unshift(`?? ${new Date().toISOString().slice(11, 19)}`);
          originalConsoleLog.apply(console, timestampArgs);
      } else {
          originalConsoleLog.apply(console, arguments);
        }
      } else {
        originalConsoleLog.apply(console, arguments);
      }
    };
  }

  // Add transaction deduplication system
  window.__GAME_OVER_DEDUPLICATION = {
    processedEvents: new Set(),
    processingSession: null,
    isLocked: false,
    
    // Check if this event is a duplicate
    isDuplicate: function(sessionId, score) {
      // If system is locked for any game over, prevent new transactions
      if (this.isLocked) {
        console.log("?? Transaction system locked - preventing duplicate transactions");
        return true;
      }
      
      // If we're currently processing this session, prevent additional transactions
      if (this.processingSession === sessionId) {
        console.log(`?? Already processing session ${sessionId} - preventing duplicate transaction`);
        return true;
      }
      
      // Generate a unique key for this transaction
      const key = `${sessionId}:${score}`;
      
      // Check if we've already processed this exact event
      if (this.processedEvents.has(key)) {
        console.log(`?? Already processed exact event - preventing duplicate transaction for ${key}`);
        return true;
      }
      
      return false;
    },
    
    // Lock the system for processing
    lock: function(sessionId, score) {
      this.isLocked = true;
      this.processingSession = sessionId;
      
      // Add this event to processed list
      const key = `${sessionId}:${score}`;
      this.processedEvents.add(key);
      
      console.log(`?? Locked transaction system for session ${sessionId}`);
      
      // Auto-unlock after 10 seconds as safety valve
      setTimeout(() => {
        if (this.isLocked && this.processingSession === sessionId) {
          this.unlock();
          console.log(`?? Forced unlock of transaction system after timeout for ${sessionId}`);
        }
      }, 10000);
      
      return true;
    },
    
    // Unlock after processing
    unlock: function() {
      this.isLocked = false;
      this.processingSession = null;
      console.log("?? Unlocked transaction system");
      return true;
    },
    
    // Clean up old processed events (call periodically)
    cleanup: function() {
      // For now, just limit the size
      if (this.processedEvents.size > 50) {
        this.processedEvents = new Set(Array.from(this.processedEvents).slice(-20));
      }
    }
  };
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
          <h2 className="bangers-font" style={{
            color: '#4CAF50', 
            marginBottom: '20px',
            fontSize: '32px',
            textShadow: '2px 2px 0 #45A049, 3px 3px 5px rgba(0,0,0,0.3)',
            letterSpacing: '1px'
          }}>NFT Minted Successfully!</h2>
          <p>Your character is now ready to play!</p>
          
          <button 
            onClick={() => {
              onClose();
              window.location.reload();
            }} 
            className="bangers-font"
            style={{
              background: 'linear-gradient(90deg, #4CAF50 0%, #45A049 100%)',
              border: 'none',
              padding: '15px 30px',
              borderRadius: '50px',
              color: 'white',
              fontSize: '22px',
              margin: '30px 0 10px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
              transition: 'all 0.3s ease',
              letterSpacing: '1px'
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
  // Change the initial jumpRank value from "..." to "Calculating"
  const [jumpRank, setJumpRank] = useState("Calculating");
  
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
      // If no address or supabase, can't fetch rank
      if (!address || !supabase || !isMountedRef.current) {
        console.log("Cannot fetch jump rank - missing dependencies");
        return;
      }
      
      // BYPASS CACHE - Always fetch fresh data from database
      // Remove the localStorage cache check entirely
      
      try {
        console.log("Fetching fresh jump rank from Supabase");
        
        // OPTIMIZED APPROACH: Get rank directly with a single SQL query
        // This query computes the rank directly on the server side
        const lowerCaseAddress = address.toLowerCase();
        const { data, error } = await supabase.rpc('get_jump_rank', { 
          user_address: lowerCaseAddress 
        });
        
        // If RPC isn't available, try the fallback approach with a direct count
        if (error && error.message && error.message.includes('function "get_jump_rank" does not exist')) {
          console.log("RPC function not available, using direct rank calculation");
          
          // Get this user's jumps first
          const { data: userJumpData } = await supabase
            .from('jumps')
            .select('count')
            .eq('wallet_address', lowerCaseAddress)
            .maybeSingle();
            
          const userJumps = userJumpData?.count || totalJumps || 0;
          
          // If user has no jumps, show as unranked
          if (!userJumps || userJumps <= 0) {
            setJumpRank("Unranked");
            return;
          }
          
          // Count how many users have more jumps than this user (faster than fetching all)
          const { count: playersAbove, error: countError } = await supabase
            .from('jumps')
            .select('wallet_address', { count: 'exact', head: true })
            .gt('count', userJumps);
            
          if (countError) {
            console.error("Error getting rank:", countError);
            return;
          }
          
          // Calculate rank (offset by 1 since counting players ABOVE)
          const rank = playersAbove + 1;
          console.log(`Jump rank calculated: ${rank}`);
          
          if (rank <= 1000) {
            setJumpRank(`#${rank}`);
          } else {
            setJumpRank("1000+");
          }
          
          // Don't cache the result - always use fresh data
          return;
        }
        
        // If we got data from RPC
        if (data) {
          const rank = data.rank;
          console.log(`Jump rank from RPC: ${rank}`);
          
          if (rank <= 0) {
            setJumpRank("Unranked");
          } else if (rank <= 1000) {
            setJumpRank(`#${rank}`);
          } else {
            setJumpRank("1000+");
          }
          
          // Don't cache the result - always use fresh data
          return;
        }
        
        // Fallback to the original comprehensive method if both other approaches fail
        console.log("Falling back to comprehensive rank calculation method");
        
        // First get this user's jump count to ensure we have it
        const { data: userJumpData, error: userJumpError } = await supabase
          .from('jumps')
          .select('count')
          .eq('wallet_address', lowerCaseAddress)
          .maybeSingle();
        
        if (userJumpError) {
          console.error("Error fetching user's jump count:", userJumpError);
        }
        
        // Get this user's current jumps count from the database or state
        const userJumps = userJumpData ? parseInt(userJumpData.count) : totalJumps || 0;
        
        // If user has no jumps, they're unranked
        if (userJumps <= 0) {
          setJumpRank("Unranked");
          return;
        }
        
        // Get jump counts for players above this user's count - much faster query!
        const { data: aboveData, error: aboveError } = await supabase
          .from('jumps')
          .select('wallet_address, count')
          .gt('count', userJumps)
          .order('count', { ascending: false });
          
        if (aboveError) {
          console.error("Error fetching players above:", aboveError);
          return;
        }
        
        // Count unique wallets above
        const uniqueWalletsAbove = new Set();
        aboveData?.forEach(item => {
          if (item.wallet_address) {
            uniqueWalletsAbove.add(item.wallet_address.toLowerCase());
          }
        });
        
        const playersAbove = uniqueWalletsAbove.size;
        const rank = playersAbove + 1; // Player's rank is count of players above + 1
        
        if (rank <= 1000) {
          setJumpRank(`#${rank}`);
        } else {
          setJumpRank("1000+");
        }
        
        // Don't cache the result - always use fresh data
      } catch (error) {
        console.error("Error calculating jump rank:", error);
        setJumpRank("Error");
      }
    }
    
    // Immediate fetch on mount and address change
    fetchJumpRank();
    
    // Setup a refresh interval to keep the rank updated
    const refreshInterval = setInterval(() => {
      fetchJumpRank();
    }, 15000); // Refresh every 15 seconds to keep data current
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [address, totalJumps, supabase]);
  
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
        console.log("Fetching accurate score rank from Supabase with game_id awareness");
        
        // Get all scores sorted by score descending, including game_id
        const { data, error } = await supabase
          .from('scores')
          .select('wallet_address, score, game_id')
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
            {leaderboard && Array.isArray(leaderboard) && address ? 
              (() => {
                // Always prefer the calculated jumpRank from fetchJumpRank function
                if (jumpRank && jumpRank !== "Calculating") {
                  return jumpRank;
                }
                
                // Otherwise show loading state
                return <span className="loading-rank">Loading...</span>;
              })() : 
              <span className="loading-rank">Loading...</span>
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
    incrementGamesPlayed,
    totalJumps,
    setTotalJumps
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
  
  // Add this dedicated function for sending game over transactions directly
  const sendGameOverTransactionDirectly = useCallback(async (score, jumpCount, gameId) => {
    if (!address || !walletClient || !publicClient) {
      console.error("Cannot send transaction - missing wallet connection");
      return false;
    }

    // CRITICAL: Check global completion tracking first
    if (!window.__COMPLETED_GAME_SESSIONS) {
      window.__COMPLETED_GAME_SESSIONS = new Set();
    }
    
    // Extract the base session ID without timestamp
    const baseSessionId = gameId.includes('_') ? gameId.split('_')[0] : gameId;
    
    // Check if this session was already processed
    if (window.__COMPLETED_GAME_SESSIONS.has(baseSessionId)) {
      console.log(`?? Session ${baseSessionId} already processed - skipping completely`);
      return true;
    }

    // Create a single shared tx ID for all systems to check
    const globalTxId = `tx_${gameId}_${Date.now()}`;
    let lockAcquired = false;
    
    // Always try to save the score, even if we can't acquire blockchain transaction lock
    try {
      // STEP 1: Save score to Supabase directly (do this regardless of lock)
      // Ensure score is a valid number
      const scoreValue = parseInt(score);
      
      if (scoreValue > 0) {
        console.log(`?? Recording score ${scoreValue} directly to database (always save scores)`);
        
        // Create unique game ID for this transaction
        const uniqueGameId = `direct_game_${gameId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        
        // Create score data object
        const scoreData = {
          wallet_address: address.toLowerCase(),
          score: scoreValue,
          game_id: uniqueGameId
        };
        
        try {
          // Direct insert to scores table
          const { error: scoreError } = await supabase
            .from('scores')
            .insert(scoreData);
            
          if (scoreError) {
            console.error("Score save error:", scoreError);
          } else {
            console.log("? Score saved successfully to database");
            
            // Update local high score if this is higher (do this even if we can't acquire lock)
            if (window.web3Context && window.web3Context.setPlayerHighScore) {
              window.web3Context.setPlayerHighScore(prevScore => {
                return Math.max(prevScore || 0, scoreValue);
              });
            }
          }
        } catch (dbError) {
          console.error("Database error when saving score:", dbError);
        }
      }
    } catch (scoreError) {
      console.error("Error in score saving process:", scoreError);
    }
    
    // CRITICAL FIX: Use shared memory for transaction locking with timestamps
    if (!window.__TX_LOCK_SYSTEM) {
      window.__TX_LOCK_SYSTEM = {
        locked: false,
        lockedAt: 0,
        currentTx: null,
        lockTransaction: function(txId) {
          if (this.locked) {
            console.log(`? Transaction already locked by ${this.currentTx} at ${new Date(this.lockedAt).toLocaleTimeString()}`);
            return false;
          }
          this.locked = true;
          this.lockedAt = Date.now();
          this.currentTx = txId;
          console.log(`?? Transaction lock acquired by ${txId} at ${new Date(this.lockedAt).toLocaleTimeString()}`);
          return true;
        },
        unlockTransaction: function() {
          const wasTx = this.currentTx;
          this.locked = false;
          this.currentTx = null;
          console.log(`?? Transaction lock released from ${wasTx} at ${new Date().toLocaleTimeString()}`);
          return true;
        },
        isLocked: function() {
          return this.locked;
        },
        // Add auto-release after timeout
        autoRelease: function(timeout = 10000) {
          setTimeout(() => {
            if (this.locked) {
              console.log(`?? Auto-releasing transaction lock after timeout`);
              this.unlockTransaction();
            }
          }, timeout);
        }
      };
    }

    // Try to acquire the transaction lock - continue with score save even if lock fails
    lockAcquired = window.__TX_LOCK_SYSTEM.lockTransaction(globalTxId);
    if (!lockAcquired) {
      console.log(`?? Cannot acquire blockchain transaction lock - will skip jump recording`);
      setTransactionPending(false);
      setShowPlayAgain(true);
      return true; // Return true to indicate score was saved, even without blockchain tx
    }

    // Set auto-release of lock
    window.__TX_LOCK_SYSTEM.autoRelease(30000);

    // CRUCIAL FIX: Check if this specific transaction has already been processed
    if (window.__PROCESSED_GAME_OVER_TXS) {
      if (window.__PROCESSED_GAME_OVER_TXS.has(globalTxId)) {
        console.log(`?? Transaction ${globalTxId} already processed - skipping duplicate`);
        window.__TX_LOCK_SYSTEM.unlockTransaction();
        return true;
      }
      window.__PROCESSED_GAME_OVER_TXS.add(globalTxId);
    } else {
      window.__PROCESSED_GAME_OVER_TXS = new Set([globalTxId]);
    }

    console.log(`?? DIRECT GAME OVER: Processing transaction with ${jumpCount} jumps and score ${score}`);
    
    try {
      // Set UI state
      setTransactionPending(true);
      
      // CRITICAL: Check for and disable transaction queue system
      if (window.__GAME_TX_QUEUE) {
        window.__GAME_TX_QUEUE.reset();
        window.__GAME_TX_QUEUE.isProcessing = true; // Block queue processing
        console.log(`?? Disabled transaction queue system to prevent duplicate transactions`);
      }
      
      // STEP 2: Send jumps transaction directly to blockchain
      if (jumpCount > 0) {
        console.log(`?? Sending DIRECT blockchain transaction for ${jumpCount} jumps`);
        
        // Use the fixed contract address
        const jumpContractAddress = '0xc9fc1784df467a22f5edbcc20625a3cf87278547';
        
        // Direct contract call with no intermediary systems
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
          args: [BigInt(jumpCount)],
          account: address,
          gas: BigInt(250000), // Slightly higher gas limit for safety
        });
        
        console.log(`?? Direct transaction sent: ${hash}`);
        
        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log(`? Direct transaction confirmed in block ${receipt.blockNumber}`);
        
        // Update database with jumps
        try {
          const { data: jumpData } = await supabase
            .from('jumps')
            .select('count')
            .eq('wallet_address', address.toLowerCase())
            .maybeSingle();
          
          const currentCount = jumpData?.count || 0;
          const newCount = currentCount + jumpCount;
          
          await supabase
            .from('jumps')
            .upsert({
              wallet_address: address.toLowerCase(),
              count: newCount
            }, { onConflict: 'wallet_address' });
          
          console.log(`? Jump count updated in database to ${newCount}`);
          
          // Update UI immediately if possible
          if (window.web3Context && window.web3Context.setTotalJumps) {
            window.web3Context.setTotalJumps(newCount);
          }
        } catch (jumpDbError) {
          console.error("Error updating jumps in database:", jumpDbError);
        }
        
        return true;
      } else {
        console.log("No jumps to record, skipping blockchain transaction");
        return true;
      }
    } catch (error) {
      console.error("? ERROR in direct transaction:", error);
      return false;
    } finally {
      // Mark this session as completed globally - this is the core fix for duplicate transactions
      if (!window.__COMPLETED_GAME_SESSIONS) {
        window.__COMPLETED_GAME_SESSIONS = new Set();
      }
      window.__COMPLETED_GAME_SESSIONS.add(baseSessionId);
      console.log(`? Session ${baseSessionId} marked as completed - preventing any future transactions`);
      
      // Only release if we acquired the lock
      if (lockAcquired && window.__TX_LOCK_SYSTEM) {
        window.__TX_LOCK_SYSTEM.unlockTransaction();
      }
      
      // Re-enable transaction queue system
      if (window.__GAME_TX_QUEUE) {
        window.__GAME_TX_QUEUE.isProcessing = false;
      }
      
      // Legacy system cleanup
      window.__GAME_OVER_BEING_PROCESSED = false;
      window.__GLOBAL_TRANSACTION_IN_PROGRESS = false;
      
      setTransactionPending(false);
      setShowPlayAgain(true);
    }
  }, [address, walletClient, publicClient, supabase]);
  
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
        // Store the game ID first
        this.gameId = gameId || this.gameId;
        // Important: Use current value not increment
        this.jumps = count;
        console.log(`?? Set queued jumps to ${count} for processing after game over`);
      },
      
      // Queue a score transaction
      queueScore: function(score, gameId) {
        if (!score || score <= 0) return;
        this.finalScore = Math.max(this.finalScore, score);
        this.gameId = gameId || this.gameId;
        console.log(`?? Queued score ${score} for processing after game over`);
      },
      
      // Process all queued transactions
      processQueue: async function(walletClient, publicClient, address, supabase) {
        // Check if we're already processing or if there's nothing to process
        // Remove the jumps check to allow scores to be saved even without jumps
        if (this.isProcessing) return false;
        
        // Skip deduplication check for revive cancellation events
        const isReviveCancel = this.gameId && this.gameId.startsWith('cancel_');
        
        // Use the deduplication system to prevent duplicate transactions (except for revive cancels)
        if (window.__GAME_OVER_DEDUPLICATION && !isReviveCancel) {
          const sessionId = this.gameId || Date.now().toString();
          // Check if this transaction is a duplicate
          if (window.__GAME_OVER_DEDUPLICATION.isDuplicate(sessionId, this.finalScore)) {
            console.log(`?? Transaction queue processing skipped - duplicate transaction detected for ${sessionId}`);
            return false;
          }
          
          // Lock the deduplication system
          window.__GAME_OVER_DEDUPLICATION.lock(sessionId, this.finalScore);
        } else if (isReviveCancel) {
          // For cancel transactions, print a special message and don't use deduplication system
          console.log(`?? Processing REVIVE CANCEL transaction with ID ${this.gameId} - bypassing deduplication checks`);
        }
        
        this.isProcessing = true;
        console.log(`?? Processing transaction queue: ${this.jumps} jumps, score: ${this.finalScore}${isReviveCancel ? ' (revive cancel)' : ''}`);
        
        try {
          // Create a unique transaction key
          const sessionId = this.gameId || Date.now().toString();
          const txKey = `game_over_${sessionId}_${address}_${this.finalScore}_${this.jumps}`;
          
          // IMPORTANT CHANGE: Force allow transaction after revive or revive cancel
          if (window.__GLOBAL_TX_SYSTEM) {
            // Force reset the lock to ensure we can send a transaction
            window.__GLOBAL_TX_SYSTEM.pendingLock = false;
            
            // For revive cancellations, do a more aggressive lock clearing
            if (isReviveCancel) {
              // Clear ALL active transactions
              window.__GLOBAL_TX_SYSTEM.activeTransactions.clear();
              console.log(`?? Full transaction lock reset for revive cancellation`);
            } else {
              // Clear any active transactions for this game ID
            const gameIdPrefix = `game_over_${sessionId}`;
            window.__GLOBAL_TX_SYSTEM.activeTransactions.forEach(key => {
              if (key.startsWith(gameIdPrefix)) {
                  console.log(`?? Clearing active transaction lock for ${key}`);
                window.__GLOBAL_TX_SYSTEM.activeTransactions.delete(key);
              }
            });
            }
            
            console.log(`?? Transaction locks cleared for processing`);
          }
          
          // ALWAYS update database with score, regardless of jump count or revive status
          if (this.finalScore > 0) {
            try {
              // Ensure score is a valid number
              const scoreValue = parseInt(this.finalScore);
              console.log(`?? Recording score ${scoreValue} in database`);
              
              // IMPORTANT: Update UI high score immediately before database operations
              // This ensures the navbar shows the new high score right away
              if (window.web3Context && window.web3Context.setPlayerHighScore) {
                window.web3Context.setPlayerHighScore(prevScore => {
                  const newHighScore = Math.max(prevScore || 0, scoreValue);
                  if (newHighScore > prevScore) {
                    console.log(`?? New high score set in UI: ${prevScore} ? ${newHighScore}`);
                  }
                  return newHighScore;
                });
              }
              
              // Also set a global variable for immediate UI feedback
              if (typeof window !== 'undefined') {
                window.__playerHighScore = Math.max(window.__playerHighScore || 0, scoreValue);
              }
              
              // Function to save the score with multiple fallback methods
              const saveScoreWithFallbacks = async () => {
                // Create score data object
                const scoreData = {
                  wallet_address: address.toLowerCase(),
                  score: scoreValue,
                  game_id: this.gameId || String(Date.now())
                };
                
                // Add session token if available
                if (window.__SECURE_GAME_TOKEN && !window.__SECURE_GAME_TOKEN.used) {
                  scoreData.session_token = window.__SECURE_GAME_TOKEN.value;
                }
                
                try {
                  // First attempt: Use upsert to handle both new entries and updates
                  console.log("Saving score using primary method (upsert)...");
                  const { error: upsertError } = await supabase
                    .from('scores')
                    .upsert(scoreData, { 
                      onConflict: 'wallet_address',
                      ignoreDuplicates: false
                    });
                  
                  if (upsertError) {
                    console.error('Primary score save failed:', upsertError);
                    
                    // Try second attempt: Direct insert
                    try {
                      console.log("Trying second method (direct insert)...");
                      const { error: insertError } = await supabase
                  .from('scores')
                        .insert(scoreData);
                      
                      if (insertError) {
                        console.error('Second score save attempt failed:', insertError);
                        
                        // Third attempt: Remove token and try again
                        try {
                          console.log("Trying third method (no token)...");
                          delete scoreData.session_token;
                          scoreData.game_id = `retry_${Date.now()}`;
                          
                          const { error: finalError } = await supabase
                            .from('scores')
                            .insert(scoreData);
                          
                          if (finalError) {
                            console.error('All score save attempts failed');
                            return false;
                } else {
                            console.log("Score saved via third method");
                            return true;
                          }
                        } catch (thirdError) {
                          console.error('Third method threw exception:', thirdError);
                          return false;
                }
              } else {
                        console.log("Score saved via second method");
                        return true;
                      }
                    } catch (secondError) {
                      console.error('Second method threw exception:', secondError);
                      return false;
                    }
                  } else {
                    console.log("Score saved via primary method");
                    return true;
                  }
                } catch (error) {
                  console.error('Score saving threw exception:', error);
                  return false;
                }
              };
              
              // First check if this wallet already has a score entry with higher score
              const { data: existingScore, error: queryError } = await supabase
                .from('scores')
                .select('score')
                .eq('wallet_address', address.toLowerCase())
                .order('score', { ascending: false })
                .limit(1)
                .single();
              
              // Only save if no existing score or new score is higher
              if (queryError || !existingScore || scoreValue > existingScore.score) {
                console.log(`Saving new high score ${scoreValue} (previous: ${existingScore?.score || 'none'})`);
                await saveScoreWithFallbacks();
              } else {
                console.log(`Score ${scoreValue} not saved - existing score ${existingScore.score} is higher`);
              }
            } catch (dbError) {
              console.error('Error in score saving process:', dbError);
            }
          }
          
          // IMPROVED: Get jump count from multiple sources to avoid missing jumps
          let effectiveJumps = this.jumps || 0;
          
          // Check if we have jumps stored in the global variables
          if (window.__PRE_REVIVE_JUMPS && window.__PRE_REVIVE_JUMPS > effectiveJumps) {
            effectiveJumps = window.__PRE_REVIVE_JUMPS;
            console.log(`?? Using jumps from pre-revive storage: ${effectiveJumps}`);
          }
          
          // Also check LATEST_JUMPS global variable
          if (window.__LATEST_JUMPS && window.__LATEST_JUMPS > effectiveJumps) {
            effectiveJumps = window.__LATEST_JUMPS;
            console.log(`?? Using jumps from latest jumps storage: ${effectiveJumps}`);
          }
          
          // If we have a score but no jumps, estimate jumps based on score
          if (this.finalScore > 100 && effectiveJumps < 5) {
            const estimatedJumps = Math.max(10, Math.floor(this.finalScore / 15));
            console.log(`?? No jumps tracked but score is ${this.finalScore} - using estimated ${estimatedJumps} jumps`);
            effectiveJumps = estimatedJumps;
          }
          
          // Save the effective jump count back to the queue
          this.jumps = effectiveJumps;
          
          // Only process blockchain transaction if there are jumps to record
          if (effectiveJumps > 0) {
            // Process the blockchain transaction
            const jumpContractAddress = '0xc9fc1784df467a22f5edbcc20625a3cf87278547';
            
            console.log(`?? Sending transaction for ${effectiveJumps} jumps to contract ${jumpContractAddress}`);
            
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
              args: [BigInt(effectiveJumps)],
              account: address,
              gas: BigInt(200000),
            });
            
            console.log(`?? Transaction sent: ${hash}`);
            
            // Wait for confirmation
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            console.log(`? Transaction confirmed in block ${receipt.blockNumber}`);
            
            // Mark transaction as completed in global system
            window.__GLOBAL_TX_SYSTEM.finishTransaction(txKey);
            
            // Also update jumps in database directly to ensure immediate UI feedback
            if (supabase && address && effectiveJumps > 0) {
              try {
                console.log(`?? Directly updating jump count in database by ${effectiveJumps} for address ${address.toLowerCase()}`);
                
                // Get current jump count
                const { data: jumpData, error: jumpError } = await supabase
                  .from('jumps')
                  .select('count')
                  .eq('wallet_address', address.toLowerCase())
                  .maybeSingle();
                
                if (!jumpError) {
                  const currentCount = jumpData?.count || 0;
                  const newCount = currentCount + effectiveJumps;
                  
                  console.log(`?? Updating jumps from ${currentCount} to ${newCount}`);
                  
                  // Create jump data with session token if available
                  const jumpUpdateData = {
                    wallet_address: address.toLowerCase(),
                    count: newCount
                  };
                  
                  // Use the secure game token for validation if available
                  if (window.__SECURE_GAME_TOKEN && !window.__SECURE_GAME_TOKEN.used) {
                    jumpUpdateData.session_token = window.__SECURE_GAME_TOKEN.value;
                  }
                  
                  // Update the jumps in Supabase
                  await supabase
                    .from('jumps')
                    .upsert(jumpUpdateData, { onConflict: 'wallet_address' });
                  
                  console.log(`?? Successfully updated jumps in database to ${newCount}`);
                  
                  // Mark token as used after the operation
                  if (window.__SECURE_GAME_TOKEN) {
                    window.__SECURE_GAME_TOKEN.used = true;
                  }
                  
                  // Update UI immediately if possible
                  if (window.web3Context && window.web3Context.setTotalJumps) {
                    window.web3Context.setTotalJumps(newCount);
                  }
                }
              } catch (dbError) {
                console.warn('Error updating jumps in database:', dbError);
              }
            }
          } else {
            console.log(`Skipping blockchain transaction - no jumps to record`);
            // Mark transaction as completed in global system even if no jumps
            window.__GLOBAL_TX_SYSTEM.finishTransaction(txKey);
          }
          
          // Reset the queue
          this.reset();
          
          return true;
        } catch (error) {
          console.error(`? Error processing transaction queue:`, error);
          this.isProcessing = false;
          return false;
        } finally {
          // Unlock the deduplication system if needed
          if (window.__GAME_OVER_DEDUPLICATION) {
            setTimeout(() => {
              window.__GAME_OVER_DEDUPLICATION.unlock();
              console.log("?? Transaction queue: Deduplication system unlocked");
            }, 5000);
          }
          
          // Always reset the processing flag
          this.isProcessing = false;
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
  
  // Fix the recordPlayerJumps function to properly save to the correct table
  const recordPlayerJumps = useCallback(async (jumpCount, gameSessionId) => {
    if (!address || !walletClient || !publicClient) return false;
    if (jumpCount <= 0) return false;
    
    console.log(`?? Recording ${jumpCount} jumps for game ${gameSessionId}`);
    
    try {
      setTransactionPending(true);
      
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
      
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'recordJumps',
        args: [BigInt(jumpCount)],
        account: address,
        gas: BigInt(200000),
      });
      
      console.log(`?? SENT: Jump transaction ${hash} for ${jumpCount} jumps`);
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`? CONFIRMED: Jump transaction in block ${receipt.blockNumber}`);
      
      // Update local total jumps count from web3Context if available
      if (web3Context && web3Context.setTotalJumps) {
        web3Context.setTotalJumps(prev => (prev || 0) + jumpCount);
      }
      
      // Save to Supabase database (correct table)
      if (supabase) {
        try {
          // First update jumps table with correct total
          const { data: jumpData, error: jumpError } = await supabase
            .from('jumps')
            .select('count')
            .eq('wallet_address', address.toLowerCase())
            .maybeSingle();
            
          if (!jumpError) {
            const currentCount = jumpData?.count || 0;
            const newCount = currentCount + jumpCount;
            
            // Create a jump data object with the session token if available
            const jumpUpdateData = {
                wallet_address: address.toLowerCase(),
                count: newCount
            };
            
            // Include session token if available
            if (window.__SECURE_GAME_TOKEN && !window.__SECURE_GAME_TOKEN.used) {
              jumpUpdateData.session_token = window.__SECURE_GAME_TOKEN.value;
            }
            
            await supabase
              .from('jumps')
              .upsert(jumpUpdateData, { onConflict: 'wallet_address' });
            
            console.log(`?? Updated jumps in database: ${currentCount} ? ${newCount}`);
            
            // Mark token as used after operation
            if (window.__SECURE_GAME_TOKEN) {
              window.__SECURE_GAME_TOKEN.used = true;
            }
          }
        } catch (dbError) {
          console.error('Error saving jumps to database:', dbError);
        }
      }
      
      return true;
    } catch (error) {
      console.error(`? ERROR: Recording jumps:`, error);
      return false;
    } finally {
      setTransactionPending(false);
    }
  }, [address, walletClient, publicClient, supabase, web3Context]);
  
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
    
    // Set a global lock that will be checked by all handlers
    window.__GLOBAL_TRANSACTION_IN_PROGRESS = true;
    
    try {
      setTransactionPending(true);
      
      console.log(`?? Processing game over: Score=${finalScore}, Jumps=${jumpCount}`);
      
      // IMPORTANT: Reset the queue first to clear any previous state
      if (window.__GAME_TX_QUEUE) {
        window.__GAME_TX_QUEUE.reset();
      }
      
      // Process all queued jumps plus any new ones from this call
      window.__GAME_TX_QUEUE.queueJumps(jumpCount, sessionId);
      window.__GAME_TX_QUEUE.queueScore(finalScore, sessionId);
      
      // Process the queue - THIS IS THE ONLY TRANSACTION WE'LL SEND
      const success = await window.__GAME_TX_QUEUE.processQueue(walletClient, publicClient, address, supabase);
      
      if (success) {
        console.log('? Successfully processed all queued transactions in a single transaction');
      } else {
        console.error('? Failed to process transaction queue - will NOT try again to avoid duplicate transactions');
      }
      
      return success;
    } catch (error) {
      console.error(`? Error recording game results:`, error);
      if (window.__GLOBAL_TX_SYSTEM) {
        window.__GLOBAL_TX_SYSTEM.failTransaction(txKey, error.message);
      }
      return false;
    } finally {
      // Clear all transaction locks
      window.__GLOBAL_TRANSACTION_IN_PROGRESS = false;
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
              
              // Get the current game session ID first for deduplication check
              const currentGameId = window.__currentGameSessionId || gameId;
              
              // NEW: First check our deduplication system
              if (window.__GAME_OVER_DEDUPLICATION && 
                  window.__GAME_OVER_DEDUPLICATION.isDuplicate(currentGameId, finalScore)) {
                console.log(`?? onGameOver: Skipping duplicate event for session ${currentGameId}`);
                setShowPlayAgain(true);
                return true; // Return success to prevent further handling
              }
              
              // GLOBAL SOLUTION: Check if another transaction is in progress
              if (window.__GLOBAL_TRANSACTION_IN_PROGRESS === true) {
                console.log(`? GLOBAL TRANSACTION LOCK ACTIVE - Skipping duplicate game over handler`);
                setShowPlayAgain(true);
                return true; // Return success to prevent further handling
              }
              
              // Lock the deduplication system for this session
              if (window.__GAME_OVER_DEDUPLICATION) {
                window.__GAME_OVER_DEDUPLICATION.lock(currentGameId, finalScore);
              }
              
              // Set global transaction lock
              window.__GLOBAL_TRANSACTION_IN_PROGRESS = true;
              
              try {
                // Update global session tracking
                window.__LATEST_GAME_SESSION = currentGameId;
                
                // CRITICAL FIX: First check if this game over has already been processed
                if (window.__GAME_OVER_PROCESSED && window.__GAME_OVER_PROCESSED.hasProcessed(currentGameId)) {
                  console.log(`?? Game over for session ${currentGameId} already processed in iframe handler - skipping duplicate`);
                  setShowPlayAgain(true);
                  return true; // Return success to avoid further processing
                }
                
                // Check if we've already processed this game over with our iframe message handler
                if (window.__gameOverTransactionSent === currentGameId) {
                  console.log('?? Transaction already sent for this game over - skipping duplicate');
                  setShowPlayAgain(true);
                  return true; // Return success to avoid further processing
                }
                
                // If after revive, don't process here - let the iframe message handler handle it
                if (window.__reviveUsedForGameId === currentGameId) {
                  console.log(`?? Game over after revive - letting iframe message handler process it`);
                  setShowPlayAgain(true);
                  return true; // Return success to avoid further processing
                }
                
                try {
                  // Mark this session as processed to prevent duplicates in the iframe handler
                  if (window.__GAME_OVER_PROCESSED) {
                    window.__GAME_OVER_PROCESSED.markProcessed(currentGameId);
                  }
                  
                // Get the jump count directly from the game's display
                const jumpCount = iframeRef.current.contentWindow.__jumpCount || 0;
                console.log('Final jump count from game:', jumpCount);

                if (typeof finalScore !== 'number') {
                  throw new Error('Invalid final score: ' + finalScore);
                }
                
                  // Set the flag to prevent duplicate transactions for this specific game
                  window.__gameOverTransactionSent = currentGameId;
                  
                  // Use our transaction queue system for bundling score and jumps
                  console.log('Using bundled transaction for score and jumps at game over');
                  const success = await recordScoreAndJumpsInOneTx(finalScore, jumpCount, currentGameId);
                
                if (success) {
                      console.log('Score and jumps saved successfully in one transaction');
                } else {
                  console.error('Failed to save score and jumps');
                }
                
                  console.log(`Game over transaction result: ${success}`);
                return success;
              } catch (error) {
                console.error('Error in game over handler:', error);
                    // Still show play again button on error
                setShowPlayAgain(true);
                return false;
                } finally {
                  // Reset processing state regardless of success or failure
                  if (window.__GAME_OVER_PROCESSED) {
                    window.__GAME_OVER_PROCESSED.resetProcessing();
                  }
                  
                  // Unlock deduplication system for this try/catch block
                  if (window.__GAME_OVER_DEDUPLICATION) {
                    setTimeout(() => {
                      window.__GAME_OVER_DEDUPLICATION.unlock();
                      console.log("?? Inner finally: Deduplication system unlocked");
                    }, 3000);
                  }
                }
              } catch (error) {
                console.error('Error in game over handler:', error);
                setShowPlayAgain(true);
                return false;
              } finally {
                // Set a timeout to release the global lock after 10 seconds
                // This ensures the lock is released even if there's an error
                setTimeout(() => {
                  window.__GLOBAL_TRANSACTION_IN_PROGRESS = false;
                  
                  // Also unlock the deduplication system here as failsafe
                  if (window.__GAME_OVER_DEDUPLICATION) {
                    window.__GAME_OVER_DEDUPLICATION.unlock();
                    window.__GAME_OVER_DEDUPLICATION.cleanup();
                    console.log("?? Outer finally: All locks released");
                  }
                  
                  console.log(`?? Released global transaction lock after timeout`);
                }, 10000);
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
    
    // Reset the jump tracker for the new game
    if (window.__JUMP_TRACKER) {
      window.__JUMP_TRACKER.reset();
      console.log("?? Jump tracker reset for new game");
    }
    
    // Reset revive purchase flag
    setRevivePurchased(false);
    console.log("?? Reset revivePurchased flag for new game");
    
    // Increment games counter in Supabase
    console.log("Explicitly incrementing games counter for new game");
    
    // ... rest of handlePlayAgain code ...
  }, []);

  // Add a state to GameComponent for games played
  const [gamesPlayed, setGamesPlayed] = useState(0);

  // Detect mobile view on component mount and window resize
  const detectMobile = () => {
    // Step 1: Check existing window flag
    if (window.__FORCE_MOBILE_VIEW__ === true) {
      return true;
    }
    
    // Step 2: Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('isMobile') === 'true') {
      return true;
    }
    
    // Step 3: Check storage
    if (localStorage.getItem('isMobileDevice') === 'true') {
      return true;
    }
    if (sessionStorage.getItem('isMobileDevice') === 'true') {
      return true;
    }
    
    // Step 4: Check for marker elements
    if (document.getElementById('__mobile_view_active__')) {
      return true;
    }
    if (document.getElementById('__force_mobile_view__')) {
      return true;
    }
    
    // Step 5: Check user agent and screen size
    const userAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const smallScreen = window.innerWidth <= 768;
    
    if (userAgent || smallScreen) {
      // Set flags to persist this detection
      window.__FORCE_MOBILE_VIEW__ = true;
      localStorage.setItem('isMobileDevice', 'true');
      sessionStorage.setItem('isMobileDevice', 'true');
      return true;
    }
    
    return false;
  };

  useEffect(() => {
    const checkMobile = () => {
      const isMobile = detectMobile();
      setIsMobileView(isMobile);
      
      if (isMobile) {
        // Update URL to include mobile parameter without reload
        const url = new URL(window.location.href);
        if (url.searchParams.get('isMobile') !== 'true') {
          url.searchParams.set('isMobile', 'true');
          window.history.replaceState({}, '', url.toString());
        }
        
        // Update viewport for mobile
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
          viewport = document.createElement('meta');
          viewport.name = 'viewport';
          document.head.appendChild(viewport);
        }
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      }
    };
    
    // Run on mount
    checkMobile();
    
    // Run on resize or orientation change
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
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
      console.log("?? BUNDLE_JUMPS received from", event.data?.source || 'unknown');
      
      const originalData = event.data.data;
      const { score, jumpCount, saveId = `game_${gameId}_${Date.now()}` } = originalData;
      
      // Skip if no jumps or if transaction already pending or global lock is active
      if (jumpCount <= 0) {
        console.log("?? Skipping BUNDLE_JUMPS - no jumps to record");
        return;
      }
      
      // Create a transaction key for this bundle
      const txKey = `jumps_${saveId}_${address}_${jumpCount}`;
      
      // Check if this transaction would be allowed by our global system
      if (!window.__GLOBAL_TX_SYSTEM || !window.__GLOBAL_TX_SYSTEM.canSendTransaction(txKey)) {
        console.log(`?? BUNDLE_JUMPS blocked by global system: ${txKey}`);
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

  // Add this function to handle game over transactions
  const handleGameOver = useCallback(async (finalScore) => {
    if (!address || !walletClient || !publicClient) return;
    
    try {
      setTransactionPending(true);
      
      // Get current jumps from tracker
      const jumpCount = window.__JUMP_TRACKER?.jumps || 0;
      const gameSessionId = window.__JUMP_TRACKER?.gameId || gameId;
      
      if (jumpCount > 0) {
        await recordPlayerJumps(jumpCount, gameSessionId);
      }
      
      // Reset jump tracker
      if (window.__JUMP_TRACKER) {
        window.__JUMP_TRACKER.reset();
      }
      
    } catch (error) {
      console.error('Error in game over handler:', error);
    } finally {
      setTransactionPending(false);
      setShowPlayAgain(true);
    }
  }, [address, walletClient, publicClient, gameId, recordPlayerJumps]);
  
  // Add this function to your component
  const handleMessageFromGame = useCallback(async (event) => {
    // Check if iframe exists and event is from our iframe
    if (!iframeRef.current) return;
    
    // For iframe messages, validate the source
    if (event.source && event.source !== iframeRef.current.contentWindow) return;
    
    if (event.data && typeof event.data === 'object') {
      if (event.data.type === 'gameOver' || event.data.type === 'GAME_OVER') {
        // Extract score from the event
        const score = event.data.score !== undefined ? event.data.score : 
                    (event.data.data && event.data.data.score !== undefined ? event.data.data.score : 0);
        
        console.log("Game over received with score:", score);
        
        // Create a guaranteed unique identifier for this transaction
        const baseSessionId = event.data.gameId || event.data.sessionId || 
                            window.__currentGameSessionId || Date.now().toString();
        
        // CRITICAL: Check global completion tracking first
        if (!window.__COMPLETED_GAME_SESSIONS) {
          window.__COMPLETED_GAME_SESSIONS = new Set();
        }
        
        // Extract clean base session ID 
        const cleanBaseId = baseSessionId.includes('_') ? baseSessionId.split('_')[0] : baseSessionId;
        
        // Check if this session was already processed
        if (window.__COMPLETED_GAME_SESSIONS.has(cleanBaseId)) {
          console.log(`?? Session ${cleanBaseId} already processed in message handler - skipping completely`);
          return;
        }
        
        const uniqueId = `direct_${baseSessionId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const globalTxId = `message_${baseSessionId}_${Date.now()}`;
        let lockAcquired = false;
        
        // Always try to save high score first, regardless of lock
        if (score > 0) {
          try {
            const scoreValue = parseInt(score);
            console.log(`?? Message handler: Saving score ${scoreValue} directly to database (priority save)`);
            
            // Create score data
            const scoreData = {
              wallet_address: address.toLowerCase(),
              score: scoreValue,
              game_id: `msg_${baseSessionId}_${Date.now()}`
            };
            
            // Direct insert to scores
            const { error } = await supabase.from('scores').insert(scoreData);
            
            if (error) {
              console.error("Error saving score from message handler:", error);
            } else {
              // Update high score in UI
              if (window.web3Context && window.web3Context.setPlayerHighScore) {
                window.web3Context.setPlayerHighScore(prevScore => {
                  return Math.max(prevScore || 0, scoreValue);
                });
              }
              console.log("? Score saved from message handler");
            }
          } catch (err) {
            console.error("Error in score saving from message handler:", err);
          }
        }
        
        // Use the new shared transaction locking system
        if (!window.__TX_LOCK_SYSTEM) {
          window.__TX_LOCK_SYSTEM = {
            locked: false,
            lockedAt: 0,
            currentTx: null,
            lockTransaction: function(txId) {
              if (this.locked) {
                console.log(`? Transaction already locked by ${this.currentTx} at ${new Date(this.lockedAt).toLocaleTimeString()}`);
                return false;
              }
              this.locked = true;
              this.lockedAt = Date.now();
              this.currentTx = txId;
              console.log(`?? Transaction lock acquired by ${txId} at ${new Date(this.lockedAt).toLocaleTimeString()}`);
              return true;
            },
            unlockTransaction: function() {
              const wasTx = this.currentTx;
              this.locked = false;
              this.currentTx = null;
              console.log(`?? Transaction lock released from ${wasTx} at ${new Date().toLocaleTimeString()}`);
              return true;
            },
            isLocked: function() {
              return this.locked;
            },
            // Add auto-release after timeout
            autoRelease: function(timeout = 10000) {
              setTimeout(() => {
                if (this.locked) {
                  console.log(`?? Auto-releasing transaction lock after timeout`);
                  this.unlockTransaction();
                }
              }, timeout);
            }
          };
        }
        
        // Try to acquire the transaction lock
        lockAcquired = window.__TX_LOCK_SYSTEM.lockTransaction(globalTxId);
        if (!lockAcquired) {
          console.log(`?? Cannot acquire transaction lock in message handler - skipping blockchain transaction only`);
          setShowPlayAgain(true);
          return;
        }
        
        // Set auto-release to prevent deadlocks
        window.__TX_LOCK_SYSTEM.autoRelease(30000);
        
        // Check if this transaction has already been processed
        if (window.__PROCESSED_GAME_OVER_TXS && window.__PROCESSED_GAME_OVER_TXS.has(globalTxId)) {
          console.log(`?? Message handler skipping duplicate transaction for ${globalTxId}`);
          window.__TX_LOCK_SYSTEM.unlockTransaction();
          return;
        }
        
        // Add to processed transactions set
        if (!window.__PROCESSED_GAME_OVER_TXS) {
          window.__PROCESSED_GAME_OVER_TXS = new Set();
        }
        window.__PROCESSED_GAME_OVER_TXS.add(globalTxId);
        
        // Get jump count from all available sources
        let jumpCount = 0;
        
        // Try all possible sources for jump count
        const jumpSources = [
          window.__jumpCount,
          window.__LATEST_JUMPS,
          event.data.jumps,
          event.data.jumpCount,
          event.data.totalJumps,
          (event.data.data && event.data.data.jumps),
          (event.data.data && event.data.data.jumpCount),
          (event.data.data && event.data.data.totalJumps)
        ];
        
        // Find highest jump count from all sources
        for (const source of jumpSources) {
          if (typeof source === 'number' && source > jumpCount) {
            jumpCount = source;
          }
        }
        
        // Use iframe jump count if available
        try {
          if (iframeRef.current && iframeRef.current.contentWindow) {
            const iframeJumps = iframeRef.current.contentWindow.__jumpCount;
            if (typeof iframeJumps === 'number' && iframeJumps > jumpCount) {
              jumpCount = iframeJumps;
            }
          }
        } catch (err) {
          console.warn("Could not access iframe jump count:", err);
        }
        
        // If we have a score but minimal jumps, estimate based on score
        if (score > 100 && jumpCount < 5) {
          const estimatedJumps = Math.max(10, Math.floor(score / 15));
          console.log(`?? Low jump count with high score: Using estimated ${estimatedJumps} jumps based on score ${score}`);
          jumpCount = estimatedJumps;
        }
        
        console.log(`?? DIRECT PROCESSING: Game over with ${jumpCount} jumps and score ${score}`);
        
        // Process using direct transaction method
        try {
          const success = await sendGameOverTransactionDirectly(score, jumpCount, uniqueId);
          
          if (success) {
            console.log("? Game over transaction succeeded with direct method");
          } else {
            console.error("? Game over transaction failed with direct method");
          }
        } catch (error) {
          console.error("Error in game over direct processing:", error);
        } finally {
          // Release transaction locks using new system
          if (lockAcquired && window.__TX_LOCK_SYSTEM) {
            window.__TX_LOCK_SYSTEM.unlockTransaction();
          }
          
          // Legacy system cleanup (for backward compatibility)
          window.__GAME_OVER_BEING_PROCESSED = false;
          window.__GLOBAL_TRANSACTION_IN_PROGRESS = false;
          
          console.log(`?? Outer finally: All locks released`);
          
          setTransactionPending(false);
          setShowPlayAgain(true);
        }
      }
      // Handle other message types...
    }
  }, [address, walletClient, publicClient, iframeRef, supabase, setGamesPlayed, parseEther, sendGameOverTransactionDirectly, setTransactionPending, setShowPlayAgain]);
  
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
      if (!event.data) return;
      
      try {
        // Handle session token messages
        if (event.data.type === 'GAME_SESSION_TOKEN' || event.data.type === 'SET_SESSION_COOKIE') {
          const token = event.data.token;
          
          // Process token logic here...
        }
        
        // Handle other message types
        if (event.data.type === 'GAME_OVER') {
          console.log('GAME OVER MESSAGE RECEIVED FROM IFRAME:', event.data);
          
          // Extract game data - be flexible about where data might be located
          const finalScore = event.data.score || 
                           (event.data.data && event.data.data.score) || 
                           0;
          
          // Get the game ID to check if it's already been processed
          const iframeGameId = event.data.gameId || 
                               (event.data.data && event.data.data.gameId) || 
                      window.__currentGameSessionId || 
                      Date.now().toString();
          
          // Extract base session ID for checking
          const baseSessionId = iframeGameId.includes('_') ? iframeGameId.split('_')[0] : iframeGameId;
          
          // CRITICAL: Check global completion tracking first
          if (!window.__COMPLETED_GAME_SESSIONS) {
            window.__COMPLETED_GAME_SESSIONS = new Set();
          }
          
          // Check if this session was already processed
          if (window.__COMPLETED_GAME_SESSIONS.has(baseSessionId)) {
            console.log(`?? Session ${baseSessionId} already processed in iframe handler - skipping completely`);
            setShowPlayAgain(true);
            return;
          }
          
          // Extract jump count from event data if available
          let jumpCount = window.__LATEST_JUMPS || 0;
          
          // Try to get jump count from the event data with different possible field names
          const possibleJumpFields = ['jumpCount', 'jumps', 'totalJumps', 'jumpsCount'];
          for (const field of possibleJumpFields) {
            const dataValue = event.data[field] || (event.data.data && event.data.data[field]);
            if (typeof dataValue === 'number' && dataValue > jumpCount) {
              jumpCount = dataValue;
              console.log(`?? Found jump count in event data field '${field}': ${jumpCount}`);
              break;
            }
          }
          
          // If we found jumps, save them globally
            if (jumpCount > 0) {
            window.__LATEST_JUMPS = jumpCount;
            console.log(`?? Processing bundled game data: ${jumpCount} jumps, final score: ${finalScore}`);
          }
          
          // Handle revive usage
          if (window.__reviveUsedForGameId) {
            try {
              console.log('Processing game over after revive...');
              // Process game over after revive
              await processGameOverAfterRevive(
                window.__reviveUsedForGameId,
                finalScore,
                jumpCount,
                walletClient,
                publicClient,
                address,
                supabase
              );
            } catch (reviveError) {
              console.error('Error processing game over after revive:', reviveError);
          } finally {
            setTransactionPending(false);
            setShowPlayAgain(true);
          }
          } else {
            // Normal game over processing via handler
            await handleGameOver(finalScore);
            
            // Mark this session as completed after normal processing
            if (!window.__COMPLETED_GAME_SESSIONS) {
              window.__COMPLETED_GAME_SESSIONS = new Set();
            }
            window.__COMPLETED_GAME_SESSIONS.add(baseSessionId);
            console.log(`? Session ${baseSessionId} marked as completed after normal game over - preventing any future transactions`);
          }
        }
      } catch (error) {
        console.error('Error handling iframe message:', error);
      }
    };
    
    window.addEventListener('message', handleIframeMessage);
    return () => {
      window.removeEventListener('message', handleIframeMessage);
    };
  }, [handleGameOver, gameId, window.__JUMP_TRACKER, sendGameOverTransactionDirectly, setTransactionPending, setShowPlayAgain]);

  // Now modify the setupGameCommands callback to avoid duplicate transactions
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
              
              // GLOBAL SOLUTION: Check if another transaction is in progress
              if (window.__GLOBAL_TRANSACTION_IN_PROGRESS === true) {
                console.log(`? GLOBAL TRANSACTION LOCK ACTIVE - Skipping duplicate game over handler`);
                setShowPlayAgain(true);
                return true; // Return success to prevent further handling
              }
              
              // Set global transaction lock
              window.__GLOBAL_TRANSACTION_IN_PROGRESS = true;
              
              try {
                // Get the current game session ID
                const currentGameId = window.__currentGameSessionId || gameId;
                
                // Update global session tracking
                window.__LATEST_GAME_SESSION = currentGameId;
                
                // CRITICAL FIX: First check if this game over has already been processed
                if (window.__GAME_OVER_PROCESSED && window.__GAME_OVER_PROCESSED.hasProcessed(currentGameId)) {
                  console.log(`?? Game over for session ${currentGameId} already processed in iframe handler - skipping duplicate`);
                  setShowPlayAgain(true);
                  return true; // Return success to avoid further processing
                }
                
                // Check if we've already processed this game over with our iframe message handler
                if (window.__gameOverTransactionSent === currentGameId) {
                  console.log('?? Transaction already sent for this game over - skipping duplicate');
                  setShowPlayAgain(true);
                  return true; // Return success to avoid further processing
                }
                
                // If after revive, don't process here - let the iframe message handler handle it
                if (window.__reviveUsedForGameId === currentGameId) {
                  console.log(`?? Game over after revive - letting iframe message handler process it`);
                  setShowPlayAgain(true);
                  return true; // Return success to avoid further processing
                }
                
                try {
                  // Mark this session as processed to prevent duplicates in the iframe handler
                  if (window.__GAME_OVER_PROCESSED) {
                    window.__GAME_OVER_PROCESSED.markProcessed(currentGameId);
                  }
                  
                  // Get the jump count directly from the game's display
                  const jumpCount = iframeRef.current.contentWindow.__jumpCount || 0;
                  console.log('Final jump count from game:', jumpCount);

                  if (typeof finalScore !== 'number') {
                    throw new Error('Invalid final score: ' + finalScore);
                  }
                  
                  // Set the flag to prevent duplicate transactions for this specific game
                  window.__gameOverTransactionSent = currentGameId;
                  
                  // Use our transaction queue system for bundling score and jumps
                  console.log('Using bundled transaction for score and jumps at game over');
                  const success = await recordScoreAndJumpsInOneTx(finalScore, jumpCount, currentGameId);
                  
                  if (success) {
                      console.log('Score and jumps saved successfully in one transaction');
                  } else {
                    console.error('Failed to save score and jumps');
                  }
                  
                  console.log(`Game over transaction result: ${success}`);
                  return success;
                } catch (error) {
                  console.error('Error in game over handler:', error);
                    // Still show play again button on error
                  setShowPlayAgain(true);
                  return false;
                } finally {
                  // Reset processing state regardless of success or failure
                  if (window.__GAME_OVER_PROCESSED) {
                    window.__GAME_OVER_PROCESSED.resetProcessing();
                  }
                }
              } catch (error) {
                console.error('Error in game over handler:', error);
                setShowPlayAgain(true);
                return false;
              } finally {
                // Set a timeout to release the global lock after 10 seconds
                // This ensures the lock is released even if there's an error
                setTimeout(() => {
                  window.__GLOBAL_TRANSACTION_IN_PROGRESS = false;
                  console.log(`?? Released global transaction lock after timeout`);
                }, 10000);
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
            console.log = function() {
              if (CURRENT_LOG_LEVEL === LOG_LEVELS.SILENT) return;
              
              // Always log errors
              if (CURRENT_LOG_LEVEL === LOG_LEVELS.ERRORS_ONLY) {
                // Check if this message contains error information
                const isError = arguments[0] && typeof arguments[0] === 'string' && 
                  IMPORTANT_PATTERNS.some(pattern => arguments[0].includes(pattern));
                
                if (isError) {
                  originalConsole.error.apply(console, arguments);
                }
                return;
              }
              
              // Log all jump related info only when verbose
              if (arguments[0] && typeof arguments[0] === 'string') {
                // Filter out frequent/noisy logs
                if (
                  arguments[0].includes('First jump on platform') || 
                  arguments[0].includes('Repeated jump') ||
                  arguments[0].includes('score popup') ||
                  arguments[0].includes('screen shake') ||
                  arguments[0].includes('PLATFORM JUMP PROCESSED')
                ) {
                  if (CURRENT_LOG_LEVEL === LOG_LEVELS.VERBOSE && LOGGING_ENABLED) {
                    originalConsole.log.apply(console, arguments);
                  }
                  return;
                }
              }
              
              // Log everything else according to current level
              if (CURRENT_LOG_LEVEL !== LOG_LEVELS.ERRORS_ONLY || LOGGING_ENABLED) {
                originalConsole.log.apply(console, arguments);
              }
            };
            
            // Also override warn - important for performance
            console.warn = function() {
              if (CURRENT_LOG_LEVEL === LOG_LEVELS.SILENT) return;
              
              if (CURRENT_LOG_LEVEL === LOG_LEVELS.ERRORS_ONLY) {
                // Only log critical warnings
                const isCritical = arguments[0] && typeof arguments[0] === 'string' && 
                  IMPORTANT_PATTERNS.some(pattern => arguments[0].includes(pattern));
                
                if (isCritical) {
                  originalConsole.warn.apply(console, arguments);
                }
                return;
              }
              
              if (CURRENT_LOG_LEVEL !== LOG_LEVELS.ERRORS_ONLY || LOGGING_ENABLED) {
                originalConsole.warn.apply(console, arguments);
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
              // Don't update if it's the same score within 5 seconds
            const now = Date.now();
            if (now - lastHighScoreUpdate < 5000 && currentHighScore === score) {
                return;
              }
              
              console.log("?? DIRECT HIGH SCORE UPDATE:", score);
              
              // CRITICAL FIX: Track revive status for improved high score handling
              const wasReviveUsed = window.__reviveUsedForGameId ? "YES" : "NO";
              console.log("?? REVIVE STATUS FOR HIGH SCORE:", wasReviveUsed);
            
            window.playerHighScore = score;
            window.highScoreSet = true;
            currentHighScore = score;
            lastHighScoreUpdate = now;
              
              // Store this in sessionStorage too, as a backup
              try {
                sessionStorage.setItem('latestHighScore', score);
                sessionStorage.setItem('wasReviveUsed', wasReviveUsed);
              } catch (err) {
                // Ignore storage errors
              }
          };
          
          // Override the game's high score retrieval system
          // to stop its own polling
          if (window.getHighScore) {
            const originalGetHighScore = window.getHighScore;
            window.getHighScore = function() {
                // IMPROVED: Check all possible sources for high score
                // 1. Direct window property
                const directHighScore = window.playerHighScore || 0;
                
                // 2. Session storage backup
                let sessionHighScore = 0;
                try {
                  sessionHighScore = parseInt(sessionStorage.getItem('latestHighScore')) || 0;
                } catch (err) {
                  // Ignore storage errors
                }
                
                // 3. Flag that identifies if revive was used for this high score
                const wasReviveUsed = window.__reviveUsedForGameId || 
                                    (sessionStorage.getItem('wasReviveUsed') === 'YES');
                
                if (wasReviveUsed) {
                  console.log("?? Using high score with revive context:", {
                    directHighScore,
                    sessionHighScore,
                    wasReviveUsed
                  });
                }
                
                // Return the highest value
                return Math.max(directHighScore, sessionHighScore);
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
            console.log = function() {
              // Filter out the high score messages
              if (arguments[0] === 'Using high score from player stats response:') {
                return; // Ignore these logs completely
              }
              return originalConsoleLog.apply(this, arguments);
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
          console.log("?? Game session started (no transaction needed):", gameId);
      }
      
        // Add handler for REVIVE_CANCELLED event
        if (event.data?.type === 'REVIVE_CANCELLED') {
          console.log("?? Revive cancelled with full data:", event.data);
          
          // Get jump count from multiple sources to ensure we have the highest value
          let jumpCount = 0;
          
          // Check various sources for jump counts
          const possibleSources = [
            event.data.jumps,
            event.data.data?.jumps,
            window.__jumpCount,
            window.__PRE_REVIVE_JUMPS,
            window.__LATEST_JUMPS
          ];
          
          // Find the highest jump count from available sources
          for (const source of possibleSources) {
            if (typeof source === 'number' && source > jumpCount) {
              jumpCount = source;
            }
          }
          
          // Try to get jumps directly from iframe as last resort
          try {
            if (iframeRef.current && iframeRef.current.contentWindow) {
              const iframeJumps = iframeRef.current.contentWindow.__jumpCount || 0;
              if (iframeJumps > jumpCount) {
                jumpCount = iframeJumps;
                console.log(`?? Using higher jump count from iframe: ${jumpCount}`);
              }
            }
          } catch (e) {
            console.warn('Could not access iframe jump count:', e);
          }
          
          // If we have a score but minimal jumps, estimate based on score
          const score = event.data.score || event.data.data?.score || 0;
          if (score > 100 && jumpCount < 5) {
            const estimatedJumps = Math.max(10, Math.floor(score / 15));
            console.log(`?? Low jumps detected with score ${score} - using estimated ${estimatedJumps} jumps`);
            jumpCount = estimatedJumps;
          }
          
          // Get game session ID from various sources
          const gameSessionId = event.data.gameId || 
                               event.data.data?.gameId || 
                               window.__currentGameSessionId || 
                               Date.now().toString();
          
          console.log(`?? Processing cancelled revive with ${jumpCount} jumps for game ${gameSessionId}, score: ${score}`);
          
          // Add a notification to the user
          const notification = document.createElement('div');
          notification.style.position = 'fixed';
          notification.style.top = '50%';
          notification.style.left = '50%';
          notification.style.transform = 'translate(-50%, -50%)';
          notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
          notification.style.color = 'white';
          notification.style.padding = '20px';
          notification.style.borderRadius = '10px';
          notification.style.zIndex = '9999';
          notification.style.textAlign = 'center';
          notification.style.maxWidth = '80%';
          notification.style.fontSize = '16px';
          notification.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
          notification.innerHTML = `
            <div style="margin-bottom: 15px; font-size: 20px; font-weight: bold;">Processing Cancelled Revive</div>
            <div style="margin-bottom: 10px;">Score: ${score} � Jumps: ${jumpCount}</div>
            <div style="margin-bottom: 15px; font-size: 14px; opacity: 0.8;">Transaction is being processed directly...</div>
            <div class="spinner" style="
              width: 40px;
              height: 40px;
              margin: 10px auto;
              border: 4px solid rgba(255, 255, 255, 0.3);
              border-top-color: white;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            "></div>
          `;
          document.body.appendChild(notification);
          
          // Reset revive purchased flag
          setRevivePurchased(false);
          
          // Save the jump count globally for other handlers
          window.__LATEST_JUMPS = jumpCount;
          
          try {
            // COMPLETELY BYPASS THE TRANSACTION QUEUE AND CALL DIRECT FUNCTION
            console.log("?? BYPASSING TRANSACTION QUEUE - using direct transaction method");
            
            // Use our dedicated direct transaction function
            const success = await sendReviveCancelTransactionDirectly(score, jumpCount, gameSessionId);
            
            if (success) {
              console.log("? Direct transaction method successful!");
            } else {
              console.error("? Direct transaction method failed");
            }
          } catch (error) {
            console.error('Error processing revive cancellation:', error);
          } finally {
            // Remove the notification
            if (notification && notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
            
            setTransactionPending(false);
            setShowPlayAgain(true);
          }
      }
      
        // Handle revive purchase request - this will also register the game if needed
      if (event.data?.type === 'PURCHASE_REVIVE') {
        console.log("?? Received revive purchase request:", event.data);
          
          // Immediately set the flag to prevent any other transactions
          setRevivePurchased(true);
          console.log("?? Setting revivePurchased=true to prevent additional transactions");
        
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
          
            // CRITICAL: Store current jumps before revive to ensure they're not lost
            let currentJumps = 0;
            try {
              if (iframeRef.current && iframeRef.current.contentWindow) {
                currentJumps = iframeRef.current.contentWindow.__jumpCount || 0;
                console.log(`?? Saving current jump count before revive: ${currentJumps}`);
                
                // Store globally for retrieval after transaction
                window.__PRE_REVIVE_JUMPS = currentJumps;
                
                // Also capture in LATEST_JUMPS which is used by some handlers
                window.__LATEST_JUMPS = currentJumps;
              }
            } catch (e) {
              console.warn('Could not access jump count in iframe:', e);
            }
          
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
              
              // Mark this game ID as having used revive for special game over handling
              window.__reviveUsedForGameId = window.__currentGameSessionId || formattedGameId;
              console.log(`? REVIVE PURCHASE: Setting revive used flag for game ID: ${formattedGameId}`);
              
              // Save the jump count to transaction queue system for later use
              if (window.__GAME_TX_QUEUE && currentJumps > 0) {
                window.__GAME_TX_QUEUE.jumps = currentJumps;
                console.log(`?? Pre-populating transaction queue with ${currentJumps} jumps for post-revive processing`);
              }
              
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
          
          console.log("? Reload button clicked - updating games count");
          
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
        
        // Add dedicated handler for normal game over
        if (event.data?.type === 'gameOver' || event.data?.type === 'GAME_OVER') {
          // Extract score and jump data, checking multiple locations
          let score = 0;
          if (typeof event.data.score === 'number') score = event.data.score;
          else if (event.data.data && typeof event.data.data.score === 'number') score = event.data.data.score;
          else if (typeof event.data.finalScore === 'number') score = event.data.finalScore;
          
          // Determine the game session ID
          const gameSessionId = event.data.gameId || 
                              event.data.data?.gameId || 
                              window.__currentGameSessionId || 
                              Date.now().toString();
          
          // CRITICAL FIX: Generate a truly unique ID with timestamp AND random component for this transaction
          const timestamp = Date.now();
          const randomSuffix = Math.floor(Math.random() * 10000);
          const uniqueId = `direct_game_${gameSessionId}_${timestamp}_${randomSuffix}`;
          
          // Force reset ALL locks and deduplication systems
          if (window.__GAME_OVER_DEDUPLICATION) {
            window.__GAME_OVER_DEDUPLICATION.unlock();
            window.__GAME_OVER_DEDUPLICATION.cleanup();
            console.log("?? Forced unlock of deduplication system");
          }
          window.__GLOBAL_TRANSACTION_IN_PROGRESS = false;
          window.__GAME_OVER_BEING_PROCESSED = false;
          if (window.__GLOBAL_TX_SYSTEM) {
            window.__GLOBAL_TX_SYSTEM.pendingLock = false;
            window.__GLOBAL_TX_SYSTEM.activeTransactions.clear();
            console.log("?? Cleared all transaction locks");
          }
          
          // Get jump count from multiple possible sources
          let jumpCount = 0;
          
          // First check the event data with different possible field names
          const jumpFields = ['jumps', 'jumpCount', 'finalJumpCount', 'totalJumps'];
          for (const field of jumpFields) {
            const fieldValue = event.data[field] || (event.data.data && event.data.data[field]);
            if (typeof fieldValue === 'number' && fieldValue > jumpCount) {
              jumpCount = fieldValue;
            }
          }
          
          // Then check global storage locations
          const globalSources = [window.__jumpCount, window.__LATEST_JUMPS, window.__PRE_REVIVE_JUMPS];
          for (const source of globalSources) {
            if (typeof source === 'number' && source > jumpCount) {
              jumpCount = source;
            }
          }
          
          // Try to get the jump count directly from the iframe
          try {
            if (iframeRef.current && iframeRef.current.contentWindow) {
              const iframeJumps = iframeRef.current.contentWindow.__jumpCount;
              if (typeof iframeJumps === 'number' && iframeJumps > jumpCount) {
                jumpCount = iframeJumps;
                console.log(`?? Found higher jump count in iframe: ${jumpCount}`);
              }
            }
          } catch (e) {
            console.warn('Error accessing iframe jump count:', e);
          }
          
          // If we have a score but minimal jumps, estimate based on score as fallback
          if (score > 100 && jumpCount < 5) {
            const estimatedJumps = Math.max(10, Math.floor(score / 15));
            console.log(`?? Low jump count with high score: Using estimated ${estimatedJumps} jumps based on score ${score}`);
            jumpCount = estimatedJumps;
          }
          
          console.log(`?? DIRECT TRANSACTION BYPASS: Processing with score ${score} and ${jumpCount} jumps for ${uniqueId}`);
          
          // Add a notification to the user
          const notification = document.createElement('div');
          notification.style.position = 'fixed';
          notification.style.top = '50%';
          notification.style.left = '50%';
          notification.style.transform = 'translate(-50%, -50%)';
          notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
          notification.style.color = 'white';
          notification.style.padding = '20px';
          notification.style.borderRadius = '10px';
          notification.style.zIndex = '9999';
          notification.style.textAlign = 'center';
          notification.style.maxWidth = '80%';
          notification.style.fontSize = '16px';
          notification.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
          notification.innerHTML = `
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Tourney:wght@500&family=Teko:wght@500&display=swap');
              
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              
              @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
              }
              
              .game-title {
                font-family: 'Press Start 2P', cursive;
                margin-bottom: 15px; 
                font-size: 20px; 
                font-weight: bold;
                color: #00FFDD;
                text-shadow: 0 0 10px #00FFDD;
                animation: pulse 1.5s infinite ease-in-out;
              }
              
              .game-stats {
                font-family: 'Teko', sans-serif;
                margin-bottom: 10px;
                font-size: 22px;
                letter-spacing: 1px;
              }
              
              .processing-text {
                font-family: 'Tourney', cursive;
                margin-bottom: 15px; 
                font-size: 14px; 
                opacity: 0.8;
                letter-spacing: 1px;
                text-shadow: 0 0 5px rgba(255,255,255,0.5);
              }
              
              .spinner {
                width: 40px;
                height: 40px;
                margin: 10px auto;
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-top-color: #00FFDD;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                box-shadow: 0 0 10px #00FFDD;
              }
            </style>
            <div class="game-title">PROCESSING GAME RESULTS</div>
            <div class="game-stats">Score: ${score}  Jumps: ${jumpCount}</div>
            <div class="processing-text">Transaction is being processed...</div>
            <div class="spinner"></div>
          `;
          document.body.appendChild(notification);
          
          // Store the jump count globally for other handlers
          window.__LATEST_JUMPS = jumpCount;
          
          try {
            setTransactionPending(true);
            
            // DIRECT TRANSACTION - BYPASS ALL QUEUES AND SYSTEMS
            
            // STEP 1: Save score to Supabase directly
            if (score > 0) {
              try {
                console.log(`?? Saving score ${score} directly to database`);
                
                // Create score object
                const scoreData = {
                  wallet_address: address.toLowerCase(),
                  score: score,
                  game_id: uniqueId
                };
                
                // Direct insert to database
                const { error: scoreError } = await supabase
                  .from('scores')
                  .insert(scoreData);
                  
                if (scoreError) {
                  console.error("Score save error:", scoreError);
                } else {
                  console.log("? Score saved to database");
                  
                  // Also update UI if higher
                  if (window.web3Context && window.web3Context.setPlayerHighScore) {
                    window.web3Context.setPlayerHighScore(prevScore => {
                      return Math.max(prevScore || 0, score);
                    });
                  }
                }
              } catch (dbError) {
                console.error("Database error:", dbError);
              }
            }
            
            // STEP 2: Send jumps transaction directly
            if (jumpCount > 0) {
              try {
                console.log(`?? Sending direct blockchain transaction for ${jumpCount} jumps`);
                
                // Use fixed contract address
                const jumpContractAddress = '0xc9fc1784df467a22f5edbcc20625a3cf87278547';
                
                // Direct contract call
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
                  args: [BigInt(jumpCount)],
                  account: address,
                  gas: BigInt(250000),
                });
                
                console.log(`?? Direct transaction sent: ${hash}`);
                
                // Wait for confirmation
                const receipt = await publicClient.waitForTransactionReceipt({ hash });
                console.log(`? Transaction confirmed in block ${receipt.blockNumber}`);
                
                // Update database with jumps
                try {
                  const { data: jumpData } = await supabase
                    .from('jumps')
                    .select('count')
                    .eq('wallet_address', address.toLowerCase())
                    .maybeSingle();
                    
                  const currentCount = jumpData?.count || 0;
                  const newCount = currentCount + jumpCount;
                  
                  await supabase
                    .from('jumps')
                    .upsert({
                      wallet_address: address.toLowerCase(),
                      count: newCount
                    }, { onConflict: 'wallet_address' });
                    
                  console.log(`? Jump count updated in database to ${newCount}`);
                  
                  // Update UI
                  if (window.web3Context && window.web3Context.setTotalJumps) {
                    window.web3Context.setTotalJumps(newCount);
                  }
                } catch (jumpDbError) {
                  console.error("Error updating jumps in database:", jumpDbError);
                }
              } catch (txError) {
                console.error("Transaction error:", txError);
              }
            }
            
            console.log(`? Game over handling complete for ${uniqueId}`);
          } catch (error) {
            console.error("Error processing game over event:", error);
          } finally {
            // Remove the notification
            if (notification && notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
            
            // Ensure we hide the loading indicator and show play again button
            setTransactionPending(false);
            setShowPlayAgain(true);
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
  }, [address, walletClient, publicClient, iframeRef, supabase, setGamesPlayed, parseEther, sendGameOverTransactionDirectly, setTransactionPending, setShowPlayAgain]);

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

  // Add this dedicated function for sending revive cancel transactions directly at the component level
  const sendReviveCancelTransactionDirectly = useCallback(async (score, jumpCount, gameId) => {
    if (!address || !walletClient || !publicClient) {
      console.error("Cannot send transaction - missing wallet connection");
      return false;
    }

    console.log(`?? DIRECT TRANSACTION: Processing revive cancel with ${jumpCount} jumps and score ${score}`);
    
    try {
      // Set UI state
      setTransactionPending(true);
      
      // STEP 1: Save score to Supabase directly
      try {
        // Ensure score is a valid number
        const scoreValue = parseInt(score);
        
        if (scoreValue > 0) {
          console.log(`?? Recording score ${scoreValue} directly to database`);
          
          // Create unique game ID for this transaction
          const uniqueGameId = `direct_cancel_${gameId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          
          // Create score data object
          const scoreData = {
            wallet_address: address.toLowerCase(),
            score: scoreValue,
            game_id: uniqueGameId
          };
          
          // Direct insert to scores table
          const { error: scoreError } = await supabase
            .from('scores')
            .insert(scoreData);
            
          if (scoreError) {
            console.error("Score save error:", scoreError);
            // Continue with jumps processing even if score save fails
          } else {
            console.log("? Score saved successfully to database");
          }
        }
      } catch (dbError) {
        console.error("Database error:", dbError);
        // Continue anyway - we'll still try to process the blockchain transaction
      }
      
      // STEP 2: Send jumps transaction directly to blockchain
      if (jumpCount > 0) {
        console.log(`?? Sending DIRECT blockchain transaction for ${jumpCount} jumps`);
        
        // Use the fixed contract address
        const jumpContractAddress = '0xc9fc1784df467a22f5edbcc20625a3cf87278547';
        
        // Direct contract call with no intermediary systems
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
          args: [BigInt(jumpCount)],
          account: address,
          gas: BigInt(250000), // Slightly higher gas limit for safety
        });
        
        console.log(`?? Direct transaction sent: ${hash}`);
        
        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log(`? Direct transaction confirmed in block ${receipt.blockNumber}`);
        
        // Update database with jumps
        try {
          const { data: jumpData } = await supabase
            .from('jumps')
            .select('count')
            .eq('wallet_address', address.toLowerCase())
            .maybeSingle();
            
          const currentCount = jumpData?.count || 0;
          const newCount = currentCount + jumpCount;
          
          await supabase
            .from('jumps')
            .upsert({
              wallet_address: address.toLowerCase(),
              count: newCount
            }, { onConflict: 'wallet_address' });
            
          console.log(`? Jump count updated in database to ${newCount}`);
          
          // Update UI immediately if possible
          if (window.web3Context && window.web3Context.setTotalJumps) {
            window.web3Context.setTotalJumps(newCount);
          }
        } catch (jumpDbError) {
          console.error("Error updating jumps in database:", jumpDbError);
        }
        
        return true;
      } else {
        console.log("No jumps to record, skipping blockchain transaction");
        return true;
      }
    } catch (error) {
      console.error("? ERROR in direct transaction:", error);
      return false;
    } finally {
      setTransactionPending(false);
      setShowPlayAgain(true);
    }
  }, [address, walletClient, publicClient, supabase]);

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
            isNftLoading={isNftBalanceLoading}
          />
        ) : (
                    <>
            <BackgroundElements />
            <div style={{
              width: '100vw',
              position: 'absolute',
              left: 0,
              top: '50px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <h1 className="title bangers-font" style={{ 
                position: 'relative',
                width: '100%',
                fontSize: '10rem',
                left: '0px',
                textAlign: 'center'
              }}>JUMPNADS</h1>
    
          
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
                    height: 'auto',
                    animation: 'float 2s ease-in-out infinite',
                    filter: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.3))',
                    transform: 'translateY(0px)'
                  }}
                />
                <div style={{
                  width: '140px',
                  height: '20px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '50%',
                  marginTop: '10px',
                  animation: 'shadow-pulse 2s ease-in-out infinite'
                }}></div>
          </div>
          
            <div className="connect-container" style={{
              background: 'linear-gradient(135deg, rgba(25, 82, 212, 0.7) 0%, rgba(91, 33, 182, 0.8) 100%)',
              borderRadius: '16px',
              padding: '30px 20px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(25, 82, 212, 0.4), inset 0 0 8px rgba(255, 255, 255, 0.1)',
              maxWidth: '500px',
              margin: '0 auto',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              {/* Animated glowing elements */}
              <div style={{
                position: 'absolute',
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(82, 179, 255, 0.4) 0%, rgba(82, 179, 255, 0) 70%)',
                top: '-30px',
                right: '-30px',
                zIndex: 0
              }}></div>
              <div style={{
                position: 'absolute',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(133, 92, 255, 0.4) 0%, rgba(133, 92, 255, 0) 70%)',
                bottom: '-20px',
                left: '-20px',
                zIndex: 0
              }}></div>
              
              <h2 style={{
                fontFamily: '"Bangers", "Press Start 2P", cursive',
                fontSize: '36px',
                color: 'white',
                textShadow: '0 2px 10px rgba(0, 140, 255, 0.9), 0 4px 4px rgba(0, 0, 0, 0.4)',
                letterSpacing: '2px',
                marginBottom: '20px',
                textAlign: 'center',
                width: '100%',
                position: 'relative',
                zIndex: 1
              }}>
                CONNECT & JUMP!
              </h2>
              
              <p className="connect-instructions" style={{
                fontFamily: '"Teko", sans-serif',
                fontSize: '22px',
                color: 'white',
                marginBottom: '25px',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                letterSpacing: '1px',
                fontWeight: '500',
                position: 'relative',
                zIndex: 1
              }}>
                Connect your wallet to play the game!
              </p>
              
              <div className="wallet-connect" style={{
                position: 'relative',
                zIndex: 1,
                transform: 'scale(1.1)',
                marginTop: '10px'
              }}>
                <ConnectButton label="CONNECT" />
            </div>
              
              <style>
                {`
                  @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Press+Start+2P&family=Teko:wght@400;500;600&display=swap');
                `}
              </style>
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
          <h1 className="title bangers-font">JUMPNADS</h1>
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
              <h2 style={{ 
                color: '#00FFDD', 
                marginBottom: '20px',
                fontFamily: '"Press Start 2P", cursive, fantasy',
                fontSize: '28px',
                textShadow: '0 0 10px #00FFFF, 0 0 20px #00FFFF',
                letterSpacing: '2px'
              }}>LOADING GAME...</h2>
              <div 
                className="loading-spinner"
                style={{
                  width: '50px',
                  height: '50px',
                  border: '5px solid rgba(255,255,255,0.2)',
                  borderTop: '5px solid #00FFDD',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  boxShadow: '0 0 15px #00FFDD'
                }}
              ></div>
              <p style={{ 
                color: '#FFFFFF', 
                marginTop: '20px',
                fontFamily: '"Tourney", "Teko", sans-serif',
                fontSize: '18px',
                fontWeight: 'bold',
                letterSpacing: '1px',
                textShadow: '0 0 8px rgba(255,255,255,0.7)',
                padding: '10px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '5px'
              }}>
                {getRandomTip()}
              </p>
              <style>
                {`
                  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Tourney:wght@500&family=Teko:wght@500&display=swap');
                  
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}
              </style>
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
            <h2 style={{ 
              color: '#FF5252', 
              marginBottom: '20px',
              fontFamily: '"Press Start 2P", cursive, fantasy',
              fontSize: '24px',
              textShadow: '0 0 10px #FF5252',
              letterSpacing: '2px'
            }}>GAME FAILED TO LOAD</h2>
            <p style={{ 
              color: 'white', 
              marginBottom: '30px',
              fontFamily: '"Tourney", sans-serif',
              fontSize: '18px',
              textShadow: '0 0 5px rgba(255,255,255,0.7)'
            }}>
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
                background: 'linear-gradient(to bottom, #ff5252, #b71c1c)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: 'pointer',
                fontFamily: '"Teko", sans-serif',
                fontWeight: 'bold',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                boxShadow: '0 0 15px rgba(255,82,82,0.5)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(255,82,82,0.7)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(255,82,82,0.5)';
              }}
            >
              RELOAD GAME
            </button>
            <style>
              {`
                @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Tourney:wght@500&family=Teko:wght@500&display=swap');
              `}
            </style>
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
  
  // Define a dummy baseSessionId to prevent reference errors
  const baseSessionId = 'dummy-session-id';
  
  // Add state for mobile view detection
  const [isMobileView, setIsMobileView] = useState(false);
  
  // Detect mobile on mount
  useEffect(() => {
    // Local debounce function implementation
    const localDebounce = (func, wait) => {
      let timeout;
      return function executedFunction() {
        const args = arguments;
        const later = () => {
          clearTimeout(timeout);
          func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    };

    const detectMobile = () => {
      // DESKTOP OVERRIDE - Check if URL explicitly requests desktop mode
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'desktop' || 
          params.get('desktop') === 'true' || 
          params.get('forceDesktop') === 'true') {
        
        console.log('DESKTOP MODE OVERRIDE DETECTED - forcefully clearing all mobile flags');
        
        // Force all mobile flags to be cleared
        window.__FORCE_MOBILE_VIEW__ = false;
        localStorage.removeItem('isMobileDevice');
        sessionStorage.removeItem('isMobileDevice');
        
        // Remove any markers in the DOM
        const mobileMarker = document.getElementById('__mobile_view_active__');
        if (mobileMarker) mobileMarker.remove();
        const forceMarker = document.getElementById('__force_mobile_view__');
        if (forceMarker) forceMarker.remove();
        
        // Return false to ensure desktop view is used
        return false;
      }
      
      // RESPONSIVE DETECTION: First check actual device capabilities and screen size
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      
      // If it's clearly a desktop device with large screen, always show desktop view
      // regardless of stored flags (fixes the issue of desktop showing mobile view)
      if (!isMobileDevice && !isSmallScreen && window.innerWidth > 1024) {
        console.log('Detected desktop device with large screen - using desktop view');
        
        // Clear any incorrect mobile flags
        window.__FORCE_MOBILE_VIEW__ = false;
        localStorage.removeItem('isMobileDevice');
        sessionStorage.removeItem('isMobileDevice');
        
        return false;
      }
      
      // For smaller screens or mobile devices, apply mobile view by default
      if (isMobileDevice || isSmallScreen) {
        console.log('Detected mobile device or small screen - using mobile view');
        return true;
      }
      
      // As a fallback, check stored flags ONLY if device detection is ambiguous
      if (window.__FORCE_MOBILE_VIEW__ === true) return true;
      if (localStorage.getItem('isMobileDevice') === 'true') return true;
      if (sessionStorage.getItem('isMobileDevice') === 'true') return true;
      if (new URLSearchParams(window.location.search).get('isMobile') === 'true') return true;
      if (document.getElementById('__mobile_view_active__')) return true;
      if (document.getElementById('__force_mobile_view__')) return true;
      
      // Default to desktop view if nothing matched
      return false;
    };
    
    const isMobile = detectMobile();
    console.log("?? App.jsx - Mobile detection result:", isMobile);
    setIsMobileView(isMobile);
    
    // Set up resize listener to handle orientation change and window resizing
    const handleResize = localDebounce(() => {
      const updatedIsMobile = detectMobile();
      if (updatedIsMobile !== isMobileView) {
        console.log("Screen size changed, updating view mode to:", updatedIsMobile ? "mobile" : "desktop");
        setIsMobileView(updatedIsMobile);
      }
    }, 300);
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [isMobileView]);
  
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

  // Handle play game action for mobile view
  const handlePlayGame = useCallback(() => {
    window.location.href = '#game';
  }, []);
  
  // Handle mint action for mobile view
  const handleMintNow = useCallback(() => {
    setShowMintModal(true);
  }, []);

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

  // If we're in mobile view, render the MobileHomePage
  if (isMobileView) {
    console.log("?? Rendering MobileHomePage");
    return (
      <Web3Provider>
        <MobileHomePage
          characterImg="/images/monad0.png"
          onPlay={handlePlayGame}
          onMint={handleMintNow}
          hasMintedNft={hasMintedNft}
          isNftLoading={isNftBalanceLoading}
        />
        
        {showMintModal && (
          <NFTMintModal 
            isOpen={true} 
            onClose={()=>setShowMintModal(false)} 
          />
        )}
      </Web3Provider>
    );
  }

  // Use useLocation to check the current path
  const location = useLocation();
  const isAdminPage = location.pathname.includes('/admin');

  // Otherwise, render the normal desktop view
  return (
    <Web3Provider>
      {isConnected && !isAdminPage && <Navbar />}
      
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
