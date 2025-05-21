import React, { useState, useEffect, useRef } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWeb3 } from '../contexts/Web3Context';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Navbar.css';
import { FaHome, FaGift, FaShoppingCart, FaCalendarCheck, FaDiscord, FaTwitter, FaBars, FaStar, FaTimes } from 'react-icons/fa';
import ShopContent from './ShopContent';
import RewardsContent from './RewardsContent';
import DailyQuestContent from './DailyQuestContent';
import MusicPlayer from './MusicPlayer';
import Leaderboard from './Leaderboard';
import { createRoot } from 'react-dom/client';
import { Web3Provider } from '../contexts/Web3Context';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { monadTestnet } from '../config/chains';

// Safe wrapper for RewardsContent
const SafeRewardsContent = ({ onClose }) => {
  try {
    return <RewardsContent onClose={onClose} />;
  } catch (err) {
    console.error("Error in SafeRewardsContent:", err);
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Rewards</h2>
        <p>There was an error loading the rewards content.</p>
        <button 
          onClick={onClose}
          style={{ 
            padding: '10px 20px', 
            background: 'blue', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            marginTop: '20px'
          }}
        >
          Close
        </button>
      </div>
    );
  }
};

// Safe wrapper for ShopContent
const SafeShopContent = ({ onClose }) => {
  try {
    return <ShopContent onClose={onClose} />;
  } catch (err) {
    console.error("Error in SafeShopContent:", err);
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Shop</h2>
        <p>There was an error loading the shop content.</p>
        <button 
          onClick={onClose}
          style={{ 
            padding: '10px 20px', 
            background: 'green', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            marginTop: '20px'
          }}
        >
          Close
        </button>
      </div>
    );
  }
};

