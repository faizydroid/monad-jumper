import React, { useEffect, useState, useRef, useMemo } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import './MobileHomePage.css';
import Navbar from './Navbar';
import Leaderboard from './Leaderboard';
import HorizontalStats from './HorizontalStats';
import usePlayerStats from '../hooks/usePlayerStats';

// Custom ConnectButton wrapper to force mobile view after connection
const MobileConnectButton = (props) => {
  // Set a global flag that won't be cleared by redirects
  useEffect(() => {
    // Check if URL has desktop mode parameter
    if (window.location.search.includes('mode=desktop')) {
      console.log('Desktop mode override detected - not setting mobile flags');
      return;
    }
    
    // Set a flag in window that will persist during the session
    window.__FORCE_MOBILE_VIEW__ = true;
    
    // Set flags in storage that persist through redirects
    localStorage.setItem('isMobileDevice', 'true');
    sessionStorage.setItem('isMobileDevice', 'true');
    
    // Force the mobile meta viewport
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    } else {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.head.appendChild(meta);
    }
    
    // Add a handler for the connection flow
    const handleRedirectBack = () => {
      // Force back to mobile view after redirect
      const mobileFlag = document.createElement('div');
      mobileFlag.id = '__force_mobile_view__';
      mobileFlag.style.display = 'none';
      document.body.appendChild(mobileFlag);
      
      // Force URL parameter
      const url = new URL(window.location.href);
      url.searchParams.set('isMobile', 'true');
      window.history.replaceState({}, '', url.toString());
      
      // Force reload if needed (last resort)
      if (!document.querySelector('.mobile-container')) {
        const currentUrl = window.location.href;
        const redirectUrl = currentUrl.split('?')[0] + '?isMobile=true';
        window.location.href = redirectUrl;
      }
    };
    
    window.addEventListener('focus', handleRedirectBack);
    window.addEventListener('visibilitychange', handleRedirectBack);
    
    return () => {
      window.removeEventListener('focus', handleRedirectBack);
      window.removeEventListener('visibilitychange', handleRedirectBack);
    };
  }, []);
  
  return <ConnectButton {...props} />;
};

