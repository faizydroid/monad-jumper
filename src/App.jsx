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

// Update the NFTMintModal component to use wagmi hooks
const NFTMintModal = ({ isOpen, onClose }) => {
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState(null);
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  
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
      
      console.log("Sending mint transaction with 1 MON...");
      
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
        value: parseEther("1.0")
      });
      
      console.log("Mint transaction sent:", hash);
      
      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log("NFT minted successfully!");
      
      // Close modal after successful mint
      onClose();
      
      // Refresh the page to update NFT status
      window.location.reload();
    } catch (err) {
      console.error("Mint error:", err);
      
      if (err.message?.includes("insufficient funds")) {
        setError("You need 1 MON to mint this NFT");
      } else if (err.message?.includes("Already minted")) {
        setError("You've already minted an NFT with this wallet");
      } else {
        setError(err.message || "Failed to mint. Please try again.");
      }
    } finally {
      setIsMinting(false);
    }
  };
  
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
          >
            {isMinting ? 'Minting...' : 'Mint Now (1 MON)'}
          </button>
          
          <button 
            onClick={onClose}
            style={{padding: '12px', background: 'transparent', border: '1px solid #ccc', borderRadius: '50px', color: 'white'}}
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
  const { playerHighScore, totalJumps, username, setUserUsername } = useWeb3();
  const { isConnected, address } = useAccount();
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  console.log("HorizontalStats render - Connected:", isConnected, "Address:", address, "Username:", username, "Score:", playerHighScore);
  
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
          <div className="stat-value">{playerHighScore || '0'}</div>
          <div className="stat-label">Hi-Score</div>
        </div>
        
        <div className="stat-item-horizontal">
          <div className="stat-value">{totalJumps || 0}</div>
          <div className="stat-label">Total Jumps</div>
        </div>
        
        <div className="stat-item-horizontal">
          <div className="stat-value">{Math.max(1, Math.floor((playerHighScore || 0) / 100))}</div>
          <div className="stat-label">Level</div>
        </div>
        
        <div className="stat-item-horizontal">
          <div className="stat-value">{getRank(playerHighScore || 0)}</div>
          <div className="stat-label">Rank</div>
        </div>
      </div>
    </div>
  );
}

// Helper function to determine player rank based on score
function getRank(score) {
  if (score === 0) return 'Newbie';
  if (score < 300) return 'Beginner';
  if (score < 800) return 'Jumper';
  if (score < 2000) return 'Pro Jumper';
  if (score < 5000) return 'Master';
  return 'Legend';
}

