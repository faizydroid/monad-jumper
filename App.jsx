import { ethers } from "ethers";
import { useState, useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import MobileHomePage from "./src/components/MobileHomePage";
import characterABI from "./src/data/characterABI.json";
import usePlayerStats from "./src/hooks/usePlayerStats";
import HorizontalStats from "./src/components/HorizontalStats";
// Import NFT components
import NFTVerificationPage from "./src/pages/NFTVerificationPage";
// Import Farcaster utilities
import { initFarcasterSDK, isInFarcasterFrame } from "./src/utils/farcaster";

// Debug information to help troubleshoot mobile display issues
console.log("Root App.jsx loading. If you see this, the root App.jsx is being used, not src/App.jsx");

// IMPORTANT: Add a global helper function to detect verification page
// This ensures we have a consistent check that can be called from anywhere
window.isVerificationPage = function() {
  const pathname = window.location.pathname;
  const fullUrl = window.location.href;
  const searchParams = new URLSearchParams(window.location.search);
  
  const result = (
    pathname === '/verify' || 
    pathname.startsWith('/verify') ||
    fullUrl.includes('/verify') ||
    searchParams.has('verification') ||
    fullUrl.includes('verification=true') ||
    window.__ON_VERIFICATION_PAGE__ === true ||
    document.body.classList.contains('verification-page') ||
    document.body.getAttribute('data-page') === 'verify'
  );
  console.log(`🔍 Global verification check: ${result} for path ${pathname}`);
  return result;
}

// Force redirect to mobile view if needed (after wallet connection)
function forceMobileRedirect() {
  // IMPROVED verification check - multiple methods
  const pathname = window.location.pathname;
  const fullUrl = window.location.href;
  
  // CRITICAL: Special check for URL parameter - most important case
  if (fullUrl.includes('verification=true')) {
    console.log('🔥 EMERGENCY DETECTION - verification=true parameter found, skipping mobile redirect');
    window.__ON_VERIFICATION_PAGE__ = true;
    document.body.classList.add('verification-page');
    document.body.setAttribute('data-page', 'verify');
    // Force NOT mobile
    window.__FORCE_MOBILE_VIEW__ = false;
    localStorage.removeItem('isMobileDevice');
    sessionStorage.removeItem('isMobileDevice');
    return false;
  }
  
  // Fix: Check both www and non-www versions for verify path
  const isVerifyPage = (
    pathname === '/verify' || 
    pathname.startsWith('/verify') ||
    fullUrl.includes('/verify') ||
    window.__ON_VERIFICATION_PAGE__ === true ||
    document.body.classList.contains('verification-page') || 
    document.body.getAttribute('data-page') === 'verify'
  );
  
  if (isVerifyPage) {
    console.log('✅ Verification page detected, skipping mobile redirect');
    
    // Make sure verification flags are set
    window.__ON_VERIFICATION_PAGE__ = true;
    document.body.classList.add('verification-page');
    document.body.setAttribute('data-page', 'verify');
    
    return false;
  }
  
  // Check flag in window object (set by MobileHomePage)
  if ((window.__FORCE_MOBILE_VIEW__ || detectMobile()) && !document.querySelector('.mobile-container')) {
    console.log('Forcing redirect to mobile view');
    
    // Get the current URL and preserve the full path and hash
    const currentUrl = new URL(window.location.href);
    
    // Add mobile parameters without changing the pathname
    currentUrl.searchParams.set('isMobile', 'true');
    currentUrl.searchParams.set('forceReload', Date.now().toString());
    
    // Use the full URL including path
    const redirectUrl = currentUrl.toString();
    console.log('Redirecting to:', redirectUrl);
    
    // Force reload to apply changes
    setTimeout(() => {
      window.location.href = redirectUrl;
    }, 100);
    return true;
  }
  return false;
}

// Force mobile detection function - multiple strategies for reliability
function detectMobile() {
  // CRITICAL: First check if we're on verification path - ALWAYS return false
  const pathname = window.location.pathname;
  const fullUrl = window.location.href;
  const searchParams = new URLSearchParams(window.location.search);
  
  const verifyMatch = (
    pathname === '/verify' || 
    pathname.startsWith('/verify') ||
    fullUrl.includes('/verify') ||
    searchParams.has('verification') ||
    fullUrl.includes('verification=true') ||
    window.__ON_VERIFICATION_PAGE__ === true ||
    document.body.classList.contains('verification-page') || 
    document.body.getAttribute('data-page') === 'verify'
  );
  
  // ALWAYS force desktop mode (non-mobile) for verification page
  if (verifyMatch) {
    console.log('🛑 detectMobile: On verification page - forcing NON-mobile mode');
    
    // Ensure proper flags are set
    window.__ON_VERIFICATION_PAGE__ = true;
    window.__FORCE_MOBILE_VIEW__ = false;
    
    // Remove any incorrect flags
    localStorage.removeItem('isMobileDevice');
    sessionStorage.removeItem('isMobileDevice');
    
    // Ensure body has correct classes
    if (document.body) {
      document.body.classList.add('verification-page');
      document.body.setAttribute('data-page', 'verify');
    }
    
    return false;
  }
  
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
  
  // CRITICAL FIX: Immediate check for verification=true parameter
  const currentUrl = window.location.href;
  if (currentUrl.includes('verification=true') || currentUrl.includes('/verify')) {
    console.log('🚨 EMERGENCY VERIFICATION CHECK - Found verification=true in URL:', currentUrl);
    window.__ON_VERIFICATION_PAGE__ = true;
    document.body.classList.add('verification-page');
    document.body.setAttribute('data-page', 'verify');
    
    // Force verification flags
    window.__FORCE_MOBILE_VIEW__ = false;
    localStorage.removeItem('isMobileDevice');
    sessionStorage.removeItem('isMobileDevice');
    
    // Return NFTVerificationPage immediately - nothing else runs
    return <NFTVerificationPage />;
  }
  
  // Immediate verification path check - Do this first thing before any other logic
  const pathname = window.location.pathname;
  const fullUrl = window.location.href;
  const searchParams = new URLSearchParams(window.location.search);
  
  // ENHANCED: Check verification path with more conditions
  const isDirectVerifyPath = (
    pathname === '/verify' || 
    pathname.startsWith('/verify') || 
    fullUrl.includes('/verify') ||
    searchParams.has('verification') ||
    window.__VERIFY_EMERGENCY_DETECTION__ === true ||
    window.__ON_VERIFICATION_PAGE__ === true ||
    document.body.classList.contains('verification-page') ||
    document.body.getAttribute('data-page') === 'verify' ||
    window.isVerificationPage?.() === true
  );
  
  // Special quick check - if on /verify path, render verification page immediately
  if (isDirectVerifyPath) {
    console.log('🚨 CRITICAL PATH DETECTION - Verification path detected EARLY: ', pathname);
    console.log('🚨 Bypassing all other logic and rendering verification page immediately');
    
    // Set verification flags to ensure other code respects this
    window.__ON_VERIFICATION_PAGE__ = true;
    window.__VERIFY_EMERGENCY_DETECTION__ = true;
    document.body.classList.add('verification-page');
    document.body.setAttribute('data-page', 'verify');
    
    // Set a global function that can be checked anywhere
    window.isVerificationPage = function() { return true; };
    
    // Return verification page immediately
    return <NFTVerificationPage />;
  }
  
  // Continue with regular App logic only if not on verification path
  console.log("📱 Mobile detection running - not on verification path");
  
  // Get current location from React Router
  const location = useLocation();
  
  // Enhanced verification page detection with more comprehensive checks
  const rawPathname = location.pathname;
  
  // Debug logging of URL information
  console.log("🔍 DEBUG PATH INFO:", {
    pathname: rawPathname,
    search: location.search,
    fullUrl: fullUrl,
    urlObject: new URL(fullUrl),
    isMobile: detectMobile(),
    hasMobileFlag: window.__FORCE_MOBILE_VIEW__,
    mobileStorage: localStorage.getItem('isMobileDevice')
  });
  
  // Multi-layered verification page detection - React Router location + window.location
  const reactRouterVerify = (
    rawPathname === '/verify' || 
    rawPathname.startsWith('/verify')
  );
  
  const windowLocationVerify = (
    window.location.pathname === '/verify' ||
    window.location.pathname.startsWith('/verify') ||
    fullUrl.includes('/verify')
  );
  
  // Additional checks for verification flags set by the NFTVerification component
  const flagsVerify = (
    window.__ON_VERIFICATION_PAGE__ === true ||
    document.body.classList.contains('verification-page') || 
    document.body.getAttribute('data-page') === 'verify'
  );
  
  // Combine all checks to ensure we catch the verification page
  const isVerificationPage = reactRouterVerify || windowLocationVerify || flagsVerify || window.isVerificationPage();
  
  console.log("🎯 VERIFICATION PAGE CHECK:", {
    reactRouterVerify,
    windowLocationVerify,
    flagsVerify,
    globalCheck: window.isVerificationPage(),
    finalResult: isVerificationPage
  });
  
  // Only force redirect if NOT on the verification page
  if (!isVerificationPage && forceMobileRedirect()) {
    // Return loading state since we're about to redirect
    return <div>Loading...</div>;
  }
  
  // CRITICAL: If we're on the verification page, render it immediately
  // without any other checks or conditions
  if (isVerificationPage) {
    console.log('👉 Rendering NFTVerificationPage - Verification path detected!');
    return <NFTVerificationPage />;
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
    // Check if we're on the verification page
    if (isVerificationPage) {
      console.log('On verification page, not forcing redirect');
      return;
    }
    
    // Force redirect check
    if (forceMobileRedirect()) return;
    
    // Set mobile state
    const currentIsMobile = detectMobile();
    setIsMobile(currentIsMobile);
    
    // Set up visibility change handler for wallet redirects
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Recheck verification page status on visibility change
        const currentVerifyPage = window.isVerificationPage();
        
        // Check if we need to force a redirect (after wallet connection)
        if (!currentVerifyPage && !forceMobileRedirect()) {
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
  }, [isVerificationPage]);

  // Special handler for wallet connection 
  useEffect(() => {
    // Check for wallet connection completion
    const checkWalletConnection = () => {
      // First check if on verification page - NEVER redirect in that case
      if (window.location.pathname === '/verify' || 
          window.location.pathname.startsWith('/verify') ||
          window.location.href.includes('/verify') ||
          window.__ON_VERIFICATION_PAGE__ === true ||
          document.body.classList.contains('verification-page') || 
          document.body.getAttribute('data-page') === 'verify') {
        console.log('On verification page, not checking wallet connection for mobile redirection');
        return;
      }
      
      // Skip if we're on the verification page
      if (window.isVerificationPage()) return;
      
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
              if (!document.querySelector('.mobile-container') && !window.isVerificationPage()) {
                console.log('Wallet connected but not in mobile view - forcing redirect');
                forceMobileRedirect();
              }
            }
          })
          .catch(err => console.error('Error checking accounts:', err));
      }
    };
    
    // Only run this effect if not on the verification page
    if (!isVerificationPage) {
      // Check initially and on account changes
      checkWalletConnection();
      
      if (window.ethereum) {
        // Handle wallet connection events
        const handleAccountsChanged = () => {
          if (!window.isVerificationPage()) {
            checkWalletConnection();
            // Double-check after a delay to catch post-redirect state
            setTimeout(checkWalletConnection, 500);
          }
        };
        
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('connect', handleAccountsChanged);
        
        return () => {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('connect', handleAccountsChanged);
        };
      }
    }
  }, [isVerificationPage]);

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
          if (accounts.length > 0 && detectMobile() && !document.querySelector('.mobile-container') && !window.isVerificationPage()) {
            forceMobileRedirect();
          }
        } catch (error) {
          console.error("Failed to set up ethers:", error);
        }
      }
    };
    
    setupEthers();
  }, [isVerificationPage]);

  // Add resize listener to handle orientation changes
  useEffect(() => {
    const handleResize = () => {
      const shouldBeMobile = detectMobile();
      if (shouldBeMobile !== isMobile) {
        setIsMobile(shouldBeMobile);
        
        // If we switched to mobile but don't have the UI, force reload
        if (shouldBeMobile && !document.querySelector('.mobile-container') && !window.isVerificationPage()) {
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
  }, [isMobile, isVerificationPage]);

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
    // Skip this effect if on verification page
    if (window.isVerificationPage()) return;
    
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
  
  // Log the pathname for debugging
  console.log('⚠️ CRITICAL PATH CHECK ⚠️');
  console.log('CURRENT PATHNAME:', rawPathname);
  console.log('FULL URL:', fullUrl);
  console.log('IS VERIFICATION PAGE:', isVerificationPage);
  
  // Additional verification check using direct window.location
  // This ensures we catch verification pages in all scenarios
  const finalVerificationCheck = (
    window.location.pathname === '/verify' || 
    window.location.pathname.startsWith('/verify') || 
    window.location.href.includes('/verify') ||
    window.location.href.includes('verification=true') ||
    searchParams.has('verification') ||
    isVerificationPage
  );
  
  // VERIFICATION PAGE CHECK - Must be FIRST before any mobile checks
  // If we're on the verification page, render it regardless of mobile/desktop
  if (finalVerificationCheck) {
    console.log('👉 Rendering NFTVerificationPage from main render logic');
    // This return MUST happen before any other rendering logic
    return <NFTVerificationPage />;
  }
  
  // For non-verification pages, check if we should use mobile view
  if (isMobile || forcedMobileCheck || localStorage.getItem('isMobileDevice') === 'true' || window.__FORCE_MOBILE_VIEW__) {
    console.log('Rendering mobile view');
    
    // DOUBLE CHECK we're not on verification page before rendering mobile
    if (window.location.pathname === '/verify' || 
        window.location.pathname.startsWith('/verify') || 
        window.location.href.includes('/verify')) {
      console.log('⚠️ Last minute verification path detected - rendering verification page');
      return <NFTVerificationPage />;
    }
    
    // For all other routes on mobile, render MobileHomePage
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

  // FINAL VERIFICATION CHECK - Make absolutely sure we're not on verification path
  // This catches any edge cases where verification wasn't detected earlier
  if (window.location.pathname === '/verify' || 
      window.location.pathname.startsWith('/verify') || 
      window.location.href.includes('/verify') ||
      window.location.href.includes('verification=true') ||
      searchParams.has('verification')) {
    console.log('⚠️ Last chance verification path detected - rendering verification page');
    return <NFTVerificationPage />;
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