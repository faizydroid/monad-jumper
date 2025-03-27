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
import { connectorsForWallets, wallet } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { monadTestnet } from './config/chains';
import { publicProvider } from 'wagmi/providers/public';
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

// Create cartoon clouds and platforms background
function BackgroundElements() {
  const [elements, setElements] = useState([]);
  
  useEffect(() => {
    const newElements = [];
    const sizes = ['sm', 'md', 'lg'];
    const colors = ['green', 'blue', 'white', 'brown'];
    const delays = ['', 'floating-delay-1', 'floating-delay-2', 'floating-delay-3'];
    
    // Create 15 random platforms
    for (let i = 0; i < 15; i++) {
      newElements.push({
        id: i,
        type: 'platform',
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: sizes[Math.floor(Math.random() * sizes.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: delays[Math.floor(Math.random() * delays.length)],
        rotation: Math.random() * 25 - 12.5,
      });
    }
    
    // Add 3 clouds
    newElements.push({ id: 'cloud-1', type: 'cloud', className: 'cloud cloud-1' });
    newElements.push({ id: 'cloud-2', type: 'cloud', className: 'cloud cloud-2' });
    newElements.push({ id: 'cloud-3', type: 'cloud', className: 'cloud cloud-3' });
    
    setElements(newElements);
  }, []);
  
  return (
    <div className="background-elements">
      {elements.map(element => 
        element.type === 'platform' ? (
          <div 
            key={element.id}
            className={`platform ${element.size} ${element.color} floating ${element.delay}`}
            style={{
              left: `${element.x}%`,
              top: `${element.y}%`,
              '--rotation': `${element.rotation}deg`
            }}
          />
        ) : (
          <div key={element.id} className={element.className} />
        )
      )}
    </div>
  );
}

// Cartoon username modal
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
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter awesome username (min 3 chars)"
            required
            autoFocus
          />
          <button type="submit">
            Let's Jump!
          </button>
        </form>
      </div>
    </div>
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
  
  // Add username state and modal state
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  
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
            return;
        }
        
        try {
            console.log("🔍 Checking username for wallet:", address);
            
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
                setShowUsernameModal(false); // Also hide the username modal
    } else {
                console.log("❌ No username found - showing modal");
                setUsername(null);
                setShowModal(true);
                setShowUsernameModal(true); // Show the username modal
            }
        } catch (error) {
            console.error("🔴 Error checking username:", error);
        }
    };

    // Run username check when wallet connects
    if (isConnected && address) {
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

  // Update the handleUsernameSubmit function
  const handleUsernameSubmit = async (newUsername) => {
    if (!address) return;
    
    try {
        console.log(`💾 Saving username "${newUsername}" for wallet ${address}`);
        
        // Use upsert instead of delete/insert
      const { error } = await supabase
        .from('users')
            .upsert({ 
                wallet_address: address.toLowerCase(),
            username: newUsername,
                updated_at: new Date().toISOString()
            });
        
        if (error) throw error;
        
        console.log("✅ Username saved successfully");
        
        // Update local state
        setUsername(newUsername);
        setShowModal(false);
        setShowUsernameModal(false);
        
    } catch (error) {
        console.error("🔴 Error saving username:", error);
        alert("Error saving username. Please try again.");
    }
};

  // Update the wallet connection status effect
  useEffect(() => {
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

  // Add this function inside your GameComponent before the return statement
  const handlePlayClick = useCallback(() => {
    // Set the hash to indicate we're in game mode
    window.location.hash = 'game';
    
    // Important: Don't use regular navigation which would cause a page reload
    // and lose wallet connection
    console.log('Setting showGame to true while preserving wallet connection');
    
    // Show the game iframe without unmounting parent components
    setShowGame(true);
  }, []);

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
              // Preserve wallet connection by updating state without page navigation
              console.log("Play clicked from mobile, setting showGame via state update");
              window.location.hash = 'game';
              setShowGame(true);
            }}
            onMint={() => {
              // Use a state update instead of a function that might cause re-rendering
              console.log("Mint clicked from mobile, showing modal via state update");
              setShowMintModal(true);
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
          
              <div className="character-container" style={{height: "100px", display: "flex", justifyContent: "center", margin: "20px 0"}}>
                <img 
                  src="/images/monad0.png" 
                  alt="Game Character" 
                  className="character" 
                  style={{height: "100px", width: "auto"}}
                />
          </div>
          
              <div className="welcome-message">
                <p>Connect your wallet to start your jumping adventure</p>
                <div className="wallet-connect mobile">
              <ConnectButton />
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

  // Update the username modal condition to be more precise
  if (!username && showModal) {
    return (
      <>
        <div className="container">
          <h1 className="game-title">Monad Jumper</h1>
          <div className="character-container">
            <div className="shadow"></div>
            <div className="character"></div>
          </div>
          <button 
            className="mint-to-play-button"
            onClick={handlePlayClick}
          >
            PLAY
          </button>
          <UsernameModal onSubmit={handleUsernameSubmit} />
        </div>
      </>
    );
  }

  // If wallet is loading, show loading indicator
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
        </div>
      </>
    );
  }

  // Game is ready to play, but hasn't started yet
  if (!showGame && !walletLoading) {
    return (
      <>
        <BackgroundElements />
        <div className="container">
          <header>
            <h1 className="game-title">Monad Jumper</h1>
          </header>
          
          <div className="character-container">
            <div className="shadow"></div>
            <div className="character"></div>
          </div>
          
          {isNftLoading ? (
            <div className="loading-nft-check">
              <p>Checking NFT ownership...</p>
              <div className="loading-spinner"></div>
            </div>
          ) : hasMintedNft ? (
            // This is the green PLAY button for users who already have an NFT
            <button 
              className="play-button"
              onClick={handlePlayClick}
            >
              PLAY
            </button>
          ) : (
            // This is the red MINT TO PLAY button we want to keep
            <button 
              className="mint-to-play-button"
              onClick={onOpenMintModal}
            >
              MINT TO PLAY
            </button>
          )}
          
          <main className="stats-leaderboard-container">
            <div className="stats-column">
              <PlayerStats />
            </div>
            
            <div className="leaderboard-column">
              <Leaderboard />
            </div>
          </main>
          
          <GameCards />
          
          <footer className="footer">
            <p className="developed-by">
              Developed by <a href="https://x.com/faizydroid" target="_blank" rel="noopener noreferrer">@faizydroid</a>
            </p>
            <p className="built-on">Built on Monad</p>
            <p className="copyright">© 2023 Monad Jumper - All Rights Reserved</p>
          </footer>
        </div>
      </>
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
        </div>
      </>
    );
  }

  // Game is showing
  return (
    <div className="app">
      {/* Add game begin screen */}
        {isLoading && showGame && (
        <div className="loading-screen game-begin-screen">
          <h1 className="game-title">Monad Jumper</h1>
          <div className="character-container">
            <div className="shadow"></div>
            <div className="character"></div>
          </div>
            <div className="loading-bar-container">
              <div className="loading-bar"></div>
            </div>
          <div className="loading-tips">
            <p>Get ready to jump!</p>
            </div>
          </div>
        )}
      
      <div className="game-container">
        {!showGame && (
          <div className="game-start-screen">
            <h1 className="game-title">Monad Jumper</h1>
            <div className="character-container">
              <div className="shadow"></div>
              <div className="character"></div>
            </div>
          </div>
        )}
        
        <iframe 
          key={`game-${gameId}`}
          ref={iframeRef}
          src={`/original.html?session=${gameId}`}
          title="Monad Jumper Game"
          className="game-frame"
          allow="autoplay"
          frameBorder="0"
          tabIndex="0"
          style={{ visibility: isLoading ? 'hidden' : 'visible' }}
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
      {/* Username Modal - Show when needed */}
      {showUsernameModal && (
        <UsernameModal onSubmit={handleUsernameSubmit} />
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
  
  // NFT ownership check - consolidated to one query
  const { data: nftBalanceData, isLoading: isNftBalanceLoading } = useContractRead({
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

  // Calculate NFT ownership
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

  // Only log in development
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('NFT ownership status:', { hasMintedNft, isNftBalanceLoading, address });
    }
  }, [hasMintedNft, isNftBalanceLoading, address]);

  // Define a provider
  // Get chainId from env or use a default
  const CHAIN_ID = parseInt(import.meta.env.VITE_REACT_APP_MONAD_CHAIN_ID || '10143');

  // Make sure you have the project ID (this is critical for mobile)
  const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

  // Configure chains
  const { chains, publicClient } = configureChains(
    [monadTestnet], 
    [publicProvider()]
  );

  // Set up wallet connectors with explicit inclusion of mobile options
  const { connectors } = connectorsForWallets([
    {
      groupName: 'Recommended',
      wallets: [
        wallet.metaMask({ projectId, chains }),
        wallet.walletConnect({ projectId, chains }),
        wallet.rainbow({ projectId, chains }),
        wallet.trust({ projectId, chains }),
        wallet.coinbase({ chains, appName: 'Monad Jumper' }),
        // Add any other wallets you want to support
      ],
    },
  ]);

  // Create wagmi config with our connectors
  const wagmiConfig = createConfig({
    autoConnect: true,
    connectors,
    publicClient,
  });

  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider 
        chains={chains}
        modalSize="compact"
        appInfo={{
          appName: 'Monad Jumper',
          learnMoreUrl: 'https://monadjumper.com',
        }}
      >
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
                  onOpenMintModal={() => setShowMintModal(true)}
                />
              </ErrorBoundary>
            } />
            <Route path="/admin" element={<AdminAccess />} />
          </Routes>
          <TransactionNotifications />

          {showMintModal && (
            <NFTMintModal 
              isOpen={showMintModal} 
              onClose={() => setShowMintModal(false)}
            />
          )}
        </Web3Provider>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default App; 