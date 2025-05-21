import { ethers } from "ethers";
import { useState, useEffect, useLayoutEffect } from "react";
import MobileHomePage from "./src/components/MobileHomePage";
import characterABI from "./src/data/characterABI.json";
import usePlayerStats from "./src/hooks/usePlayerStats";
import HorizontalStats from "./src/components/HorizontalStats";
// Import Farcaster utilities
import { initFarcasterSDK, isInFarcasterFrame } from "./src/utils/farcaster";

// Debug information to help troubleshoot mobile display issues
console.log("Root App.jsx loading. If you see this, the root App.jsx is being used, not src/App.jsx");

// Force reload to mobile view if needed (after wallet connection)
function forceMobileRedirect() {
  // Check flag in window object (set by MobileHomePage)
  if ((window.__FORCE_MOBILE_VIEW__ || detectMobile()) && !document.querySelector('.mobile-container')) {
    console.log('Forcing redirect to mobile view');
    
    // Set the URL parameter and reload
    const url = new URL(window.location.href);
    url.searchParams.set('isMobile', 'true');
    url.searchParams.set('forceReload', Date.now().toString());
    
    // Force reload to apply changes
    setTimeout(() => {
      window.location.href = url.toString();
    }, 100);
    return true;
  }
  return false;
}

// Force mobile detection function - multiple strategies for reliability
function detectMobile() {
  // Strategy 1: Check window object flag (set by MobileHomePage)
  if (window.__FORCE_MOBILE_VIEW__) return true;
  
  // Strategy 2: Check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('isMobile') === 'true') return true;
  
  // Strategy 3: Check storage
  if (localStorage.getItem('isMobileDevice') === 'true') return true;
  if (sessionStorage.getItem('isMobileDevice') === 'true') return true;
  
  // Strategy 4: Check for marker element
  if (document.getElementById('__mobile_view_active__')) return true;
  if (document.getElementById('__force_mobile_view__')) return true;
  
  // Strategy 5: Check screen size (updated for more reliable detection)
  const isMobileBySize = window.innerWidth <= 768 || 
    (typeof window.orientation !== 'undefined') ||
    navigator.userAgent.includes('Mobile') ||
    navigator.userAgent.includes('Android') ||
    /iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // If it's mobile by size, set all persistence methods
  if (isMobileBySize) {
    localStorage.setItem('isMobileDevice', 'true');
    sessionStorage.setItem('isMobileDevice', 'true');
    window.__FORCE_MOBILE_VIEW__ = true;
    
    // Add URL parameter if not already present
    if (!urlParams.has('isMobile')) {
      urlParams.set('isMobile', 'true');
      // Update URL without reload
      const newUrl = `${window.location.pathname}?${urlParams.toString()}${window.location.hash}`;
      window.history.replaceState({}, '', newUrl);
    }
    return true;
  }
  
  return false;
}