const MobileHomePage = ({ 
  characterImg, 
  onPlay, 
  onMint,
  hasMintedNft,
  isNftLoading,
  leaderboard,
  address
}) => {
  const { isConnected } = useAccount();
  const [showNavbar, setShowNavbar] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isTrueMobileDevice, setIsTrueMobileDevice] = useState(false);
  
  // Get player stats directly from the hook
  const {
    playerHighScore,
    totalJumps,
    gamesPlayed,
    gameSessionsCount,
    jumpRank,
    scoreRank
  } = usePlayerStats();
  
  // Use the higher value between gamesPlayed and gameSessionsCount
  const totalGames = gameSessionsCount > gamesPlayed ? gameSessionsCount : gamesPlayed;
  
  // Get player rank from leaderboard - same implementation as in App.jsx
  const getPlayerRank = () => {
    // First check the cached rank
    if (scoreRank) {
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

  // Log when stats update in mobile view
  useEffect(() => {
    console.log('MOBILE STATS:', { 
      playerHighScore, 
      totalJumps, 
      jumpRank, 
      scoreRank, 
      totalGames 
    });
  }, [playerHighScore, totalJumps, jumpRank, scoreRank, totalGames]);
  
  // Set mobile flags on component mount
  useEffect(() => {
    // Check if URL has desktop mode parameter
    if (window.location.search.includes('mode=desktop')) {
      console.log('Desktop mode override detected - not setting mobile flags in MobileHomePage');
      return;
    }
    
    // Check if this is actually a desktop device with large screen
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isSmallScreen = window.innerWidth <= 768;
    
    // ALWAYS set to false to disable the coming soon overlay
    setIsTrueMobileDevice(false);
    
    // Don't set mobile flags if this is clearly a desktop device with large screen
    if (!isMobileDevice && !isSmallScreen && window.innerWidth > 1024) {
      console.log('Desktop device detected - not setting mobile flags in MobileHomePage');
      return;
    }
    
    // Continue with mobile setup for actual mobile devices or small screens
    if (isMobileDevice || isSmallScreen) {
      // Set all persistence markers
      window.__FORCE_MOBILE_VIEW__ = true;
      localStorage.setItem('isMobileDevice', 'true');
      sessionStorage.setItem('isMobileDevice', 'true');
      
      // Create a hidden marker element
      if (!document.getElementById('__mobile_view_active__')) {
        const marker = document.createElement('div');
        marker.id = '__mobile_view_active__';
        marker.style.display = 'none';
        document.body.appendChild(marker);
      }
      
      // Set URL parameter if needed
      const url = new URL(window.location.href);
      if (url.searchParams.get('isMobile') !== 'true') {
        url.searchParams.set('isMobile', 'true');
        // Update URL without reload
        window.history.replaceState({}, '', url.toString());
      }
      
      // Apply full-viewport body styling
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.background = 'linear-gradient(180deg, #1E90FF 0%, #87CEEB 100%)';
      
      // Handle visibility changes (for when returning from wallet connect)
      const checkMobileState = () => {
        // If we somehow lost our mobile container class, force refresh
        if (!document.querySelector('.mobile-container')) {
          url.searchParams.set('isMobile', 'true');
          url.searchParams.set('reload', Date.now().toString());
          window.location.href = url.toString();
        }
      };
      
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          setTimeout(checkMobileState, 200);
        }
      });
      
      return () => {
        document.removeEventListener('visibilitychange', checkMobileState);
      };
    }
  }, []);

  // Add adaptive viewport meta tag update
  useEffect(() => {
    // Find or create viewport meta tag for proper mobile scaling
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    
    // Set viewport content based on device height to ensure appropriate scaling
    const height = window.innerHeight;
    if (height < 600) {
      // For very small screens
      viewport.content = 'width=device-width, initial-scale=0.9, maximum-scale=0.9, user-scalable=no';
    } else {
      // For normal size screens
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    }
    
    // Handle resize events
    const handleResize = () => {
      const height = window.innerHeight;
      if (height < 600) {
        viewport.content = 'width=device-width, initial-scale=0.9, maximum-scale=0.9, user-scalable=no';
      } else {
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="mobile-container" style={{
      background: 'url("/images/bg.jpg")',
      backgroundSize: 'cover',
      backgroundPosition: 'center center',
      backgroundRepeat: 'no-repeat',
      height: '100vh',
      maxHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Coming Soon Overlay */}
      {isTrueMobileDevice && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(5px)'
        }}>
          <h1 style={{
            color: 'white',
            fontSize: '3rem',
            fontFamily: '"Bangers", cursive',
            textAlign: 'center',
            marginBottom: '20px',
            textShadow: '0 0 10px rgba(255, 107, 107, 0.8)',
            letterSpacing: '2px'
          }}>
            COMING SOON
          </h1>
          <p style={{
            color: 'white',
            fontSize: '1.2rem',
            textAlign: 'center',
            maxWidth: '80%',
            lineHeight: '1.5',
            textShadow: '0 0 5px rgba(0, 0, 0, 0.8)'
          }}>
            Mobile version in development.<br/>
            Please play on desktop for now.
          </p>
          <button 
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('mode', 'desktop');
              window.location.href = url.toString();
            }}
            style={{
              marginTop: '30px',
              padding: '12px 24px',
              background: 'linear-gradient(90deg, #FF6B6B 0%, #FF5252 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '50px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            Go to Desktop Version
          </button>
        </div>
      )}
      
      {/* Header with menu button and leaderboard icon */}
      <div style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '10px',
        visibility: isConnected ? 'visible' : 'hidden'
      }}>
        <button className="menu-button" 
          onClick={() => setShowNavbar(true)}
          style={{
            background: 'rgba(255, 255, 255, 0.25)',
            border: 'none',
            borderRadius: '12px',
            padding: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
          }}
        >
          <img src="/icon/menu.png" alt="Menu" width="30" height="30" />
        </button>
        
        <button className="leaderboard-button" 
          onClick={() => setShowLeaderboard(true)}
          style={{
            background: 'rgba(255, 255, 255, 0.25)',
            border: 'none',
            borderRadius: '12px',
            padding: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
          }}
        >
          <img src="/icon/leaderboard.png" alt="Leaderboard" width="30" height="30" />
        </button>
      </div>
      
      {/* Game title - using desktop style */}
      <div className="mobile-logo" style={{
        margin: '5px 0 10px',
        textAlign: 'center'
      }}>
        <h1 className="mobile-game-title bangers-font" style={{
          fontSize: '4.5rem',
          color: 'white',
          textTransform: 'uppercase',
          margin: 0,
          // Removing inline style for text-shadow since it's in the CSS class
          textShadow: undefined
        }}>JUMPNADS</h1>
        <p className="bangers-font" style={{
          fontSize: '1rem',
          color: 'white',
          margin: '0 0 0',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}>Jump to the MOON!</p>
      </div>
      
      {/* Character image with better jumping animation */}
      <div className="character-container" style={{
        position: 'relative',
        marginBottom: '10px'
      }}>
        <div style={{
          animation: 'character-jump 1.2s ease-in-out infinite',
          position: 'relative'
        }}>
          <img
            src={characterImg || '/images/monad0.png'}
            alt="Game Character"
            style={{
              width: '130px',
              height: 'auto',
              filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.3))'
            }}
          />
          {/* Character shadow */}
          <div style={{
            position: 'absolute',
            bottom: '-15px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '80px',
            height: '12px',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '50%',
            animation: 'shadow-pulse 1.2s ease-in-out infinite',
            zIndex: -1
          }}></div>
        </div>
      </div>
      
      {/* Stats Card - Using the same code as App.jsx */}
      {isConnected ? (
        <div className="stats-card" style={{
          background: 'rgba(255, 255, 255, 0.8)',
          borderRadius: '15px',
          width: '90%',
          maxWidth: '360px',
          padding: '12px',
          paddingTop: '18px',
          marginBottom: '15px',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
          border: '2px solid rgba(255, 255, 255, 0.7)',
          overflow: 'visible'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gridTemplateRows: 'repeat(3, auto)',
            gap: '15px',
            position: 'relative'
          }}>
            {/* Hi-Score */}
            <div style={{
              gridColumn: '1 / span 2',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px',
              paddingTop: '25px',
              background: 'rgba(255, 255, 255, 0.46)',
              borderRadius: '12px',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '-15px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'white',
                borderRadius: '50%',
                padding: '6px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2
              }}>
                <img src="/icon/score_ico.png" alt="High Score" width="24" height="24" />
              </div>
              <div style={{
                fontSize: '12px',
                color: '#333',
                marginBottom: '2px'
              }}>
                Hi-Score
              </div>
              <div className="bangers-font" style={{
                fontSize: '24px',
                color: '#333',
                fontWeight: 'bold'
              }}>
                {playerHighScore !== undefined ? Number(playerHighScore).toLocaleString() : '0'}
              </div>
            </div>
            
            {/* Jump Rank */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              paddingTop: '25px',
              background: 'rgba(255, 255, 255, 0.4)',
              borderRadius: '12px',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'white',
                borderRadius: '50%',
                padding: '4px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img src="/icon/jump_rank_ico.png" alt="Jump Rank" width="18" height="18" />
              </div>
              <div style={{
                fontSize: '12px',
                color: '#333',
                marginBottom: '2px'
              }}>
                Jump Rank
              </div>
              <div className="bangers-font" style={{
                fontSize: '24px',
                color: '#333',
                fontWeight: 'bold'
              }}>
                {jumpRank || 'N/A'}
              </div>
            </div>
            
            {/* Score Rank */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              paddingTop: '25px',
              background: 'rgba(255, 255, 255, 0.4)',
              borderRadius: '12px',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'white',
                borderRadius: '50%',
                padding: '4px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img src="/icon/score_rank_ico.png" alt="Score Rank" width="18" height="18" />
              </div>
              <div style={{
                fontSize: '12px',
                color: '#333',
                marginBottom: '2px'
              }}>
                ScoreRank
              </div>
              <div className="bangers-font" style={{
                fontSize: '24px',
                color: '#333',
                fontWeight: 'bold'
              }}>
                {scoreRank || 'N/A'}
              </div>
            </div>
            
            {/* Total Jumps */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              paddingTop: '25px',
              background: 'rgba(255, 255, 255, 0.4)',
              borderRadius: '12px',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'white',
                borderRadius: '50%',
                padding: '4px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img src="/icon/jump_ico.png" alt="Total Jumps" width="18" height="18" />
              </div>
              <div style={{
                fontSize: '12px',
                color: '#333',
                marginBottom: '2px'
              }}>
                Total Jumps
              </div>
              <div className="bangers-font" style={{
                fontSize: '24px',
                color: '#333',
                fontWeight: 'bold'
              }}>
                {totalJumps !== undefined ? Number(totalJumps).toLocaleString() : '0'}
              </div>
            </div>
            
            {/* Total Games */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              paddingTop: '25px',
              background: 'rgba(255, 255, 255, 0.4)',
              borderRadius: '12px',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'white',
                borderRadius: '50%',
                padding: '4px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img src="/icon/game_ico.png" alt="Total Games" width="18" height="18" />
              </div>
              <div style={{
                fontSize: '12px',
                color: '#333',
                marginBottom: '2px'
              }}>
                Total Games
              </div>
              <div className="bangers-font" style={{
                fontSize: '24px',
                color: '#333',
                fontWeight: 'bold'
              }}>
                {totalGames || 0}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mobile-connect-container" style={{
          marginBottom: '30px',
          background: 'rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          padding: '25px 20px',
          width: '90%',
          maxWidth: '360px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
        }}>
          <div className="wallet-icon" style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg,rgb(72, 255, 234),rgb(33, 95, 240))',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '15px',
            boxShadow: '0 5px 15px rgba(93, 93, 93, 0.4)'
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 7V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7C3 5.89543 3.89543 5 5 5H19C20.1046 5 21 5.89543 21 7Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12H17C15.8954 12 15 11.1046 15 10C15 8.89543 15.8954 8 17 8H21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="17" cy="10" r="1" fill="white"/>
            </svg>
          </div>
          
          <h3 className="bangers-font" style={{
            color: 'white',
            fontSize: '1.6rem',
            margin: '0 0 5px 0',
            textAlign: 'center',
            letterSpacing: '1.2px',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
          }}>CONNECT WALLET</h3>
          
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '1rem',
            margin: '0 0 20px 0',
            textAlign: 'center',
            letterSpacing: '1.5px',
            lineHeight: '1.4'
          }}>Start your jumping journey</p>
          
          <div className="connect-btn-wrapper" style={{ 
            width: '100%',
            maxWidth: '280px',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '30px'
          }}>
            <div className="btn-glow" style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%)',
              animation: 'shine 3s infinite linear',
              zIndex: 1,
              pointerEvents: 'none'
            }}></div>
            <MobileConnectButton 
              showBalance={false}
              chainStatus="none"
              accountStatus="address"
              label="Connect Wallet"
              className="mobile-connect-btn"
            />
          </div>
        </div>
      )}
      
      {/* Action button container with positioning to push to bottom */}
      <div style={{ 
        width: '100%',
        maxWidth: '360px',
        marginTop: '20px',
        marginBottom: '20px',
        paddingBottom: 'env(safe-area-inset-bottom, 10px)'
      }}>
        {!isConnected ? (
          <div style={{ marginBottom: '20px', width: '100%', display: 'none' }}>
            <MobileConnectButton 
                showBalance={false}
                chainStatus="none"
                accountStatus="address"
                label="Connect Wallet"
              />
            </div>
        ) : isNftLoading ? (
          <div style={{ 
            width: '50px', 
            height: '50px', 
            margin: '0 auto',
            borderRadius: '50%',
            border: '5px solid rgba(255,255,255,0.3)',
            borderTopColor: 'white',
            animation: 'spin 1s linear infinite'
          }}></div>
        ) : hasMintedNft ? (
            <button 
              onClick={onPlay}
              className="play-button-mobile bangers-font"
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #57BB5D 0%, #3D9142 100%)',
                border: 'none',
                borderRadius: '50px',
                padding: '15px 20px',
                color: 'white',
                fontSize: '24px',
                cursor: 'pointer',
                boxShadow: '0 6px 0 #2C6B30, 0 10px 20px rgba(0, 0, 0, 0.25)',
                marginBottom: '15px',
                textTransform: 'uppercase',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.3s, box-shadow 0.3s',
                letterSpacing: '1px',
                textShadow: '2px 2px 0 #2C6B30'
              }}
            >
              PLAY NOW
              <div className="button-glow" style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%)',
                transform: 'rotate(30deg)',
                pointerEvents: 'none'
              }}></div>
            </button>
        ) : (
            <button 
              onClick={onMint}
              className="mint-button-mobile bangers-font"
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #FF7E54 0%, #E8553A 100%)',
                border: 'none',
                borderRadius: '50px',
                padding: '15px 20px',
                color: 'white',
                fontSize: '24px',
                cursor: 'pointer',
                boxShadow: '0 6px 0 #BE3A22, 0 10px 20px rgba(0, 0, 0, 0.25)',
                marginBottom: '15px',
                textTransform: 'uppercase',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.3s, box-shadow 0.3s',
                letterSpacing: '1px',
                textShadow: '2px 2px 0 #BE3A22'
              }}
            >
              MINT TO PLAY
              <div className="button-glow" style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%)',
                transform: 'rotate(30deg)',
                pointerEvents: 'none'
              }}></div>
            </button>
        )}
      </div>
      
      {/* Dev connection status (only in dev mode) */}
      {process.env.NODE_ENV !== 'production' && (
        <div style={{
          position: 'fixed',
          bottom: 5,
          left: 5,
          fontSize: '10px',
          opacity: 0.7,
          color: 'white'
        }}>
          {isConnected ? `Connected: ${window.ethereum?.selectedAddress?.slice(0,6)}...${window.ethereum?.selectedAddress?.slice(-4)}` : 'Not connected'}
        </div>
      )}
      
      {/* Cloud decorations with better styling */}
      <div className="cloud-decoration" style={{
        position: 'absolute',
        top: '20%',
        left: '10%',
        width: '80px',
        height: '40px',
        background: 'rgba(255, 255, 255, 0.5)',
        borderRadius: '20px',
        zIndex: -1,
        animation: 'cloud-float 20s linear infinite'
      }}></div>
      <div className="cloud-decoration" style={{
        position: 'absolute',
        top: '35%',
        right: '15%',
        width: '60px',
        height: '30px',
        background: 'rgba(255, 255, 255, 0.4)',
        borderRadius: '15px',
        zIndex: -1,
        animation: 'cloud-float-reverse 15s linear infinite'
      }}></div>
      <div className="cloud-decoration" style={{
        position: 'absolute',
        bottom: '25%',
        left: '20%',
        width: '100px',
        height: '50px',
        background: 'rgba(255, 255, 255, 0.3)',
        borderRadius: '25px',
        zIndex: -1,
        animation: 'cloud-float 25s linear infinite'
      }}></div>
      
      {/* Add animations for the character and clouds */}
      <style>
        {`
          @keyframes character-jump {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
          }
          
          @keyframes shadow-pulse {
            0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.2; }
            50% { transform: translateX(-50%) scale(0.6); opacity: 0.1; }
          }
          
          @keyframes cloud-float {
            0% { transform: translateX(0); }
            50% { transform: translateX(20px); }
            100% { transform: translateX(0); }
          }
          
          @keyframes cloud-float-reverse {
            0% { transform: translateX(0); }
            50% { transform: translateX(-20px); }
            100% { transform: translateX(0); }
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .play-button-mobile:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4), 0 0 30px rgba(76, 175, 80, 0.3);
          }
          
          .play-button-mobile:active {
            transform: translateY(1px);
            box-shadow: 0 2px 10px rgba(76, 175, 80, 0.3);
          }
          
          @media screen and (max-height: 700px) {
            .stats-card {
              transform: scale(0.9);
              margin-bottom: 5px !important;
            }
            .character-container img {
              width: 120px !important;
            }
            .mobile-game-title {
              font-size: 4rem !important;
            }
            .play-button-mobile, .mint-button-mobile {
              padding: 12px 15px !important;
              font-size: 22px !important;
              margin-bottom: 10px !important;
            }
          }
          @media screen and (max-height: 600px) {
            .stats-card {
              transform: scale(0.85);
              margin-bottom: 0 !important;
            }
            .character-container img {
              width: 100px !important;
            }
            .mobile-game-title {
              font-size: 3.5rem !important;
            }
            .mobile-subtitle {
              font-size: 0.9rem !important;
            }
            .play-button-mobile, .mint-button-mobile {
              padding: 10px 12px !important;
              font-size: 20px !important;
              margin-bottom: 8px !important;
              box-shadow: 0 4px 0 #2C6B30, 0 8px 16px rgba(0, 0, 0, 0.25) !important;
            }
            .mint-button-mobile {
              box-shadow: 0 4px 0 #BE3A22, 0 8px 16px rgba(0, 0, 0, 0.25) !important;
            }
            .stats-card > div {
              gap: 15px !important;
            }
          }
          @media screen and (max-height: 500px) {
            .mobile-container {
              padding: 5px !important;
            }
            .character-container {
              margin-bottom: 5px !important;
            }
            .stats-card {
              transform: scale(0.8);
              margin-bottom: 0 !important;
            }
            .mobile-game-title {
              font-size: 3rem !important;
            }
            .cloud-decoration {
              display: none !important;
            }
            .stats-card > div > div {
              padding-top: 22px !important;
            }
            .stats-card > div > div > div:first-child {
              top: -8px !important;
              width: 24px !important;
              height: 24px !important;
              padding: 3px !important;
            }
            .stats-card > div > div > div:first-child img {
              width: 16px !important;
              height: 16px !important;
            }
            .play-button-mobile, .mint-button-mobile {
              padding: 8px 10px !important;
              margin-top: 5px !important;
            }
          }
        `}
      </style>
      
      {/* Sliding Navbar Panel - using Navbar component */}
      <div className={`mobile-slide-panel left ${showNavbar ? 'open' : ''}`}
           onClick={() => setShowNavbar(false)}>
        <div className="panel-content" onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowNavbar(false)} className="close-btn"
                  style={{
                    position: 'absolute',
                    top: '15px',
                    right: '15px',
                    background: 'rgba(0, 0, 0, 0.1)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    cursor: 'pointer'
                  }}>×</button>
          <Navbar onClose={() => setShowNavbar(false)} mobileView={true} />
        </div>
      </div>
      
      {/* Sliding Leaderboard Panel */}
      <div className={`mobile-slide-panel right ${showLeaderboard ? 'open' : ''}`}
           onClick={() => setShowLeaderboard(false)}>
        <div className="panel-content" onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowLeaderboard(false)} className="close-btn"
                  style={{
                    position: 'absolute',
                    top: '15px',
                    left: '15px',
                    background: 'rgba(0, 0, 0, 0.1)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    cursor: 'pointer'
                  }}>×</button>
          <Leaderboard inMobilePanel={true} />
        </div>
      </div>
    </div>
  );
};

export default MobileHomePage; 