function NavbarContent({ activeSection, onSectionChange, onClose, isMobilePanel }) {
  const { account, username, playerHighScore } = useWeb3();
  const location = useLocation();
  const [hasNewHighScore, setHasNewHighScore] = useState(false);
  const prevHighScoreRef = useRef(0);
  
  // Check if we're on different pages
  const isGameScreen = window.location.hash === '#game' || 
                       location.pathname.includes('game') ||
                       document.getElementById('game-iframe') !== null;
  
  // Effect to detect high score changes and show animation
  useEffect(() => {
    if (playerHighScore > prevHighScoreRef.current && prevHighScoreRef.current > 0) {
      setHasNewHighScore(true);
      const timer = setTimeout(() => {
        setHasNewHighScore(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
    prevHighScoreRef.current = playerHighScore;
  }, [playerHighScore]);
  
  // Handle click on a navigation item
  const handleNavClick = (section) => {
    console.log('NavbarContent: clicked on', section, 'isMobilePanel:', isMobilePanel);
    
    // If we're in a game, go back to home first
    if (isGameScreen && section === 'home') {
      window.location.hash = '';
      window.location.href = '/';
      return;
    }
    
    // Change active section
    onSectionChange(section);
    console.log('Called onSectionChange with:', section);
    
    // Close the panel if needed
    if (isMobilePanel && onClose) {
      setTimeout(() => {
        onClose();
      }, 100);
    }
  };

  return (
    <div className="vertical-container">
      {/* TOP SECTION - USERNAME */}
      <div className="vertical-top">
        {account && username ? (
          <>
            <div className="username-button bangers-font">
              {username}
            </div>
            <div className={`high-score ${hasNewHighScore ? 'highlight-score' : ''}`} style={{ display: 'inline-flex' }}>
              <span role="img" aria-label="trophy">🏆</span>
              <span className="score-value bangers-font">{playerHighScore || 0}</span>
              {hasNewHighScore && <span className="new-high-score-badge">NEW!</span>}
            </div>
          </>
        ) : (
          <div style={{ padding: '20px 0' }}>
            <ConnectButton showBalance={false} label="Connect" />
          </div>
        )}
      </div>
      
      {/* MIDDLE SECTION - NAV ITEMS */}
      <div className="vertical-middle">
        <button
          className={`vertical-nav-item ${activeSection === 'home' ? 'active' : ''} ${!username ? 'disabled-button' : ''}`}
          onClick={() => {
            console.log('Home clicked from NavbarContent');
            if (username) {
              handleNavClick('home');
            }
          }}
          disabled={!username}
        >
          <FaHome size={20} />
          <span style={{display: 'inline-block', visibility: 'visible', color: '#333', marginLeft: '10px'}}>HOME</span>
        </button>
        
        <button 
          className={`vertical-nav-item ${activeSection === 'daily-quest' ? 'active' : ''} ${!username ? 'disabled-button' : ''}`}
          onClick={() => {
            console.log('Quests clicked from NavbarContent');
            if (username) {
              if (window.showDailyQuestPanel) {
                window.showDailyQuestPanel();
              } else {
                handleNavClick('daily-quest');
              }
            }
          }}
          disabled={!username}
        >
          <FaCalendarCheck size={20} />
          <span style={{display: 'inline-block', visibility: 'visible', color: '#333', marginLeft: '10px'}}>QUESTS</span>
        </button>
        
        <button 
          className={`vertical-nav-item ${activeSection === 'rewards' ? 'active' : ''}`}
          onClick={() => {
            console.log('Rewards clicked from NavbarContent');
            if (window.showRewardsPanel) {
              window.showRewardsPanel();
            } else {
              handleNavClick('rewards');
            }
          }}
        >
          <FaGift size={20} />
          <span style={{display: 'inline-block', visibility: 'visible', color: '#333', marginLeft: '10px'}}>REWARDS</span>
        </button>
        
        <button 
          className={`vertical-nav-item ${activeSection === 'shop' ? 'active' : ''}`}
          onClick={() => {
            console.log('Shop clicked from NavbarContent');
            if (window.showShopPanel) {
              window.showShopPanel();
            } else {
              handleNavClick('shop');
            }
          }}
        >
          <FaShoppingCart size={20} />
          <span style={{display: 'inline-block', visibility: 'visible', color: '#333', marginLeft: '10px'}}>SHOP</span>
        </button>
      </div>
      
      {/* BOTTOM SECTION - WALLET & SOCIAL */}
      <div className="vertical-bottom">
        {account && (
          <div style={{ 
            marginBottom: '15px',
            display: 'flex',
            justifyContent: 'center',
            width: '100%'
          }}>
            <ConnectButton 
              showBalance={false} 
              chainStatus="icon"
              accountStatus="address"
            />
          </div>
        )}
        
        <div className="vertical-social" style={{
          marginBottom: '25px',  
          paddingBottom: '20px'
        }}>
          <a href="https://discord.gg/pK5SZDtypv" target="_blank" rel="noopener noreferrer" style={{ fontSize: '28px' }}>
            <FaDiscord />
          </a>
          <a href="https://x.com/jumpnads" target="_blank" rel="noopener noreferrer" style={{ fontSize: '28px' }}>
            <FaTwitter />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Navbar({ onClose, mobileView }) {
  const [activeSection, setActiveSection] = useState('home');
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // New, simpler approach using direct state toggles for panel visibility
  const [showDailyQuest, setShowDailyQuest] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [showShop, setShowShop] = useState(false);
  
  // Check if being rendered in mobile slide panel
  const isMobilePanel = !!onClose || mobileView === true;

  // Check if we're on game screen
  const isGameScreen = window.location.hash === '#game' || 
                       location.pathname.includes('game') ||
                       document.getElementById('game-iframe') !== null;
  
  // Add window resize listener to detect mobile/desktop changes
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Simple section change handler
  const changeSection = (section) => {
    console.log('Main navbar: changing section to', section);
    
    setActiveSection(section);
    
    // Show the appropriate panel for both mobile and desktop
    if (section === 'daily-quest') {
      showDailyQuestPanel();
    } else if (section === 'rewards') {
      showRewardsPanel();
    } else if (section === 'shop') {
      showShopPanel();
    }
    
    // Close any mobile menu
    setShowMenu(false);
  };
  
  // Expose panel functions globally
  useEffect(() => {
    window.showDailyQuestPanel = showDailyQuestPanel;
    window.showRewardsPanel = showRewardsPanel;
    window.showShopPanel = showShopPanel;
    
    return () => {
      // Clean up when component unmounts
      delete window.showDailyQuestPanel;
      delete window.showRewardsPanel;
      delete window.showShopPanel;
    };
  }, []);
  
  // New approach for DailyQuestContent - use navigation instead of direct rendering
  const showDailyQuestPanel = () => {
    console.log('Showing Daily Quest Panel - SIMPLIFIED VERSION');
    
    // Create modal container if it doesn't exist
    let modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'modal-container';
      document.body.appendChild(modalContainer);
    }
    
    // Clear existing content
    modalContainer.innerHTML = '';
    
    // Prevent body scrolling on mobile only
    if (isMobile) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    }
    
    // Create panel element with strict no-scroll settings
    const panel = document.createElement('div');
    panel.className = 'modal-panel daily-quest-panel';
    
    // Different positioning based on mobile vs desktop
    if (isMobile) {
      // Full screen on mobile with gaps on all sides
      panel.style.position = 'fixed';
      panel.style.top = '15px';
      panel.style.left = '15px';
      panel.style.right = '15px';
      panel.style.bottom = '15px';
      panel.style.width = 'calc(100% - 30px)';
      panel.style.height = 'calc(100% - 30px)';
      panel.style.borderRadius = '20px';
      // Animate from right
      panel.style.animation = 'slide-in-right 0.3s ease-out forwards';
      
      // Prevent body scrolling on mobile only
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    } else {
      // Position to the right of navbar on desktop with gap on all sides
      panel.style.position = 'fixed';
      panel.style.top = '15px';
      panel.style.left = 'calc(220px + 15px)'; // Width of navbar + left gap
      panel.style.right = '15px';
      panel.style.bottom = '15px';
      panel.style.width = 'calc(100% - 250px - 15px)'; // Account for left gap + navbar width + right gap + additional left gap
      panel.style.height = 'calc(100% - 30px)'; // Account for top and bottom gap
      panel.style.borderRadius = '20px';
    }
    
    panel.style.backgroundColor = '#222';
    panel.style.color = 'white';
    panel.style.zIndex = '999999';
    panel.style.overflow = 'hidden'; // Prevent all scrolling
    panel.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
    panel.style.border = 'none';
    
    // Add style to disable scrolling in all other elements
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .modal-panel * {
        overflow: hidden !important;
        max-height: 100vh !important;
      }
      
      .modal-panel {
        background-color: #222 !important;
        color: white !important;
        border: none !important;
      }
    `;
    document.head.appendChild(styleElement);
    
    // Add animation keyframes to document
    if (!document.getElementById('panel-animations')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'panel-animations';
      styleSheet.textContent = `
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            border-radius: 20px;
          }
          to {
            transform: translateX(0);
            border-radius: 20px;
          }
        }
      `;
      document.head.appendChild(styleSheet);
    }
    
    // Create React root container
    const reactContainer = document.createElement('div');
    reactContainer.id = 'daily-quest-react-container';
    panel.appendChild(reactContainer);
    
    // Add to container
    modalContainer.appendChild(panel);
    
    // Update state
    setActiveSection('daily-quest');
    setShowDailyQuest(true);
    
    try {
      // Create wagmi config similar to main.jsx
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            refetchOnWindowFocus: false,
            staleTime: 30000,
          },
        },
      });
      
      // Use the same wagmi config that's in main.jsx
      const wagmiConfig = getDefaultConfig({
        appName: 'JumpNads',
        projectId: import.meta.env.VITE_PROJECT_ID,
        chains: [monadTestnet],
        transports: {
          [monadTestnet.id]: http(monadTestnet.rpcUrls.default.http[0])
        }
      });
      
      // Render React component to container using createRoot API
      const root = createRoot(document.getElementById('daily-quest-react-container'));
      root.render(
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>
            <RainbowKitProvider>
              <Web3Provider>
                <DailyQuestContent onClose={closeDailyQuestPanel} />
              </Web3Provider>
            </RainbowKitProvider>
          </WagmiProvider>
        </QueryClientProvider>
      );
    } catch (err) {
      console.error("Error rendering DailyQuestContent, using simplified version:", err);
      
      // Fallback content if rendering fails
      const content = document.createElement('div');
      content.style.padding = '20px';
      content.style.maxWidth = '800px';
      content.style.margin = '0 auto';
      
      // Add title and content
      content.innerHTML = `
        <h1 style="color:red;text-align:center;margin:20px;">DAILY QUEST PANEL</h1>
        <h2 style="text-align:center; margin-top:20px; margin-bottom:20px; color:#333;">Daily Quests</h2>
        
        <div style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:9999;">
          <div style="font-family:'Bangers', cursive; font-size:2.5rem; color:white; text-shadow:0 0 10px rgba(255,255,255,0.5); transform:rotate(-5deg); border:3px solid white; padding:10px 20px; border-radius:10px; box-shadow:0 0 20px rgba(255,255,255,0.3);">COMING SOON</div>
        </div>
        
        <div style="background:#f5f5f5; padding:15px; border-radius:10px; margin-bottom:20px;">
          <h3 style="margin-top:0;">Current Streak: 3 days</h3>
          <div style="background:#eee; height:10px; border-radius:5px; margin:10px 0;">
            <div style="background:linear-gradient(to right, #4ECDC4, #556270); width:30%; height:100%; border-radius:5px;"></div>
          </div>
          <button style="background:#4ECDC4; color:white; border:none; padding:10px 20px; border-radius:5px; cursor:pointer; margin-top:10px;">
            Check in for +30 Jumps
          </button>
        </div>
        
        <div style="background:#f5f5f5; padding:15px; border-radius:10px; margin-bottom:20px;">
          <h3 style="margin-top:0;">Play 10 Games</h3>
          <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
            <span>Progress: 3/10</span>
            <span>Reward: +50 Jumps</span>
          </div>
          <div style="background:#eee; height:10px; border-radius:5px; margin:10px 0;">
            <div style="background:linear-gradient(to right, #4ECDC4, #556270); width:30%; height:100%; border-radius:5px;"></div>
          </div>
        </div>
        
        <div style="background:#f5f5f5; padding:15px; border-radius:10px;">
          <h3 style="margin-top:0;">Achieve 500 Score</h3>
          <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
            <span>Progress: 350/500</span>
            <span>Reward: +100 Jumps</span>
          </div>
          <div style="background:#eee; height:10px; border-radius:5px; margin:10px 0;">
            <div style="background:linear-gradient(to right, #4ECDC4, #556270); width:70%; height:100%; border-radius:5px;"></div>
          </div>
        </div>
        
        <p style="text-align:center; margin-top:30px; color:#666; font-style:italic;">
          Note: This is a simplified version of the Daily Quests panel.
          <br>
          The full version requires the Web3 wallet context which is not available in this popup.
        </p>
      `;
      
      // If React rendering failed, use the fallback
      if (document.getElementById('daily-quest-react-container')) {
        document.getElementById('daily-quest-react-container').appendChild(content);
      } else {
        panel.appendChild(content);
      }
      
      // Add a close button
      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'CLOSE';
      closeBtn.style.position = 'fixed';
      closeBtn.style.top = '10px';
      closeBtn.style.right = '10px';
      closeBtn.style.backgroundColor = 'red';
      closeBtn.style.color = 'white';
      closeBtn.style.padding = '10px 20px';
      closeBtn.style.border = 'none';
      closeBtn.style.borderRadius = '5px';
      closeBtn.style.fontSize = '18px';
      closeBtn.style.zIndex = '9999999';
      closeBtn.onclick = closeDailyQuestPanel;
      panel.appendChild(closeBtn);
    }
  };
  
  const closeDailyQuestPanel = () => {
    console.log('Closing Daily Quest Panel - DIRECT DOM APPROACH');
    
    // No need to manually unmount - clearing container is sufficient
    
    // Remove modal
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
      modalContainer.innerHTML = '';
    }
    
    // Reset body
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    
    // Update state
    setShowDailyQuest(false);
  };
  
  const showRewardsPanel = () => {
    console.log('Showing Rewards Panel - DIRECT DOM APPROACH');
    
    // Create modal container if it doesn't exist
    let modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'modal-container';
      document.body.appendChild(modalContainer);
    }
    
    // Clear existing content
    modalContainer.innerHTML = '';
    
    // Create panel element for rewards
    const panel = document.createElement('div');
    panel.className = 'modal-panel rewards-panel';
    
    // Different positioning based on mobile vs desktop
    if (isMobile) {
      // Full screen on mobile with gaps on all sides
      panel.style.position = 'fixed';
      panel.style.top = '15px';
      panel.style.left = '15px';
      panel.style.right = '15px';
      panel.style.bottom = '15px';
      panel.style.width = 'calc(100% - 30px)';
      panel.style.height = 'calc(100% - 30px)';
      panel.style.borderRadius = '20px';
      // Animate from right
      panel.style.animation = 'slide-in-right 0.3s ease-out forwards';
      
      // Prevent body scrolling on mobile only
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    } else {
      // Position to the right of navbar on desktop with gap on all sides
      panel.style.position = 'fixed';
      panel.style.top = '15px';
      panel.style.left = 'calc(220px + 15px)'; // Width of navbar + left gap
      panel.style.right = '15px';
      panel.style.bottom = '15px';
      panel.style.width = 'calc(100% - 250px - 15px)'; // Account for left gap + navbar width + right gap + additional left gap
      panel.style.height = 'calc(100% - 30px)'; // Account for top and bottom gap
      panel.style.borderRadius = '20px';
    }
    
    panel.style.backgroundColor = '#222';
    panel.style.color = 'white';
    panel.style.zIndex = '999999';
    panel.style.overflowY = 'hidden'; // Prevent scrolling
    panel.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
    panel.style.border = 'none';
    
    // Create React root container
    const reactContainer = document.createElement('div');
    reactContainer.id = 'rewards-react-container';
    panel.appendChild(reactContainer);
    
    // Add to container
    modalContainer.appendChild(panel);
    
    // Update state
    setActiveSection('rewards');
    setShowRewards(true);
    
    // Render React component to container using createRoot API
    try {
      // Create wagmi config similar to main.jsx
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            refetchOnWindowFocus: false,
            staleTime: 30000,
          },
        },
      });
      
      // Use the same wagmi config that's in main.jsx
      const wagmiConfig = getDefaultConfig({
        appName: 'JumpNads',
        projectId: import.meta.env.VITE_PROJECT_ID,
        chains: [monadTestnet],
        transports: {
          [monadTestnet.id]: http(monadTestnet.rpcUrls.default.http[0])
        }
      });
      
      const root = createRoot(document.getElementById('rewards-react-container'));
      root.render(
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>
            <RainbowKitProvider>
              <Web3Provider>
                <SafeRewardsContent onClose={closeRewardsPanel} />
              </Web3Provider>
            </RainbowKitProvider>
          </WagmiProvider>
        </QueryClientProvider>
      );
    } catch (err) {
      console.error("Error rendering RewardsContent:", err);
      // Fallback content if rendering fails
      const content = document.createElement('div');
      content.innerHTML = `
        <h1 style="color:blue;text-align:center;margin:20px;">REWARDS PANEL</h1>
        <div style="padding:20px; text-align:center;">
          <p>There was an error loading the Rewards content.</p>
        </div>
      `;
      
      // If React rendering failed, use the fallback
      if (document.getElementById('rewards-react-container')) {
        document.getElementById('rewards-react-container').appendChild(content);
      } else {
        panel.appendChild(content);
      }
      
      // Add a safe close button with direct function reference
      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'CLOSE';
      closeBtn.style.position = 'fixed';
      closeBtn.style.top = '10px';
      closeBtn.style.right = '10px';
      closeBtn.style.backgroundColor = 'blue';
      closeBtn.style.color = 'white';
      closeBtn.style.padding = '10px 20px';
      closeBtn.style.border = 'none';
      closeBtn.style.borderRadius = '5px';
      closeBtn.style.fontSize = '18px';
      closeBtn.style.zIndex = '9999999';
      
      // Using a safer approach with direct function reference
      closeBtn.addEventListener('click', function() {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) {
          modalContainer.innerHTML = '';
        }
        
        // Reset body
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        
        // Update state if available
        if (typeof setShowRewards === 'function') {
          setShowRewards(false);
        }
      });
      
      panel.appendChild(closeBtn);
      
      // Also add a standard close button in the content area
      const contentCloseBtn = document.createElement('button');
      contentCloseBtn.textContent = 'Close Panel';
      contentCloseBtn.style.padding = '10px 20px';
      contentCloseBtn.style.backgroundColor = 'blue';
      contentCloseBtn.style.color = 'white';
      contentCloseBtn.style.border = 'none';
      contentCloseBtn.style.borderRadius = '5px';
      contentCloseBtn.style.margin = '20px auto';
      contentCloseBtn.style.display = 'block';
      
      // Use the same safe approach
      contentCloseBtn.addEventListener('click', function() {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) {
          modalContainer.innerHTML = '';
        }
        
        // Reset body
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        
        // Update state if available
        if (typeof setShowRewards === 'function') {
          setShowRewards(false);
        }
      });
      
      // Add the button to content area
      content.appendChild(contentCloseBtn);
    }
  };
  
  const closeRewardsPanel = () => {
    console.log('Closing Rewards Panel - DIRECT DOM APPROACH');
    
    // No need to manually unmount - clearing container is sufficient
    
    // Remove modal
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
      modalContainer.innerHTML = '';
    }
    
    // Reset body
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    
    // Update state
    setShowRewards(false);
  };
  
  const showShopPanel = () => {
    console.log('Showing Shop Panel - DIRECT DOM APPROACH');
    
    // Create modal container if it doesn't exist
    let modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'modal-container';
      document.body.appendChild(modalContainer);
    }
    
    // Clear existing content
    modalContainer.innerHTML = '';
    
    // Create panel element for shop
    const panel = document.createElement('div');
    panel.className = 'modal-panel shop-panel';
    
    // Different positioning based on mobile vs desktop
    if (isMobile) {
      // Full screen on mobile with gaps on all sides
      panel.style.position = 'fixed';
      panel.style.top = '15px';
      panel.style.left = '15px';
      panel.style.right = '15px';
      panel.style.bottom = '15px';
      panel.style.width = 'calc(100% - 30px)';
      panel.style.height = 'calc(100% - 30px)';
      panel.style.borderRadius = '20px';
      // Animate from right
      panel.style.animation = 'slide-in-right 0.3s ease-out forwards';
      
      // Prevent body scrolling on mobile only
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    } else {
      // Position to the right of navbar on desktop with gap on all sides
      panel.style.position = 'fixed';
      panel.style.top = '15px';
      panel.style.left = 'calc(220px + 15px)'; // Width of navbar + left gap
      panel.style.right = '15px';
      panel.style.bottom = '15px';
      panel.style.width = 'calc(100% - 250px - 15px)'; // Account for left gap + navbar width + right gap + additional left gap
      panel.style.height = 'calc(100% - 30px)'; // Account for top and bottom gap
      panel.style.borderRadius = '20px';
    }
    
    panel.style.backgroundColor = '#222';
    panel.style.color = 'white';
    panel.style.zIndex = '999999';
    panel.style.overflowY = 'hidden'; // Prevent scrolling
    panel.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
    panel.style.border = 'none';
    
    // Create React root container
    const reactContainer = document.createElement('div');
    reactContainer.id = 'shop-react-container';
    panel.appendChild(reactContainer);
    
    // Add to container
    modalContainer.appendChild(panel);
    
    // Update state
    setActiveSection('shop');
    setShowShop(true);
    
    // Render React component to container using createRoot API
    try {
      // Create wagmi config similar to main.jsx
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            refetchOnWindowFocus: false,
            staleTime: 30000,
          },
        },
      });
      
      // Use the same wagmi config that's in main.jsx
      const wagmiConfig = getDefaultConfig({
        appName: 'JumpNads',
        projectId: import.meta.env.VITE_PROJECT_ID,
        chains: [monadTestnet],
        transports: {
          [monadTestnet.id]: http(monadTestnet.rpcUrls.default.http[0])
        }
      });
      
      const root = createRoot(document.getElementById('shop-react-container'));
      root.render(
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>
            <RainbowKitProvider>
              <Web3Provider>
                <SafeShopContent onClose={closeShopPanel} />
              </Web3Provider>
            </RainbowKitProvider>
          </WagmiProvider>
        </QueryClientProvider>
      );
    } catch (err) {
      console.error("Error rendering ShopContent:", err);
      // Fallback content if rendering fails
      const content = document.createElement('div');
      content.innerHTML = `
        <h1 style="color:green;text-align:center;margin:20px;">SHOP PANEL</h1>
        <div style="padding:20px; text-align:center;">
          <p>There was an error loading the Shop content.</p>
        </div>
      `;
      
      // If React rendering failed, use the fallback
      if (document.getElementById('shop-react-container')) {
        document.getElementById('shop-react-container').appendChild(content);
    } else {
        panel.appendChild(content);
      }
      
      // Add a safe close button with direct function reference
      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'CLOSE';
      closeBtn.style.position = 'fixed';
      closeBtn.style.top = '10px';
      closeBtn.style.right = '10px';
      closeBtn.style.backgroundColor = 'green';
      closeBtn.style.color = 'white';
      closeBtn.style.padding = '10px 20px';
      closeBtn.style.border = 'none';
      closeBtn.style.borderRadius = '5px';
      closeBtn.style.fontSize = '18px';
      closeBtn.style.zIndex = '9999999';
      
      // Using a safer approach with direct function reference
      closeBtn.addEventListener('click', function() {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) {
          modalContainer.innerHTML = '';
        }
        
        // Reset body
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        
        // Update state if available
        if (typeof setShowShop === 'function') {
          setShowShop(false);
        }
      });
      
      panel.appendChild(closeBtn);
      
      // Also add a standard close button in the content area
      const contentCloseBtn = document.createElement('button');
      contentCloseBtn.textContent = 'Close Panel';
      contentCloseBtn.style.padding = '10px 20px';
      contentCloseBtn.style.backgroundColor = 'green';
      contentCloseBtn.style.color = 'white';
      contentCloseBtn.style.border = 'none';
      contentCloseBtn.style.borderRadius = '5px';
      contentCloseBtn.style.margin = '20px auto';
      contentCloseBtn.style.display = 'block';
      
      // Use the same safe approach
      contentCloseBtn.addEventListener('click', function() {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) {
          modalContainer.innerHTML = '';
        }
        
        // Reset body
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        
        // Update state if available
        if (typeof setShowShop === 'function') {
          setShowShop(false);
        }
      });
      
      // Add the button to content area
      content.appendChild(contentCloseBtn);
    }
  };
  
  const closeShopPanel = () => {
    console.log('Closing Shop Panel - DIRECT DOM APPROACH');
    
    // No need to manually unmount - clearing container is sufficient
    
    // Remove modal
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
      modalContainer.innerHTML = '';
    }
    
    // Reset body
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    
    // Update state
    setShowShop(false);
  };

  // Close all panels
  const closeAllPanels = () => {
    console.log('Closing all panels');
    
    // Remove modal container contents
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
      modalContainer.innerHTML = '';
    }
    
    // Reset body
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    
    // Update states
    setShowDailyQuest(false);
    setShowRewards(false);
    setShowShop(false);
  };

  // When rendered in mobile panel, return the content with section state
  if (isMobilePanel) {
    return (
      <NavbarContent 
        activeSection={activeSection} 
        onSectionChange={changeSection}
        onClose={onClose}
        isMobilePanel={true}
      />
    );
  }

  return (
    <>
      {/* Desktop vertical navbar, hidden on mobile */}
      <nav className="vertical-navbar hide-on-mobile">
        <NavbarContent 
          activeSection={activeSection} 
          onSectionChange={changeSection} 
          isMobilePanel={false}
        />
      </nav>
      
      {/* Mobile hamburger/leaderboard buttons */}
      <div className="mobile-navbar-buttons">
        <button className="menu-btn" onClick={() => setShowMenu(true)}>
          <FaBars size={32} />
        </button>
        <button className="leaderboard-btn" onClick={() => setShowLeaderboard(true)}>
          <FaStar size={32} />
        </button>
      </div>
      
      {/* Sliding Menu Panel (mobile) */}
      <div className={`mobile-slide-panel left ${showMenu ? 'open' : ''}`}
           onClick={(e) => setShowMenu(false)}>
        <div className="panel-content" onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowMenu(false)} className="close-btn">
            <FaTimes /> Close
          </button>
          
          {/* Simple mobile navigation - Direct approach for mobile */}
          <div className="vertical-middle">
            <button
              className={`vertical-nav-item ${activeSection === 'home' ? 'active' : ''}`}
              onClick={(e) => {
                console.log('Home clicked in mobile menu');
                e.stopPropagation();
                setActiveSection('home');
                closeAllPanels();
                setShowMenu(false);
              }}
            >
              <FaHome size={20} />
              <span style={{display: 'inline-block', color: '#333', marginLeft: '10px'}}>HOME</span>
            </button>
            
            <button 
              className={`vertical-nav-item ${activeSection === 'daily-quest' ? 'active' : ''}`}
              onClick={(e) => {
                console.log('Quests clicked in mobile menu');
                e.stopPropagation();
                showDailyQuestPanel();
                setShowMenu(false);
              }}
            >
              <FaCalendarCheck size={20} />
              <span style={{display: 'inline-block', color: '#333', marginLeft: '10px'}}>QUESTS</span>
            </button>
            
            <button 
              className={`vertical-nav-item ${activeSection === 'rewards' ? 'active' : ''}`}
              onClick={(e) => {
                console.log('Rewards clicked in mobile menu');
                e.stopPropagation();
                showRewardsPanel();
                setShowMenu(false);
              }}
            >
              <FaGift size={20} />
              <span style={{display: 'inline-block', color: '#333', marginLeft: '10px'}}>REWARDS</span>
            </button>
            
            <button 
              className={`vertical-nav-item ${activeSection === 'shop' ? 'active' : ''}`}
              onClick={(e) => {
                console.log('Shop clicked in mobile menu');
                e.stopPropagation();
                showShopPanel();
                setShowMenu(false);
              }}
            >
              <FaShoppingCart size={20} />
              <span style={{display: 'inline-block', color: '#333', marginLeft: '10px'}}>SHOP</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Sliding Leaderboard Panel (mobile) */}
      <div className={`mobile-slide-panel right ${showLeaderboard ? 'open' : ''}`}
        onClick={() => setShowLeaderboard(false)}>
        <div className="panel-content" onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowLeaderboard(false)} className="close-btn">
            <FaTimes /> Close
          </button>
          <Leaderboard />
        </div>
      </div>
      
      {/* Music Player */}
      <MusicPlayer />
    </>
  );
} 