function App() {
  // Add debug info to console to help troubleshoot which App.jsx is being used
  console.log("Root App.jsx rendering");
  
  // Immediately check if we need to force redirect
  if (forceMobileRedirect()) {
    // Return loading state since we're about to redirect
    return <div>Loading...</div>;
  }
  
  // Force immediate mobile check before first render
  const initialIsMobile = detectMobile();
  const [isMobile, setIsMobile] = useState(initialIsMobile);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [characterImg, setCharacterImg] = useState('/images/character.png');
  const [hasMintedNft, setHasMintedNft] = useState(true); // Default to true for testing
  const [isNftLoading, setIsNftLoading] = useState(false);
  // Farcaster state
  const [farcasterContext, setFarcasterContext] = useState(null);
  const [isInFarcaster, setIsInFarcaster] = useState(false);
  
  // Get all player stats from our new custom hook
  const {
    playerHighScore,
    totalJumps,
    gamesPlayed,
    gameSessionsCount,
    jumpRank,
    scoreRank
  } = usePlayerStats();
  
  // Get leaderboard data (will need to be handled differently or moved to the hook)
  const [leaderboard, setLeaderboard] = useState([]);
  
  // Use wallet address from signer instead of separate state
  const [walletAddress, setWalletAddress] = useState(null);
  
  // Initialize Farcaster SDK
  useEffect(() => {
    const setupFarcasterSDK = async () => {
      try {
        // Check if we're in a Farcaster Frame context
        const inFarcaster = isInFarcasterFrame();
        setIsInFarcaster(inFarcaster);
        
        if (inFarcaster) {
          // Initialize the SDK
          const result = await initFarcasterSDK();
          if (result.success) {
            setFarcasterContext(result.context);
            console.log('Farcaster SDK initialized successfully', result.context);
          } else {
            console.error('Failed to initialize Farcaster SDK', result.error);
          }
        }
      } catch (error) {
        console.error('Error setting up Farcaster SDK:', error);
      }
    };
    
    setupFarcasterSDK();
  }, []);

  // Run before first render
  useLayoutEffect(() => {
    // Force redirect check
    if (forceMobileRedirect()) return;
    
    // Set mobile state
    const currentIsMobile = detectMobile();
    setIsMobile(currentIsMobile);
    
    // Set up visibility change handler for wallet redirects
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if we need to force a redirect (after wallet connection)
        if (!forceMobileRedirect()) {
          const currentIsMobile = detectMobile();
          setIsMobile(currentIsMobile);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  // Special handler for wallet connection 
  useEffect(() => {
    // Check for wallet connection completion
    const checkWalletConnection = () => {
      // If ethereum is available and we're on mobile
      if (window.ethereum && (detectMobile() || window.__FORCE_MOBILE_VIEW__ || localStorage.getItem('isMobileDevice') === 'true')) {
        // Force mobile immediately
        window.__FORCE_MOBILE_VIEW__ = true;
        localStorage.setItem('isMobileDevice', 'true');
        sessionStorage.setItem('isMobileDevice', 'true');
        
        // Check if any accounts are connected
        window.ethereum.request({ method: 'eth_accounts' })
          .then(accounts => {
            if (accounts && accounts.length > 0) {
              // We have connected accounts but might be in desktop view
              if (!document.querySelector('.mobile-container')) {
                console.log('Wallet connected but not in mobile view - forcing redirect');
                forceMobileRedirect();
              }
            }
          })
          .catch(err => console.error('Error checking accounts:', err));
      }
    };
    
    // Check initially and on account changes
    checkWalletConnection();
    
    if (window.ethereum) {
      // Handle wallet connection events
      const handleAccountsChanged = () => {
        checkWalletConnection();
        // Double-check after a delay to catch post-redirect state
        setTimeout(checkWalletConnection, 500);
      };
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('connect', handleAccountsChanged);
    }
    
    // Check whenever tab becomes visible (might be after wallet connection redirect)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkWalletConnection();
        // Double-check after a delay
        setTimeout(checkWalletConnection, 300);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('connect', handleAccountsChanged);
      }
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, []);

  // Initialize ethers provider and signer
  useEffect(() => {
    const setupEthers = async () => {
      if (window.ethereum) {
        try {
          const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
          const accounts = await web3Provider.listAccounts();
          
          setProvider(web3Provider);
          setSigner(web3Provider.getSigner());
          
          // Set wallet address for use in stats
          if (accounts && accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
          
          // If we have accounts but aren't in mobile view, force reload
          if (accounts.length > 0 && detectMobile() && !document.querySelector('.mobile-container')) {
            forceMobileRedirect();
          }
        } catch (error) {
          console.error("Failed to set up ethers:", error);
        }
      }
    };
    
    setupEthers();
  }, []);

  // Add resize listener to handle orientation changes
  useEffect(() => {
    const handleResize = () => {
      const shouldBeMobile = detectMobile();
      if (shouldBeMobile !== isMobile) {
        setIsMobile(shouldBeMobile);
        
        // If we switched to mobile but don't have the UI, force reload
        if (shouldBeMobile && !document.querySelector('.mobile-container')) {
          forceMobileRedirect();
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [isMobile]);

const handleMintNow = async () => {
  try {
    // Check if wallet is connected
    if (!provider || !signer) {
      console.error("Wallet not connected");
      return;
    }
        
      setIsNftLoading(true);
    
    // Log important info for debugging
    console.log("Attempting to mint with:", {
      contractAddress: import.meta.env.VITE_CHARACTER_CONTRACT_ADDRESS,
      account: await signer.getAddress()
    });
    
    // Create contract instance
    const characterContract = new ethers.Contract(
      import.meta.env.VITE_CHARACTER_CONTRACT_ADDRESS,
        characterABI,
      signer
    );
    
    // Call mint function - add debugging
    console.log("Calling mint function...");
    const tx = await characterContract.mint({ 
      value: ethers.utils.parseEther("1") // 1 MON
    });
    
    console.log("Transaction sent:", tx.hash);
      await tx.wait();
      setHasMintedNft(true);
        
  } catch (error) {
    console.error("Mint error:", error);
    // Show error to user
    } finally {
      setIsNftLoading(false);
    }
  };

  const handlePlayGame = () => {
    // Navigate to game screen or start game logic
    window.location.href = '#game';
  };

  // Add meta viewport tag for better mobile display
  useEffect(() => {
    // Find or create viewport meta tag for proper mobile scaling
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    
    if (isMobile) {
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    } else {
      viewport.content = 'width=device-width, initial-scale=1.0';
      document.body.style.overflow = '';
      document.body.style.position = '';
    }
  }, [isMobile]);

  // Final force check on render
  const forcedMobileCheck = detectMobile();
  
  // Always use mobile view on mobile devices - multiple checks for reliability
  if (isMobile || forcedMobileCheck || localStorage.getItem('isMobileDevice') === 'true' || window.__FORCE_MOBILE_VIEW__) {
    console.log('Rendering mobile view');
    return (
      <MobileHomePage
        characterImg={characterImg}
        onPlay={handlePlayGame}
        onMint={handleMintNow}
        hasMintedNft={hasMintedNft}
        isNftLoading={isNftLoading}
        // Pass stats from our custom hook
        playerHighScore={playerHighScore}
        totalJumps={totalJumps}
        jumpRank={jumpRank}
        scoreRank={scoreRank}
        gamesPlayed={gameSessionsCount > gamesPlayed ? gameSessionsCount : gamesPlayed}
        leaderboard={leaderboard}
        address={walletAddress}
      />
    );
  }

  // Desktop view - only show if definitely not mobile
  console.log('Rendering desktop view');
  return (
    <div className="desktop-container">
      {/* Your existing desktop components */}
      <h1>JumpNads Desktop View</h1>
      {/* More desktop components... */}
    </div>
  );
}

export default App;