// Helper function to get random loading tips
function getRandomTip() {
  const tips = [
    "Collect coins for extra points!",
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
    "Challenge yourself to reach Legend rank!"
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}

function GameComponent({ hasMintedNft, isNftLoading, onOpenMintModal, onGameOver }) {
  // Import the web3Context correctly at the top of your component
  const web3Context = useWeb3();
  
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
    signer
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
  const [isCheckingMint, setIsCheckingMint] = useState(true);
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
  
  // Initialize fallback provider for offline mode
  useEffect(() => {
    // Create a fallback provider if we don't have one from web3
    if (!provider) {
      console.log("Creating fallback provider for offline mode");
      try {
        // For ethers v6
        const offlineProvider = new ethers.JsonRpcProvider(
          "https://prettier-morning-wish.monad-testnet.discover.quiknode.pro/your-key/"
        );
        
        // Or alternatively for older ethers v5 (if needed)
        // const offlineProvider = new ethers.providers.JsonRpcProvider(...)
        
        console.log("Fallback provider created successfully");
        setFallbackProvider(offlineProvider);
      } catch (error) {
        console.error("Failed to create fallback provider:", error);
        // Don't stop execution if fallback provider fails
        console.log("Continuing without fallback provider");
      }
    }
  }, [provider]);
  
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

  // REMOVE duplicate NFT checking functions, use only this consolidated version:
  const checkNFTOwnership = useCallback(async (userAddress) => {
    if (!userAddress || !publicClient) return false;
    
    try {
      // Single NFT check using publicClient
      const balance = await publicClient.readContract({
        address: import.meta.env.VITE_CHARACTER_CONTRACT_ADDRESS,
        abi: [{
          "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
          "name": "balanceOf",
          "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
          "stateMutability": "view",
          "type": "function"
        }],
        functionName: "balanceOf",
        args: [userAddress],
      });
      
      return Number(balance) > 0;
    } catch (error) {
      console.error("Error checking NFT:", error);
      return false;
    }
  }, [publicClient]);

  // Update useEffect to use the new function
  useEffect(() => {
    const checkMintStatus = async () => {
    if (isConnected && address) {
        setIsCheckingMint(true);
        
        try {
          // Set a timeout to prevent infinite loading if checks fail
          const timeoutPromise = new Promise(resolve => {
            setTimeout(() => resolve(false), 3000);
          });
          
          // Race between the actual check and the timeout
          const result = await Promise.race([
            checkNFTOwnership(address),
            timeoutPromise
          ]);
          
          console.log("Final NFT ownership result:", result);
          setHasMintedCharacter(result);
        } catch (error) {
          console.error("Error in mint status check:", error);
          setHasMintedCharacter(false);
        } finally {
          setIsCheckingMint(false);
        }
    } else {
        setHasMintedCharacter(false);
        setIsCheckingMint(false);
    }
    };

    checkMintStatus();
  }, [isConnected, address, checkNFTOwnership]);

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

  // Add this function inside your GameComponent before the return statement
  const handlePlayAgain = useCallback(() => {
    console.log("🔄 Play Again clicked");
    
    // Reset game state
    setCurrentJumps(0);
    setGameScore(0);
    setShowPlayAgain(false);
    setTransactionPending(false);
    
    // Force a new game session
    const newGameId = Date.now();
    setGameId(newGameId);
    
    // Force iframe reload - use the existing function
    forceReloadIframe(iframeRef, newGameId);
    
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
    
    // Show the game with loading animation already defined in the app
    console.log('Setting showGame to true while preserving wallet connection');
    setShowGame(true);
    
    // Reset play button animation after a delay
    setTimeout(() => {
      if (playButton) {
        playButton.classList.remove('play-button-clicked');
      }
    }, 500);
  }, [username]);

  // Comment out or remove this useEffect that's causing conflicts (around line 626-650)
  /*
  useEffect(() => {
    const handleJumpMessages = (event) => {
      if (event.data && event.data.type === 'jumpCount') {
        console.log("Received jump count event:", event.data.count);
        
        // If available, track jump in Supabase
        if (isConnected && address && updateScore) {
          updateScore(0, event.data.count)
            .then(() => console.log("Recorded jump in Supabase"))
            .catch(err => console.error("Failed to record jump:", err));
        }
        
        // Also add to pending jumps for eventual blockchain recording
        if (updateScore) {
          updateScore(0, event.data.count)
            .then(success => {
              if (success) {
                console.log("Jump recorded successfully");
              } else {
                console.log("Jump recording failed, but gameplay continues");
              }
            })
            .catch(err => {
              console.error("Failed to record jump:", err);
            });
        }
      }
    };
    
    window.addEventListener('message', handleJumpMessages);
    return () => window.removeEventListener('message', handleJumpMessages);
  }, [isConnected, address, updateScore]);
  */

  useEffect(() => {
    // Create a global function that the iframe can call
    window.handleJumpTransaction = async (platformType) => {
      console.log("Jump transaction request received from game");
      
      try {
        // Don't increment locally - let the game do it
        // Just return success
        return true;
                } catch (error) {
        console.error("Error in handleJumpTransaction:", error);
        return false;
      }
    };
    
    // Also set up a listener for game over events
    const handleGameOver = (event) => {
      if (event.data && (event.data.type === 'gameOver' || event.data.type === 'GAME_OVER')) {
        console.log("Game over event received:", event.data);
        
        // Extract the jump count directly from the game over message
        const finalScore = event.data.score || (event.data.data && event.data.data.finalScore) || 0;
        const jumpCount = event.data.jumpCount || (event.data.data && event.data.data.jumpCount) || 0;
        
        console.log("Processing game over with score:", finalScore, "jumps:", jumpCount);
        
        if (jumpCount > 0 && provider && provider.updateScore) {
          console.log("Sending transaction with jumps:", jumpCount);
          
          // Set transaction pending
          setTransactionPending(true);
          
          provider.updateScore(finalScore, jumpCount)
            .then(success => {
              console.log("Game over transaction result:", success);
              setTransactionPending(false);
              setShowPlayAgain(true);
            })
            .catch(err => {
              console.error("Game over transaction error:", err);
              setTransactionPending(false);
              setShowPlayAgain(true);
            });
            } else {
          console.log("No jumps to record or updateScore not available");
          setShowPlayAgain(true);
            }
        }
    };
    
    window.addEventListener('message', handleGameOver);
    
    // Cleanup
    return () => {
      delete window.handleJumpTransaction;
      window.removeEventListener('message', handleGameOver);
    };
  }, [provider, setTransactionPending, setShowPlayAgain]);

  // Update the message handler in your GameComponent (around line 930-970)
  useEffect(() => {
    const handleGameMessages = async (event) => {
      // Check for bundled jumps message for blockchain transaction
      if (event.data?.type === 'BUNDLE_JUMPS' && event.data.data) {
        const { score, jumpCount, saveId } = event.data.data;
        console.log(`🎮 Bundle request received:`, event.data.data);
        
        if (jumpCount > 0) {
          console.log(`🎮 Bundle includes score: ${score}`);
          
          try {
            // Set transaction as pending
            setTransactionPending(true);
            
            // Direct contract call without relying on web3Context's contract
            if (window.ethereum) {
              const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
              const signer = ethersProvider.getSigner();
              const account = await signer.getAddress();
              
              // Contract address - use the known value
              const contractAddress = '0xc9fc1784df467a22f5edbcc20625a3cf87278547';
              
              // Minimal ABI for recordJumps function
              const contractAbi = [
                "function recordJumps(uint256 _jumps) external",
                "function getPlayerJumps(address _player) external view returns (uint256)",
                "function getMyJumps() external view returns (uint256)"
              ];
              
              // Create contract instance
              const contractInstance = new ethers.Contract(
                contractAddress,
                contractAbi,
                signer
              );
              
              console.log("Direct contract transaction preparation:", {
                contractAddress,
                account,
                jumpCount
              });
              
              // Submit the transaction
              const tx = await contractInstance.recordJumps(jumpCount, {
                gasLimit: 300000 // Set appropriate gas limit for Monad
              });
              
              console.log("Transaction submitted:", tx.hash);
            
            // Wait for confirmation
            const receipt = await tx.wait();
              console.log("Transaction confirmed in block:", receipt.blockNumber);
              
              // Complete handling
              setTransactionPending(false);
              setShowPlayAgain(true);
            } else {
              console.error("No Ethereum provider available");
              setTransactionPending(false);
              setShowPlayAgain(true);
            }
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
      
      // Also handle regular game over messages
      else if (event.data?.type === 'GAME_OVER' && event.data.data) {
        const { finalScore, jumpCount } = event.data.data;
        console.log(`Game over message received with score ${finalScore} and ${jumpCount} jumps`);
      }
    };
    
    window.addEventListener('message', handleGameMessages);
    return () => window.removeEventListener('message', handleGameMessages);
  }, [setTransactionPending, setShowPlayAgain]);

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
            
            {isNftLoading ? (
              <div className="loading-nft-check">
                <p>Checking NFT ownership...</p>
                <div className="loading-spinner"></div>
              </div>
            ) : hasMintedNft ? (
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
                onClick={onOpenMintModal}
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
        
        <footer className="footer">
          <p>Developed with 💖 by The Monad Team</p>
        </footer>
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
          style={{ visibility: isLoading ? 'hidden' : 'visible', opacity: isLoading ? 0 : 1 }}
          onLoad={() => {
            // Only auto-hide the loading screen if not already hidden by the Play button
            if (isLoading) {
              // Wait some time before auto-hiding to allow manual click
              setTimeout(() => {
                // Only auto-hide if still loading (not already clicked)
                if (isLoading) {
                  setIsLoading(false);
                }
              }, 3000);
            }
          }}
        />
      </div>
      
      <TransactionNotifications />
      {showMintModal && (
        <NFTMintModal 
          isOpen={showMintModal} 
          onClose={() => {
            console.log("Closing mint modal while preserving connection");
            setShowMintModal(false);
          }} 
        />
      )}
      {mintError && (
        <div style={{
          color: '#FF5252',
          padding: '10px',
          marginTop: '10px',
          backgroundColor: 'rgba(255,82,82,0.1)',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          {mintError}
        </div>
      )}
      {showPlayAgain && (
              <button 
          className="play-again-button" 
          onClick={handlePlayAgain}
          disabled={transactionPending}
        >
          {transactionPending ? "Processing Transaction..." : "Play Again"}
              </button>
      )}
      {transactionPending && <LoadingSpinner isMobile={isMobileView} />}
    </div>
  );
}

// Admin access component
function AdminAccessCheck() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const correctPassword = "monad-jump-2023";
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === correctPassword) {
      setAuthorized(true);
      sessionStorage.setItem('adminAuthorized', 'true');
    } else {
      alert("Incorrect password");
    }
  };
  
  useEffect(() => {
    console.log("AdminAccessCheck component mounted");
    if (sessionStorage.getItem('adminAuthorized') === 'true') {
      setAuthorized(true);
    }
  }, []);
  
  if (authorized) {
    return (
      <>
        <Navbar />
        <AdminDashboard />
      </>
    );
  }
  
  console.log("Rendering admin login form");
  return (
    <>
      <Navbar />
      <div className="admin-login">
        <h2>Admin Access</h2>
        <form onSubmit={handleSubmit}>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password"
          />
          <button type="submit">Access Dashboard</button>
        </form>
      </div>
    </>
  );
}

function App() {
  const location = useLocation();
  const isGameScreen = location.pathname === '/' && window.location.hash === '#game';

  // Access connection state
  const { isConnected, address } = useAccount();
  
  // Import the web3Context and extract needed functions
  const web3Context = useWeb3();
  // Extract updateScore from web3Context
  const { updateScore } = web3Context || {};

  // Reference to the iframe
  const iframeRef = useRef(null);
  
  // Add state variables for NFT status
  const [isMobileView, setIsMobileView] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);
  
  // Use wagmi's reliable contract reading hook
  const { 
    data: nftBalanceData,
    isLoading: isNftBalanceLoading
  } = useContractRead({
    address: '0xd6f96a88e8abd4da0eab43ec1d044caba3ee9f37',
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
  });

  // Calculate NFT ownership status
  const hasMintedNft = useMemo(() => {
    if (!nftBalanceData) return false;
    const balanceNum = typeof nftBalanceData === 'bigint' ? 
      Number(nftBalanceData) : Number(nftBalanceData.toString() || '0');
    return balanceNum > 0;
  }, [nftBalanceData]);

  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth <= 768 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Rest of existing useEffects...

  return (
    <Web3Provider>
      {/* Only show navbar when wallet is connected */}
      {isConnected && <Navbar />}
      
      <Routes>
        {/* Pass NFT status to GameComponent */}
        <Route path="/" element={
          <ErrorBoundary>
            <GameComponent 
              hasMintedNft={hasMintedNft} 
              isNftLoading={isNftBalanceLoading}
              onOpenMintModal={() => setShowMintModal(!0)}
            />
          </ErrorBoundary>
        } />
        <Route path="/admin" element={<AdminAccess />} />
      </Routes>
      <TransactionNotifications />

      {showMintModal && (
        <NFTMintModal 
          isOpen={!0} 
          onClose={()=>setShowMintModal(!1)} 
        />
      )}
    </Web3Provider>
  );
}

export default App; 