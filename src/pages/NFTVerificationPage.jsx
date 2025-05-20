import React, { useEffect } from 'react';
import NFTVerification from '../components/NFTVerification';
import './NFTVerificationPage.css';

const NFTVerificationPage = () => {
  // Hide navbar and music player when this component mounts
  useEffect(() => {
    console.log("🔄 NFTVerificationPage mounted");
    console.log("Current path:", window.location.pathname);
    console.log("Current URL:", window.location.href);
    
    // PRODUCTION FIX: Immediate setup for verification display
    const setupVerificationDisplay = () => {
      console.log("🔴 Setting up verification display for production");
      
      // Force desktop view mode - disable ALL mobile-related features
      window.__FORCE_MOBILE_VIEW__ = false;
      localStorage.removeItem('isMobileDevice');
      sessionStorage.removeItem('isMobileDevice');
      
      // Set all verification flags
      window.__ON_VERIFICATION_PAGE__ = true;
      window.__VERIFY_EMERGENCY_DETECTION__ = true;
      window.__FORCE_VERIFICATION_PAGE__ = true;
      window.__DISABLE_MOBILE_REDIRECT__ = true;
      
      // Add special CSS directly to ensure verification page shows correctly
      const style = document.createElement('style');
      style.id = 'verification-force-styles';
      style.textContent = `
        .desktop-container { display: none !important; } 
        .mobile-container { display: none !important; }
        .verification-page-container { display: block !important; }
        .nft-verification-container { display: block !important; }
        .nft-verification-card { display: block !important; }
      `;
      document.head.appendChild(style);
      
      // Set body classes for styling
      document.body.classList.add('verification-page');
      document.body.setAttribute('data-page', 'verify');
      
      // Override key functions to prevent mobile view from taking over
      window.detectMobile = function() { return false; };
      window.forceMobileRedirect = function() { return false; };
      window.isVerificationPage = function() { return true; };
    };
    
    // Run immediately
    setupVerificationDisplay();
    
    // Also run periodically to ensure settings don't get overwritten
    const interval = setInterval(setupVerificationDisplay, 500);
    
    // Set multiple flags to ensure this page is detected correctly
    window.__ON_VERIFICATION_PAGE__ = true;
    window.isVerificationPage = () => true;
    
    // Add class to body to hide navbar and music player
    document.body.classList.add('verification-page');
    
    // Add data attribute for additional detection
    document.body.setAttribute('data-page', 'verify');
    
    // Add a global variable to the window object to track the current page
    window.currentPage = 'verify';
    
    // Add visibility change listener to detect if page visibility changes
    const handleVisibilityChange = () => {
      console.log(`🔍 Visibility changed: ${document.visibilityState}`);
      if (document.visibilityState === 'visible') {
        // Re-assert verification flags when becoming visible again
        window.__ON_VERIFICATION_PAGE__ = true;
        document.body.classList.add('verification-page');
        document.body.setAttribute('data-page', 'verify');
        setupVerificationDisplay(); // Re-apply production fixes
        console.log("🛡️ Re-established verification flags after visibility change");
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up when component unmounts
    return () => {
      console.log("🔄 NFTVerificationPage unmounted");
      window.__ON_VERIFICATION_PAGE__ = false;
      document.body.classList.remove('verification-page');
      document.body.removeAttribute('data-page');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Remove production fix styles
      const style = document.getElementById('verification-force-styles');
      if (style) style.remove();
      
      clearInterval(interval);
      
      // Only reset the global function if we're truly leaving the verification page
      if (window.location.pathname !== '/verify' && !window.location.pathname.startsWith('/verify')) {
        window.isVerificationPage = function() {
          return window.location.pathname === '/verify' || 
                 window.location.pathname.startsWith('/verify') ||
                 window.location.href.includes('/verify');
        };
        window.currentPage = '';
      }
    };
  }, []);

  return (
    <div className="verification-page-container" style={{
      display: 'block', 
      visibility: 'visible',
      opacity: 1,
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 9999
    }}>
      <NFTVerification />
    </div>
  );
};

export default NFTVerificationPage; 