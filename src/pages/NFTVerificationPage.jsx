import React, { useEffect } from 'react';
import NFTVerification from '../components/NFTVerification';
import './NFTVerificationPage.css';

const NFTVerificationPage = () => {
  // Hide navbar and music player when this component mounts
  useEffect(() => {
    console.log("🔄 NFTVerificationPage mounted");
    console.log("Current path:", window.location.pathname);
    console.log("Current URL:", window.location.href);
    
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
    <div className="verification-page-container">
      <NFTVerification />
    </div>
  );
};

export default NFTVerificationPage; 