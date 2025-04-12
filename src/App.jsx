import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Web3Provider, useWeb3 } from './contexts/Web3Context';
import { ConnectButton, useConnectModal, RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit';
import { useAccount, usePublicClient, useWalletClient, useConnect, useDisconnect, useContractRead } from 'wagmi';
import './App.css';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AdminDashboard from './components/AdminDashboard';
import './components/AdminDashboard.css';
import Navbar from './components/Navbar';
import PlayerStats from './components/PlayerStats';
import Leaderboard from './components/Leaderboard';
import GameCards from './components/GameCards';
import TransactionNotifications from './components/TransactionNotifications';
import { setupGameCommands } from './utils/gameCommands';
import AdminAccess from './components/AdminAccess';
import GameNavbar from './components/GameNavbar';
import { ethers } from 'ethers';
import AbsoluteModal from './components/AbsoluteModal';
import SimpleModal from './components/SimpleModal';
import { encodeFunctionData, parseEther } from 'viem';
import CartoonPopup from './components/CartoonPopup';
import { createClient } from '@supabase/supabase-js';
import ErrorBoundary from './components/ErrorBoundary';
import { 
  injectedWallet,
  rainbowWallet,
  metaMaskWallet, 
  trustWallet,
  coinbaseWallet,
  walletConnectWallet
} from '@rainbow-me/rainbowkit/wallets';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { createConfig } from 'wagmi';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { createPublicClient, http } from 'viem';
import MobileHomePage from './components/MobileHomePage';
import characterImg from '/images/monad0.png'; // correct path with leading slash for public directory
import { FaXTwitter, FaDiscord } from "react-icons/fa6";
import { monadTestnet } from './config/chains';

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

// Background animations component
function BackgroundElements() {
  const [elements, setElements] = useState([]);
  
  useEffect(() => {
    // Generate random platforms, clouds and sparkles
    const platforms = Array.from({ length: 8 }, (_, i) => {
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
          animation: `float ${10 + Math.random() * 10}s infinite ease-in-out`,
          zIndex: '-1'
        }
      };
    });
    
    const clouds = [
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
    
    const sparkles = Array.from({ length: 15 }, (_, i) => {
      const size = Math.random() * 10 + 5;
      const delay = Math.random() * 5;
      const duration = Math.random() * 3 + 2;
      
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
          animation: `sparkle ${duration}s infinite ease-in-out ${delay}s`,
          boxShadow: '0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 255, 255, 0.5)',
          zIndex: '-1'
        }
      };
    });
    
    setElements([...platforms, ...clouds, ...sparkles]);
  }, []);
  
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
}

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
`;

// Update the NFTMintModal component with better transaction handling
const NFTMintModal = ({ isOpen, onClose }) => {
  const [isMinting, setIsMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [error, setError] = useState(null);
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  
  const handleMint = async () => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }
    
    if (!walletClient) {
      setError("Wallet client not initialized. Please refresh and try again.");
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
      
      // Use wagmi's walletClient and publicClient instead of ethers
      const hash = await walletClient.writeContract({
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
        account: address
      });
      
      console.log("Mint transaction sent:", hash);
      
      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log("NFT minted successfully!");
      
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
          <div style={{fontSize: '64px', margin: '20px 0'}}>🎉</div>
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
        <p>Mint your unique Monad Jumper character NFT to play the game!</p>
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
  newIframe.title = 'Monad Jumper Game';
  
  // Create a URL with a timestamp and session ID to prevent caching
  const url = new URL('/original.html', window.location.origin);
  url.searchParams.set('session', newGameId);
  url.searchParams.set('nocache', Math.random().toString(36).substring(2));
  newIframe.src = url.toString();
  
  console.log(`📢 Creating BRAND NEW iframe with URL: ${url.toString()}`);
  
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
  const { playerHighScore, totalJumps, username, setUserUsername, fetchPlayerStats, fetchJumps, leaderboard } = useWeb3();
  const { isConnected, address } = useAccount();
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  console.log("HorizontalStats render - Connected:", isConnected, "Address:", address, "Username:", username, 
    "Score:", playerHighScore, typeof playerHighScore, "Jumps:", totalJumps);
  
  // Get player rank from leaderboard
  const getPlayerRank = () => {
    if (!address || !leaderboard || leaderboard.length === 0) return "N/A";
    
    // Find player's position in leaderboard
    const playerAddress = address.toLowerCase();
    const playerIndex = leaderboard.findIndex(entry => entry.address.toLowerCase() === playerAddress);
    
    // If player is in top 10
    if (playerIndex >= 0) {
      return `#${playerIndex + 1}`;
    }
    
    // If player is not in top 10 but has a score
    if (playerHighScore > 0) {
      return "10+";
    }
    
    return "N/A";
  };
  
  // Fetch player stats when component mounts or address changes
  useEffect(() => {
    if (isConnected && address) {
      console.log("Fetching updated player stats");
      fetchPlayerStats();
      fetchJumps(address);
    }
  }, [isConnected, address, fetchPlayerStats, fetchJumps]);
  
  // Log when playerHighScore changes
  useEffect(() => {
    console.log("Player high score changed:", playerHighScore, typeof playerHighScore);
  }, [playerHighScore]);
  
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
  
  if (!isConnected || !address) {
    return (
      <div className="stats-card-horizontal">
        <div className="card-badge">STATS</div>
        <div className="stats-info">
          <h3 className="greeting-title">Ready to break the monad?</h3>
          <p className="greeting-message">Connect your wallet to start jumping! 🚀</p>
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
          <h3 className="greeting-title">Welcome to Monad Jumper!</h3>
          <p className="greeting-message">Please set a username to play</p>
        </div>
        
        <form onSubmit={handleSubmitUsername} className="username-form">
          {usernameError && <div className="error-message">{usernameError}</div>}
          {showSuccess && <div className="success-message">Username set successfully! Let's play! 🎮</div>}
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
      
      <div className="stats-info">
        <h3 className="greeting-title">Hi there, {username}!</h3>
        <p className="greeting-message">Ready to break the monad?</p>
      </div>
      
      <div className="stats-grid-horizontal">
        <div className="stat-item-horizontal">
          <div className="stat-label">Hi-Score</div>
          <div className="stat-value">{playerHighScore !== undefined ? Number(playerHighScore).toLocaleString() : '0'}</div>
        </div>
        
        <div className="stat-item-horizontal">
          <div className="stat-label">Total Jumps</div>
          <div className="stat-value">{totalJumps !== undefined ? Number(totalJumps).toLocaleString() : '0'}</div>
        </div>
        
        <div className="stat-item-horizontal">
          <div className="stat-label">Level</div>
          <div className="stat-value">{Math.max(1, Math.floor(Number(playerHighScore || 0) / 100))}</div>
        </div>
        
        <div className="stat-item-horizontal">
          <div className="stat-label">Rank</div>
          <div className="stat-value">{getPlayerRank()}</div>
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
  // Update the web3Context reference to prevent maximum stack size errors
  const web3Context = React.useMemo(() => {
    try {
      // Only access the Web3Context inside a try/catch to prevent errors
      if (window.__hasAccessedWeb3Context) {
        console.log("Already accessed Web3Context, using cached data");
        return window.__cachedWeb3Context || {};
      }
      
      window.__hasAccessedWeb3Context = true;
      const context = useWeb3();
      window.__cachedWeb3Context = {...context};
      return context;
    } catch (error) {
      console.error("Error accessing Web3Context:", error);
      return {}; // Return empty object to prevent errors
    }
  }, []);
  
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
    leaderboard
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
  
  // Add this hook near your other hook declarations
  const { openConnectModal } = useConnectModal();
  
  // Add this after the state declarations in the GameComponent function 
  const [mintModalRequested, setMintModalRequested] = useState(false);
  
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
            console.log("❌ No wallet connected");
            setUsername(null);
            return;
        }
        
        try {
            console.log("🔍 Checking username for wallet:", address);
            
            // Force clear any previous username first 
            setUsername(null);
            
            // Get username from Supabase
            const { data, error } = await supabase
                .from('users')
                .select('username')
                .eq('wallet_address', address.toLowerCase())
                .maybeSingle();
            
            console.log("📊 Supabase response:", { data, error });
            
            if (data?.username) {
                console.log("✅ Found username:", data.username);
                setUsername(data.username);
                setShowModal(false); // Hide modal when username exists
    } else {
                console.log("❌ No username found for current wallet - username input form will be shown");
                setUsername(null);
                setShowModal(true);
            }
        } catch (error) {
            console.error("🔴 Error checking username:", error);
            setUsername(null);
        }
    };

    // Run username check when wallet connects or changes
    if (isConnected) {
        checkUsername();
    }
}, [isConnected, address]);

  // Add a separate effect specifically for game initialization
  // This separates it from other effects that might trigger too early
  useEffect(() => {
    if (!showGame || isLoading) {
      console.log("Game not ready yet - waiting for loading to complete");
      return;
    }
    
    const initializeGameTimer = setTimeout(() => {
      if (!iframeRef.current) {
        console.error("Iframe reference still null after load");
        return;
      }
      
      try {
        const effectiveProvider = provider || fallbackProvider;
        
        if (address && iframeRef.current) {
          const commands = setupGameCommands(iframeRef.current, {
            provider: effectiveProvider,
            account: address,
            contract,
            onScoreUpdate: (score) => {
              console.log('Score update handler called with:', score);
              setGameScore(score);
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
                
                // Mark transaction as pending before sending
                setTransactionPending(true);
                
                // Bundle all jumps into one transaction
                console.log('Sending bundled transaction with jumps:', jumpCount, 'score:', finalScore);
                const success = await updateScore(finalScore, jumpCount);
                
                if (success) {
                  console.log('Score and jumps saved successfully');
                  // Show play again button after successful save
                  setShowPlayAgain(true);
                } else {
                  console.error('Failed to save score and jumps');
                  // Show play again even on failed transaction to let the user try again
                  setShowPlayAgain(true);
                }
                
                // Mark transaction as complete regardless of success
                setTransactionPending(false);
                return success;
              } catch (error) {
                console.error('Error in game over handler:', error);
                // Mark transaction as complete on error
                setTransactionPending(false);
                // Still show play again button
                setShowPlayAgain(true);
                return false;
              }
            },
            // Replace the existing onJump handler with this one:
            onJump: async (platformType) => {
              console.log('Jump handler called with platform type:', platformType);
              
              try {
                // Increment the local jump counter
                window.__jumpCount = (window.__jumpCount || 0) + 1;
                console.log('Updated local jump count:', window.__jumpCount);
                
                // Note: We're not calling recordJump here anymore
                // Instead, we're just tracking jumps locally and will bundle at game over
                
                return true; // Always return true to keep the game going
              } catch (error) {
                console.error('Error in jump handler:', error);
                return true; // Return true even on error to keep the game going
              }
            }
          });
        }
      } catch (error) {
        console.error("Error setting up game commands:", error);
      }
    }, 1000);
    
    return () => clearTimeout(initializeGameTimer);
  }, [showGame, isLoading, provider, fallbackProvider, contract, address, updateScore]);

  useEffect(() => {
    if (showGame) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 2000); // Show loading for 2 seconds
      return () => clearTimeout(timer);
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
    
    try {
      // Clear cache on each wallet change instead of using it
      // This ensures we always get fresh data
      console.log('Checking NFT ownership on contract...');
      const nftAddress = import.meta.env.VITE_CHARACTER_CONTRACT_ADDRESS;
      
      // Check if user has minted using the contract's function
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
      
      console.log('Contract says wallet has minted:', hasMinted);
      return hasMinted;
    } catch (error) {
      console.error('Error checking NFT ownership:', error);
      return false;
    }
  }, [publicClient]);

  // Find and replace the useEffect that calls checkMintStatus
  // with an optimized version that only runs when address changes
  useEffect(() => {
    // Only run this effect when we have an address and are connected
    if (address && isConnected) {
      // Use a ref to track if this is the first run for this address
      const addressKey = `nft_check_${address.toLowerCase()}`;
      
      if (!window.__checkedAddresses) {
        window.__checkedAddresses = new Set();
      }
      
      // Only check if we haven't checked this address before
      if (!window.__checkedAddresses.has(addressKey)) {
        window.__checkedAddresses.add(addressKey);
        
        console.log('Checking NFT for newly connected address:', address);
        
        // Set loading state
        setIsCheckingMint(true);
        
        // Run the check and update state
        checkMintStatus(address)
          .then(result => {
            console.log('Final NFT ownership result:', result);
            setHasMintedCharacter(result);
          })
          .catch(err => {
            console.error('NFT check failed:', err);
            setHasMintedCharacter(false);
          })
          .finally(() => {
            setIsCheckingMint(false);
          });
      }
    }
  }, [address, isConnected, checkMintStatus]); // Only run when address or connection status changes

  // Update the wallet connection status effect
  useEffect(() => {
    // Clear NFT status when wallet changes/disconnects  
    if (!isConnected || !address) {
      setHasMintedCharacter(false);
      setIsCheckingMint(false);
      return;
    }
    
    // Always check when address changes - remove the cached address check
    console.log('Checking NFT for wallet:', address);
    setIsCheckingMint(true);
    
    // Get from props first if available
    if (hasMintedNft !== undefined) {
      console.log('Using NFT status from props:', hasMintedNft);
      setHasMintedCharacter(hasMintedNft);
      setIsCheckingMint(false);
      return;
    }
    
    // Otherwise check the contract directly
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
      });
  }, [address, isConnected, hasMintedNft]);

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

  // Update the handlePlayAgain function to reset the game session
  const handlePlayAgain = useCallback(() => {
    console.log("🔄 Play Again clicked");
    
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
    console.log("📢 Created new game session ID:", newGameId);
    
    // Store in session storage
    try {
      sessionStorage.setItem('current_game_session', newGameId);
    } catch (e) {
      console.warn("Could not store game session in sessionStorage:", e);
    }
    
    // Force iframe reload - use the existing function
    const newIframe = forceReloadIframe(iframeRef, newGameId);
    
    // Pass session ID to iframe after a short delay to ensure it's loaded
    setTimeout(() => {
      if (newIframe && newIframe.contentWindow) {
        newIframe.contentWindow.postMessage({
          type: 'GAME_SESSION_ID',
          sessionId: newGameId
        }, '*');
        console.log("📢 Sent session ID to reloaded iframe:", newGameId);
      }
    }, 1000);
    
    console.log("🎮 Game reset complete with new session ID:", newGameId);
  }, [setGameScore]);

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
    
    // Reset play button animation after a delay
    setTimeout(() => {
      if (playButton) {
        playButton.classList.remove('play-button-clicked');
      }
    }, 500);
  }, [username, setGameScore]);

  // Modify the game message handler to support transactions at game over
  useEffect(() => {
    const handleGameMessages = async (event) => {
      // Check for bundled jumps message for blockchain transaction
      if (event.data?.type === 'BUNDLE_JUMPS' && event.data.data) {
        // Use a specific format for the saveId to avoid duplicates
        const originalData = event.data.data;
        
        // Ensure we have a saveId and it's unique for this game session
        if (!originalData.saveId) {
          originalData.saveId = `game_${gameId}_${Date.now()}`;
          console.log(`Added missing saveId to BUNDLE_JUMPS: ${originalData.saveId}`);
        }
        
        const { score, jumpCount, saveId } = originalData;
        console.log(`🎮 Bundle request received:`, originalData);
        
        if (jumpCount > 0) {
          console.log(`🎮 Bundle includes score: ${score}`);
          
          // Ensure address and walletClient are available
          if (!address || !walletClient) {
            console.error("Wallet not connected or client not available for transaction.");
            return;
          }
          
          try {
            // Set transaction as pending
            setTransactionPending(true);
            
            const contractAddress = '0xc9fc1784df467a22f5edbcc20625a3cf87278547'; // Use the correct contract address
            
            // Define ABI in the correct JSON format
              const contractAbi = [
              {
                "inputs": [
                  {
                    "internalType": "uint256",
                    "name": "_jumps",
                    "type": "uint256"
                  }
                ],
                "name": "recordJumps",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
              }
            ];
            
            console.log("Wagmi transaction preparation:", {
                contractAddress,
              account: address,
                jumpCount
              });
              
            // Submit the transaction using walletClient
            const hash = await walletClient.writeContract({
              address: contractAddress,
              abi: contractAbi,
              functionName: 'recordJumps',
              args: [BigInt(jumpCount)],
              account: address,
            });
              
            console.log("Transaction submitted via wagmi:", hash);
            
            // Wait for confirmation using publicClient
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
              console.log("Transaction confirmed in block:", receipt.blockNumber);
              
              // Complete handling
              setTransactionPending(false);
              setShowPlayAgain(true);
        } catch (error) {
            console.error('Transaction error:', error);
            setTransactionPending(false);
            setShowPlayAgain(true);
          }
        } else {
          console.log('No jumps to record, skipping transaction');
          setShowPlayAgain(true);
        }
      }
    };
    
    window.addEventListener('message', handleGameMessages);
    return () => window.removeEventListener('message', handleGameMessages);
  }, [address, walletClient, publicClient, setTransactionPending, setShowPlayAgain, gameId]);

  // Add a function to handle game over transactions
  const handleGameOver = useCallback(async (score) => {
    if (!address || !walletClient) return;
    
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
    if (event.data && typeof event.data === 'object') {
      if (event.data.type === 'gameOver') {
        const { score } = event.data;
        console.log("Game over received with score:", score);
        handleGameOver(score);
      }
      // Handle other message types...
    }
  }, [handleGameOver]);
  
  // Update your event listener useEffect
  useEffect(() => {
    window.addEventListener('message', handleMessageFromGame);
    return () => {
      window.removeEventListener('message', handleMessageFromGame);
    };
  }, [handleMessageFromGame]);

  // In your useEffect where you listen for messages from the iframe
  useEffect(() => {
    const handleIframeMessage = (event) => {
      // Validate message origin if needed
      // if (event.origin !== expectedOrigin) return;
      
      const data = event.data;
      
      if (data && typeof data === 'object') {
        if (data.type === 'gameOver') {
          console.log('Game Over with score:', data.score);
          // Call the handler from props or context
          onGameOver && onGameOver(data.score);
        }
        // Handle other message types...
      }
    };
    
    window.addEventListener('message', handleIframeMessage);
    return () => {
      window.removeEventListener('message', handleIframeMessage);
    };
  }, [onGameOver]);

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
      // Show play button after 1.5 seconds 
      const timer = setTimeout(() => {
        setShowPlayButton(true);
      }, 1500);
      
      return () => {
        clearTimeout(timer);
      }
    } else {
      // Reset loading state when returning to home
      setIsLoading(false);
      setShowPlayButton(false);
    }
  }, [showGame]);

  // Add game session initialization to GameComponent
  useEffect(() => {
    // Generate a unique session ID for this game instance
    const newGameId = Date.now().toString();
    window.__currentGameSessionId = newGameId;
    console.log("📢 Created new game session ID:", newGameId);
    
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
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: 'GAME_SESSION_ID',
          sessionId: newGameId
        }, '*');
        console.log("📢 Sent session ID to iframe:", newGameId);
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
              <h1 className="game-title">MONAD JUMPER</h1>
            <p className="game-subtitle">Jump to the MOON! </p>
          
            <div className="character-container animated">
                <img 
                  src="/images/monad0.png" 
                  alt="Game Character" 
                  className="character" 
                />
              <div className="shadow"></div>
          </div>
          
            <div className="connect-container">
              <p className="connect-instructions">Connect your wallet to play the game!</p>
              <div className="wallet-connect">
                <ConnectButton label="CONNECT" />
            </div>
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

  // Game is ready to play, but hasn't started yet
  if (!showGame && !walletLoading) {
    return (
        <div className="container">
        <BackgroundElements />
        
          <header>
          <h1 className="title">MONAD JUMPER</h1>
          <p className="subtitle">Jump to the MOON! 🚀</p>
          </header>
          
        <div className="game-content">
          <div className="game-main">
          <div className="character-container">
              <div className="character-glow"></div>
            <div className="character"></div>
              <div className="shadow"></div>
              <div className="character-effect character-effect-1">⭐</div>
              <div className="character-effect character-effect-2">↑</div>
              <div className="character-effect character-effect-3">⚡</div>
          </div>
          
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
                <span className="play-icon">▶</span>
              </div>
            ) : (
            <button 
              className="mint-to-play-button"
              onClick={() => {
                console.log("🔴 MINT TO PLAY button clicked");
                // Use the onOpenMintModal prop that was passed from the parent
                onOpenMintModal();
              }}
            >
              <span className="mint-button-text">MINT TO PLAY</span>
              <span className="mint-button-icon">🪙</span>
            </button>
          )}
          
            <div className="stats-row">
              <HorizontalStats />
            </div>
            
            <GameCards />
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
          
          {/* Play button for loading screen - only show after delay */}
          {showPlayButton && (
            <button 
              id="playButton" 
              className="start-game-button"
              onClick={() => {
                // Hide loading screen completely when button is clicked
                setIsLoading(false);
                
                // Make sure iframe is fully visible
                const iframe = iframeRef.current;
                if (iframe) {
                  iframe.style.visibility = 'visible';
                  iframe.style.opacity = '1';
                  iframe.focus(); // Focus the iframe for immediate keyboard input
                }
              }}
            >
              PLAY!
            </button>
          )}
        </div>
      </>
    );
  }

  // Game is showing
  return (
    <div className="app">
      {/* Game loading screen - only show when both showGame and isLoading are true */}
        {isLoading && showGame && (
        <div className="loading-screen game-begin-screen">
          <h1 className="game-title">Monad Jumper</h1>
          <div className="character-container">
            <div className="character"></div>
            <div className="shadow"></div>
          </div>
            <div className="loading-bar-container">
              <div className="loading-bar"></div>
            </div>
          <div className="loading-tips">
            <p>{getRandomTip()}</p>
            </div>
          
          {/* Play button for loading screen - only show after delay */}
          {showPlayButton && (
            <button 
              id="playButton" 
              className="start-game-button"
              onClick={() => {
                // Hide loading screen completely when button is clicked
                setIsLoading(false);
                
                // Make sure iframe is fully visible
                const iframe = iframeRef.current;
                if (iframe) {
                  iframe.style.visibility = 'visible';
                  iframe.style.opacity = '1';
                  iframe.focus(); // Focus the iframe for immediate keyboard input
                }
              }}
            >
              PLAY!
            </button>
          )}
          
          <div className="loading-particles">
            {[...Array(20)].map((_, i) => (
              <div 
                key={i} 
                className="loading-particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random() * 3}s`
                }}
              ></div>
            ))}
            </div>
          </div>
        )}
        
      <div className="game-container">
        {/* Remove the separate start screen that shows the Play button */}
        
        {/* Wrapper div with background image */}
        <div className="iframe-background">
          {/* Always render the iframe but control visibility */}
        <iframe 
          key={`game-${gameId}`}
          ref={iframeRef}
          src={`/original.html?session=${gameId}`}
          title="Monad Jumper Game"
          className="game-frame"
          allow="autoplay"
          frameBorder="0"
          tabIndex="0"
          style={{ 
            visibility: isLoading ? 'hidden' : 'visible', 
            opacity: isLoading ? 0 : 1,
            width: '100%',
            height: '100%'
          }}
        ></iframe>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [showMintModal, setShowMintModal] = useState(false);
  const { isConnected, address } = useAccount();
  const { 
    data: nftBalanceData,
    isLoading: isNftBalanceLoading,
    refetch: refetchNftBalance
  } = useContractRead({
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
    enabled: isConnected && !!address,
    watch: true, // Add this to continuously watch for changes
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
      refetchNftBalance();
    }
  }, [address, isConnected, refetchNftBalance]);

  return (
    <Web3Provider>
      {isConnected && <Navbar />}
      
      <Routes>
        <Route path="/" element={
          <ErrorBoundary>
            <GameComponent 
              hasMintedNft={hasMintedNft} 
              isNftLoading={isNftBalanceLoading}
              onOpenMintModal={() => setShowMintModal(true)}
            />
          </ErrorBoundary>
        } />
        <Route path="/admin" element={<AdminAccess />} />
      </Routes>
      <TransactionNotifications />

      {showMintModal && (
        <NFTMintModal 
          isOpen={true} 
          onClose={()=>setShowMintModal(false)} 
        />
      )}

      <div className="social-links">
        <a href="https://x.com/Monadjumper" target="_blank" rel="noopener noreferrer" aria-label="Follow us on X">
          <FaXTwitter size={24} /> 
        </a>
        <a href="https://discord.gg/AxYUSmQw" target="_blank" rel="noopener noreferrer" aria-label="Join our Discord">
          <FaDiscord size={24} />
        </a>
      </div>
    </Web3Provider>
  );
}

export default App;