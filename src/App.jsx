import React, { useState, useRef, useEffect, useCallback, Component } from 'react';
import { Web3Provider, useWeb3 } from './contexts/Web3Context';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
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

// Add this NFT minting modal component
const NFTMintModal = ({ isOpen, onClose }) => {
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState(null);
  const { account } = useWeb3();
  const { provider } = useWeb3();
  
  const handleMint = async () => {
    if (!account) {
      setError("Please connect your wallet first");
      return;
    }
    
    setIsMinting(true);
    setError(null);
    
    try {
      // Use environment variable for contract address
      const nftAddress = import.meta.env.VITE_CHARACTER_CONTRACT_ADDRESS;
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        nftAddress, 
        ["function mint() payable"], 
        signer
      );
      
      console.log("Sending mint transaction with 1 MON...");
      const tx = await contract.mint({
        value: ethers.utils.parseEther("1.0")
      });
      
      console.log("Mint transaction sent:", tx.hash);
      
      // Wait for confirmation
      await tx.wait();
      console.log("NFT minted successfully!");
      
      // Close modal after successful mint
      onClose();
      
      // Refresh the page to update NFT status
      window.location.reload();
    } catch (err) {
      console.error("Mint error:", err);
      
      if (err.code === 'INSUFFICIENT_FUNDS') {
        setError("You need 1 MON to mint this NFT");
      } else if (err.message && err.message.includes("Limit 1 NFT per wallet")) {
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

function GameComponent() {
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
    providerError
  } = useWeb3();
  
  const [username, setUsername] = useState(webUsername || null);
  
  const { address, isConnected } = useAccount();
  
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
  
  // Initialize fallback provider for offline mode
  useEffect(() => {
    // Create a fallback provider if we don't have one from web3
    if (!provider) {
      console.log("Creating fallback provider for offline mode");
      try {
        const offlineProvider = new ethers.providers.JsonRpcProvider(
          "https://prettier-morning-wish.monad-testnet.discover.quiknode.pro/your-key/"
        );
        setFallbackProvider(offlineProvider);
      } catch (error) {
        console.error("Failed to create fallback provider:", error);
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
                
                // Bundle all jumps into one transaction
                console.log('Sending bundled transaction with jumps:', jumpCount);
                const success = await updateScore(finalScore, jumpCount);
                
                if (success) {
                  console.log('Score and jumps saved successfully');
                  // Show play again button after successful save
                  setShowPlayAgain(true);
                } else {
                  console.error('Failed to save score and jumps');
                }
                return success;
              } catch (error) {
                console.error('Error in game over handler:', error);
                return false;
              }
            },
            // Simplified jump handler - just return true since we're bundling
            onJump: () => Promise.resolve(true)
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

  // Add the checkIfUserHasMinted function
  const checkIfUserHasMinted = useCallback(async (userAddress) => {
    if (!userAddress || !window.ethereum) return false;
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(
        import.meta.env.VITE_CHARACTER_CONTRACT_ADDRESS,
        ["function balanceOf(address) view returns (uint256)"],
        provider
      );
      
      const balance = await contract.balanceOf(userAddress);
      return balance.gt(0);
    } catch (error) {
      console.error("Error checking mint status:", error);
      return false;
    }
  }, []);

  // Update useEffect to use the new function
  useEffect(() => {
    if (isConnected && address) {
      checkIfUserHasMinted(address)
        .then(setHasMintedCharacter)
        .catch(error => {
          console.error("Error checking mint status:", error);
          setHasMintedCharacter(false);
        })
        .finally(() => {
          setIsCheckingMint(false);
        });
    } else {
      setHasMintedCharacter(false);
      setIsCheckingMint(false);
    }
  }, [isConnected, address, checkIfUserHasMinted]);

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

  // Update the checkUsername function
  const checkUsername = async () => {
    if (!isConnected || !address) {
        console.log("❌ No wallet connected");
        return;
    }
    
    try {
        console.log("🔍 Checking username for wallet:", address);
        
        // Remove noCache() as it's not a valid method
        const { data, error } = await supabase
            .from('users')
            .select('username')
            .eq('wallet_address', address.toLowerCase())
            .single();
        
        console.log("📊 Supabase response:", { data, error });
        
        if (error) {
            if (error.code === 'PGRST116') {
                console.log("❌ No username found - showing modal");
                setUsername(null);
                setShowModal(true);
            } else {
                console.error("Error checking username:", error);
            }
            return;
        }
        
        if (data?.username) {
            console.log("✅ Found username:", data.username);
            setUsername(data.username);
            setShowModal(false);
      } else {
            console.log("❌ No username found - showing modal");
            setUsername(null);
            setShowModal(true);
      }
    } catch (error) {
        console.error("🔴 Error checking username:", error);
    }
  };

  // Update the useEffect to use the extracted checkUsername function
  useEffect(() => {
    if (isConnected && address) {
        checkUsername();
    } else {
        setUsername(null);
        setShowModal(false);
    }
}, [isConnected, address]);

  // Clean up all listeners on component mount
  useEffect(() => {
    // Remove any existing listeners
    const cleanupListeners = () => {
      window.removeEventListener('message', window.__jumpHandler);
      window.removeEventListener('message', window.__gameOverHandler);
    };
    
    cleanupListeners();
    return cleanupListeners;
  }, []);

  // Replace the resetGame function
  const resetGame = useCallback(() => {
    console.log("🔄 Resetting game");
    
    // Reset game score
    setGameScore(0);
    
    // Reset play again button
    setShowPlayAgain(false);
    
    // Force a new game session
    const newGameId = Date.now();
    setGameId(newGameId);
    
    // Force iframe reload
    if (iframeRef.current) {
      const url = new URL('/original.html', window.location.origin);
      url.searchParams.set('session', newGameId);
      url.searchParams.set('t', Date.now());
      iframeRef.current.src = url.toString();
      console.log("🔄 Iframe reloaded with new session");
    }
  }, [setGameScore]);

  // Update the game over handler with detailed logging
  useEffect(() => {
    console.log('📊 Setting up game over handler');
    
    const handleGameMessages = async (event) => {
      // Log all incoming messages for debugging
      console.log('📊 Received message:', event.data);
      
      // Handle game over event
      if (event.data?.type === 'gameOver') {
        const { score, jumpCount } = event.data.data;
        console.log('📊 GAME OVER EVENT RECEIVED');
        console.log(`📊 Score: ${score}`);
        console.log(`📊 Jump Count: ${jumpCount}`);
        
        try {
          setTransactionPending(true);
          console.log('📊 Setting transaction pending state');
          
          // Process the transaction with the final jump count
          console.log('📊 Calling updateScore function');
          const success = await updateScore(score, jumpCount);
              
              if (success) {
            console.log('✅ Transaction processed successfully');
            setShowPlayAgain(true);
              } else {
            console.error('❌ Transaction failed');
              }
          } catch (error) {
          console.error('🔴 Error in game over handler:', error);
          console.error('Error details:', error.message);
        } finally {
          console.log('📊 Resetting transaction pending state');
          setTransactionPending(false);
        }
      }
    };

    window.addEventListener('message', handleGameMessages);
    console.log('📊 Game over handler attached');
    
    return () => {
      window.removeEventListener('message', handleGameMessages);
      console.log('📊 Game over handler removed');
    };
  }, [updateScore]);

  // Update the jump sync effect
  useEffect(() => {
    if (!showGame || !iframeRef.current) return;
    
    console.log("Setting up jump counter sync");
    
    const syncJumpCount = () => {
      try {
        if (iframeRef.current?.contentWindow) {
          const iframeJumpCount = iframeRef.current.contentWindow.__jumpCount || 0;
          
          // Only update if the count has changed
          if (iframeJumpCount !== currentJumps) {
            console.log(`Sync: Updated jump count from iframe: ${iframeJumpCount}`);
            setCurrentJumps(iframeJumpCount);
          }
        }
      } catch (err) {
        console.error("Error syncing jump count:", err);
      }
    };
    
    // Sync more frequently during gameplay
    const syncInterval = setInterval(syncJumpCount, 100);
    
    // Also sync on jump events
    const handleJumpEvent = (event) => {
      if (event.data?.type === 'JUMP_PERFORMED') {
        syncJumpCount();
      }
    };
    
    window.addEventListener('message', handleJumpEvent);
    
    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('message', handleJumpEvent);
    };
  }, [showGame, iframeRef, currentJumps]);

  // Add this handlePlayClick function
  const handlePlayClick = useCallback(() => {
    console.log("PLAY button clicked - starting new game");
    window.location.hash = 'game';
    setShowGame(true);
    
    // Reset game state
    setCurrentJumps(0);
    setGameScore(0);
    setShowPlayAgain(false);
    
    // Force iframe refresh with new game ID
    const newGameId = Date.now();
    setGameId(newGameId);
    
    // Force a completely new iframe
    forceReloadIframe(iframeRef, newGameId);
    
    console.log("Game initialized with new session:", newGameId);
  }, [setGameScore]);

  // Update the bundle jumps handler
  useEffect(() => {
    console.log('🔄 Setting up bundle jumps handler');
    
    const handleBundledJumps = async (event) => {
        if (event.data?.type === 'BUNDLE_JUMPS') {
            const { score, jumpCount } = event.data.data;
            console.log('🎯 Processing BUNDLE_JUMPS:', { score, jumpCount });
            
            if (!jumpCount || jumpCount <= 0) {
                console.error('❌ No jumps to process');
                return;
            }
            
            try {
                setTransactionPending(true);
                console.log('📤 Preparing transaction for', jumpCount, 'jumps');

                // Reset game state before processing new transaction
                setShowPlayAgain(false);
                
                const success = await updateScore(score, jumpCount);
                console.log('📤 Transaction result:', success);

                if (success) {
                    console.log('✅ Transaction successful');
                    setShowPlayAgain(true);
                } else {
                    console.error('❌ Transaction failed');
                }
            } catch (error) {
                console.error('❌ Transaction error:', error);
            } finally {
                setTransactionPending(false);
            }
        }
    };

    window.addEventListener('message', handleBundledJumps);
    return () => {
        window.removeEventListener('message', handleBundledJumps);
        // Reset states when unmounting
        setTransactionPending(false);
        setShowPlayAgain(false);
    };
}, [updateScore]);

// Add this function to handle play again
const handlePlayAgain = useCallback(() => {
    console.log('🔄 Play Again clicked');
    
    // Reset all states
    setCurrentJumps(0);
    setGameScore(0);
    setShowPlayAgain(false);
    setTransactionPending(false);
    
    // Reset the game iframe
    if (iframeRef.current) {
        iframeRef.current.contentWindow.postMessage({ type: 'RESET_GAME' }, '*');
    }
    
    console.log('🎮 Game reset complete');
}, []);

  if (providerError) {
    return (
      <div className="wallet-error">
        <h2>Wallet Connection Error</h2>
        <p>{providerError}</p>
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
        <Navbar />
        <BackgroundElements />
        <div className="container">
          <h1 className="game-title">Monad Jumper</h1>
          <p className="game-subtitle">Jump through the blockchain one block at a time!</p>
          
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
          
          <div className="wallet-container">
            <div className="card wallet-card">
              <h2 className="card-title">Connect Your Wallet</h2>
              <p style={{marginBottom: '1.5rem', textAlign: 'center', color: '#222222'}}>
                Connect your wallet to start your jumping adventure
              </p>
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
    );
  }

  // Update the username modal condition to be more precise
  if (!username && showModal) {
    return (
      <>
        <Navbar />
        <BackgroundElements />
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
          
          <button 
            className="mint-to-play-button"
            onClick={handlePlayClick}
          >
            PLAY
          </button>
          
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
            <button 
              className="mint-to-play-button"
              onClick={handlePlayClick}
            >
              PLAY
            </button>
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
          onClose={() => setShowMintModal(false)} 
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

// Error boundary component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      hasError: true,
      error: error,
      errorInfo: errorInfo
    });
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', backgroundColor: '#ffeeee', border: '1px solid #ff0000', borderRadius: '5px' }}>
          <h2>Something went wrong</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const location = useLocation();
  const isGameScreen = location.pathname === '/' && window.location.hash === '#game';

  return (
    <ErrorBoundary>
      <div className="app">
        <Web3Provider>
          {isGameScreen ? <GameNavbar /> : <Navbar />}
          <Routes>
            <Route path="/" element={<GameComponent />} />
            <Route path="/admin" element={<AdminAccess />} />
          </Routes>
          <TransactionNotifications />
        </Web3Provider>
      </div>
    </ErrorBoundary>
  );
}

export default App; 