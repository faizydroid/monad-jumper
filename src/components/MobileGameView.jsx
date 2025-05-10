import React, { useRef, useEffect, useState } from 'react';
import './MobileGameView.css';

const MobileGameView = ({ 
  gameId,
  onJump,
  onScore,
  onGameOver,
  onBackToHome,
  iframeRef
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showTips, setShowTips] = useState(true);
  const controlsTimeoutRef = useRef(null);

  // Hide controls after a few seconds
  useEffect(() => {
    if (showControls) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }
    
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls]);

  // Hide tips after the game starts
  useEffect(() => {
    const tipTimer = setTimeout(() => {
      setShowTips(false);
    }, 8000);
    
    return () => clearTimeout(tipTimer);
  }, []);

  // Handle messages from the iframe
  useEffect(() => {
    const handleMessage = (event) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      
      if (event.data) {
        // Handle score updates
        if (event.data.type === 'SCORE') {
          setScore(event.data.score);
          if (onScore) onScore(event.data.score);
        }
        
        // Handle jump events
        if (event.data.type === 'JUMP') {
          if (onJump) onJump(event.data.jumps);
        }
        
        // Handle game over
        if (event.data.type === 'GAME_OVER') {
          if (onGameOver) onGameOver(event.data.score);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onJump, onScore, onGameOver, iframeRef]);

  // Handle iframe load complete
  const handleIframeLoad = () => {
    // Hide loading after a slight delay to ensure all assets are loaded
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  // Send touch controls to the game
  const handleLeftTouch = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'MOBILE_CONTROL',
        action: 'LEFT'
      }, '*');
    }
    
    // Show controls briefly when tapped
    setShowControls(true);
  };
  
  const handleRightTouch = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'MOBILE_CONTROL',
        action: 'RIGHT'
      }, '*');
    }
    
    // Show controls briefly when tapped
    setShowControls(true);
  };

  return (
    <div className="mobile-game-view">
      {/* Loading overlay */}
      {isLoading && (
        <div className="mobile-game-loading">
          <div className="mobile-game-loading-spinner"></div>
          <p>Loading Game...</p>
        </div>
      )}
      
      {/* Game iframe */}
      <iframe
        ref={iframeRef}
        src={`/original.html?session=${gameId}&mobile=true`}
        title="JumpNads Mobile Game"
        className="mobile-game-iframe"
        onLoad={handleIframeLoad}
        allow="autoplay"
      ></iframe>
      
      {/* Score display */}
      <div className="mobile-game-score">
        {score}
      </div>
      
      {/* Back button */}
      <button 
        className="mobile-game-back-button"
        onClick={onBackToHome}
      >
        ⬅️
      </button>
      
      {/* Mobile control areas */}
      <div className="mobile-control-areas">
        <div 
          className="mobile-control-left" 
          onTouchStart={handleLeftTouch}
          onClick={handleLeftTouch}
        >
          {showControls && <span className="mobile-control-indicator">👈</span>}
        </div>
        <div 
          className="mobile-control-right" 
          onTouchStart={handleRightTouch}
          onClick={handleRightTouch}
        >
          {showControls && <span className="mobile-control-indicator">👉</span>}
        </div>
      </div>
      
      {/* Tips overlay - only shown initially */}
      {showTips && (
        <div className="mobile-game-tips">
          <div className="mobile-tip">
            <span>👈 Tap left side to move left</span>
          </div>
          <div className="mobile-tip">
            <span>👉 Tap right side to move right</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileGameView; 