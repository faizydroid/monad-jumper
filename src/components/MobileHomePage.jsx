import React, { useEffect, useState, useRef } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import './MobileHomePage.css';
import { useWeb3 } from '../contexts/Web3Context';
import Navbar from './Navbar';
import Leaderboard from './Leaderboard';
import { usePlayerStats } from '../hooks/usePlayerStats';

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
  isNftLoading 
}) => {
  const { isConnected, address } = useAccount();
  const { playerHighScore, totalJumps, username, leaderboard } = useWeb3();
  const [showNavbar, setShowNavbar] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isTrueMobileDevice, setIsTrueMobileDevice] = useState(false);
  
  // Use the shared player stats hook instead of local state and DOM extraction
  const { jumpRank, scoreRank, totalGames, isLoading } = usePlayerStats();

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
    
    // Set state for true mobile devices
    setIsTrueMobileDevice(isMobileDevice || (isSmallScreen && window.innerWidth <= 600));
    
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

  // Get total games played count
  const getTotalGames = () => {
    return totalGames;
  };

  return (
    <div className="mobile-container" style={{
      background: 'url("/images/bg.jpg")',
      backgroundSize: 'cover',
      backgroundPosition: 'center center',
      backgroundRepeat: 'no-repeat',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Coming Soon Overlay - Only show on true mobile devices */}
      {isTrueMobileDevice && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(6px)'
        }}>
          <h1 className="bangers-font" style={{
            fontSize: '4rem',
            color: 'white',
            textShadow: '0 0 20px rgba(255, 255, 255, 0.5), 0 0 30px rgba(255, 255, 255, 0.3)',
            margin: '0 0 20px 0',
            textAlign: 'center',
            letterSpacing: '3px'
          }}>COMING SOON</h1>
          <p style={{
            color: 'white',
            fontSize: '1.2rem',
            maxWidth: '80%',
            textAlign: 'center',
            margin: '0 0 30px 0',
            lineHeight: '1.5'
          }}>Mobile version is under development</p>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            border: '5px solid rgba(255,255,255,0.3)',
            borderTopColor: 'white',
            animation: 'spin 1s linear infinite',
            margin: '10px 0'
          }}></div>
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
            background: 'none',
            border: 'none',
            padding: '10px',
            cursor: 'pointer'
          }}
        >
          <div style={{
            width: '30px',
            height: '4px',
            background: 'black',
            marginBottom: '6px'
          }}></div>
          <div style={{
            width: '30px',
            height: '4px',
            background: 'black',
            marginBottom: '6px'
          }}></div>
          <div style={{
            width: '30px',
            height: '4px',
            background: 'black'
          }}></div>
        </button>
        
        <button className="leaderboard-button" 
          onClick={() => setShowLeaderboard(true)}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px',
            cursor: 'pointer'
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 5V19H19V5H5Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 8L14 12H10L12 8Z" fill="black"/>
            <path d="M9 15H7V17H9V15Z" fill="black"/>
            <path d="M13 13H11V17H13V13Z" fill="black"/>
            <path d="M17 11H15V17H17V11Z" fill="black"/>
          </svg>
        </button>
      </div>
      
      {/* Game title - using desktop style */}
      <div className="mobile-logo" style={{
        margin: '10px 0 20px',
        textAlign: 'center'
      }}>
        <h1 className="mobile-game-title bangers-font" style={{
          fontSize: '5rem',
          color: 'white',
          textTransform: 'uppercase',
          margin: 0,
          // Removing inline style for text-shadow since it's in the CSS class
          textShadow: undefined
        }}>JUMPNADS</h1>
        <p className="bangers-font" style={{
          fontSize: '1.2rem',
          color: 'white',
          margin: '5px 0 0',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}>Jump to the MOON!</p>
      </div>
      
      {/* Character image with better jumping animation */}
      <div className="character-container" style={{
        position: 'relative',
        marginBottom: '20px'
      }}>
        <div style={{
          animation: 'character-jump 1.2s ease-in-out infinite',
          position: 'relative'
        }}>
          <img
            src={characterImg || '/images/monad0.png'}
            alt="Game Character"
            style={{
              width: '150px',
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
      
      {/* Stats Card */}
      {isConnected ? (
        <div className="stats-card" style={{
          background: 'rgba(255, 255, 255, 0.8)',
          borderRadius: '15px',
          width: '90%',
          maxWidth: '360px',
          padding: '15px',
          marginBottom: '30px',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
          border: '2px solid rgba(255, 255, 255, 0.7)'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gridTemplateRows: 'repeat(3, auto)',
            gap: '12px'
          }}>
            {/* Hi-Score */}
            <div style={{
              gridColumn: '1 / span 2',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '15px',
              background: 'rgba(255, 255, 255, 0.46)',
              borderRadius: '12px',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '10px',
                left: '50%',
                transform: 'translateX(-50%)'
              }}>
                <img src="/icon/score_ico.png" alt="High Score" width="28" height="28" />
              </div>
              <div style={{
                fontSize: '14px',
                color: '#333',
                marginBottom: '5px',
                marginTop: '20px'
              }}>
                Hi-Score
              </div>
              <div className="bangers-font" style={{
                fontSize: '36px',
                color: '#333',
                fontWeight: 'bold'
              }}>
                {playerHighScore || 0}
              </div>
            </div>
            
            {/* Jump Rank */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '15px',
              background: 'rgba(255, 255, 255, 0.4)',
              borderRadius: '12px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px'
              }}>
                <img src="/icon/jump_rank_ico.png" alt="Jump Rank" width="28" height="28" />
              </div>
              <div style={{
                fontSize: '14px',
                color: '#333',
                marginBottom: '5px'
              }}>
                Jump Rank
              </div>
              <div className="bangers-font" style={{
                fontSize: '28px',
                color: '#333',
                fontWeight: 'bold'
              }}>
                {isLoading.jumpRank ? 
                  <span style={{fontSize: '18px'}}>LOADING...</span> : 
                  jumpRank}
              </div>
            </div>
            
            {/* Score Rank */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '15px',
              background: 'rgba(255, 255, 255, 0.4)',
              borderRadius: '12px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px'
              }}>
                <img src="/icon/score_rank_ico.png" alt="Score Rank" width="28" height="28" />
              </div>
              <div style={{
                fontSize: '14px',
                color: '#333',
                marginBottom: '5px'
              }}>
                ScoreRank
              </div>
              <div className="bangers-font" style={{
                fontSize: '28px',
                color: '#333',
                fontWeight: 'bold'
              }}>
                {isLoading.scoreRank ? 
                  <span style={{fontSize: '18px'}}>LOADING...</span> : 
                  scoreRank}
              </div>
            </div>
            
            {/* Total Jumps */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '15px',
              background: 'rgba(255, 255, 255, 0.4)',
              borderRadius: '12px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px'
              }}>
                <img src="/icon/jump_ico.png" alt="Total Jumps" width="28" height="28" />
              </div>
              <div style={{
                fontSize: '14px',
                color: '#333',
                marginBottom: '5px'
              }}>
                Total Jumps
              </div>
              <div className="bangers-font" style={{
                fontSize: '28px',
                color: '#333',
                fontWeight: 'bold'
              }}>
                {totalJumps?.toLocaleString() || '0'}
              </div>
            </div>
            
            {/* Total Games */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '15px',
              background: 'rgba(255, 255, 255, 0.4)',
              borderRadius: '12px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px'
              }}>
                <img src="/icon/game_ico.png" alt="Total Games" width="28" height="28" />
              </div>
              <div style={{
                fontSize: '14px',
                color: '#333',
                marginBottom: '5px'
              }}>
                Total Games
              </div>
              <div className="bangers-font" style={{
                fontSize: '28px',
                color: '#333',
                fontWeight: 'bold'
              }}>
                {getTotalGames()}
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
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'flex-end',
        width: '100%',
        maxWidth: '360px',
        marginTop: '20px'
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
                background: 'linear-gradient(135deg, #4CAF50 0%, #45A049 100%)',
                border: 'none',
                borderRadius: '50px',
                padding: '15px 30px',
                color: 'white',
                fontSize: '28px',
                cursor: 'pointer',
                boxShadow: '0 8px 0 #3A8F3E, 0 14px 24px rgba(0, 0, 0, 0.25)',
                marginBottom: '20px',
                textTransform: 'uppercase',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.3s, box-shadow 0.3s',
                letterSpacing: '1px',
                textShadow: '2px 2px 0 #3A8F3E'
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
                background: 'linear-gradient(135deg, #FF6B6B 0%, #FF5252 100%)',
                border: 'none',
                borderRadius: '50px',
                padding: '15px 30px',
                color: 'white',
                fontSize: '28px',
                cursor: 'pointer',
                boxShadow: '0 8px 0 #D32F2F, 0 14px 24px rgba(0, 0, 0, 0.25)',
                marginBottom: '20px',
                textTransform: 'uppercase',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.3s, box-shadow 0.3s',
                letterSpacing: '1px',
                textShadow: '2px 2px 0 #D32F2F'
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
      <div style={{
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
      <div style={{
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
      <div style={{
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
        `}
      </style>
      
      {/* Sliding Navbar Panel */}
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
          <Navbar onClose={() => setShowNavbar(false)} />
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