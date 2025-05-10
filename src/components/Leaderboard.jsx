import React, { useState, useEffect, useRef } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import '../styles/Leaderboard.css';

const Leaderboard = ({ isMobile }) => {
  const web3Context = useWeb3() || { leaderboard: [] };
  const { leaderboard } = web3Context;
  const { fetchJumpsLeaderboard } = useWeb3();
  const [jumpsLeaderboard, setJumpsLeaderboard] = useState([]);
  const [activeTab, setActiveTab] = useState('scores'); // 'scores' or 'jumps'
  const [isLoading, setIsLoading] = useState(false);
  const loadingTimeoutRef = useRef(null);
  const fetchedRef = useRef(false);
  const boardRef = useRef(null);

  // Fetch jumps leaderboard when component mounts or tab changes
  useEffect(() => {
    if (activeTab === 'jumps') {
      // Only show loading if it'll take longer than 300ms to load
      // This prevents flickering for quick data loads
      if (!fetchedRef.current && jumpsLeaderboard.length === 0) {
        loadingTimeoutRef.current = setTimeout(() => {
          setIsLoading(true);
        }, 300);
      }
      
      const loadJumpsLeaderboard = async () => {
        try {
          // Don't fetch again if we already have data
          if (fetchedRef.current && jumpsLeaderboard.length > 0) {
            return;
          }
          
          const data = await fetchJumpsLeaderboard();
          setJumpsLeaderboard(data);
          fetchedRef.current = true;
        } catch (error) {
          console.error("Error loading jumps leaderboard:", error);
        } finally {
          clearTimeout(loadingTimeoutRef.current);
          setIsLoading(false);
        }
      };
      
      loadJumpsLeaderboard();
    }
    
    // Clean up timeout on unmount or tab change
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [activeTab, fetchJumpsLeaderboard, jumpsLeaderboard.length]);

  // Scroll to top when tab changes
  useEffect(() => {
    if (boardRef.current) {
      boardRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  // Function to render medal or rank number with better styling
  const renderRank = (index) => {
    if (index < 3) {
      return (
        <span className="medal">
          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
        </span>
      );
    } else if (index < 10) {
      return <span className="top-ten-rank">{`#${index + 1}`}</span>;
    } else {
      return <span className="normal-rank">{`#${index + 1}`}</span>;
    }
  };

  return (
    <div className={`leaderboard-container ${isMobile ? 'mobile-leaderboard' : ''}`}>
      <h2 className="leaderboard-title">🏆 TOP PLAYERS 🏆</h2>
      
      <div className="leaderboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'scores' ? 'active' : ''}`} 
          onClick={() => setActiveTab('scores')}
        >
          Hi-Scores
        </button>
        <button 
          className={`tab-button ${activeTab === 'jumps' ? 'active' : ''}`} 
          onClick={() => setActiveTab('jumps')}
        >
          Top Jumpers
        </button>
      </div>
      
      <div className="leaderboard-board" ref={boardRef}>
        {isLoading ? (
          <div className="loading-indicator">Loading...</div>
        ) : activeTab === 'scores' ? (
          // Scores Leaderboard
          leaderboard.length === 0 ? (
            <div className="no-scores">No scores yet! Be the first to jump!</div>
          ) : (
            <div className="leaderboard-scores">
              {/* Only show top 20 entries in mobile view */}
              {leaderboard
                .slice(0, isMobile ? 20 : undefined) 
                .map((entry, index) => (
                <div 
                  key={`${entry.address}-${entry.score}`} 
                  className={`leaderboard-row ${index < 3 ? 'top-three' : ''} ${index === 0 ? 'first-place' : ''} ${index >= 10 ? 'extended-list' : ''}`}
                >
                  <div className="rank">
                    {renderRank(index)}
                  </div>
                  <div className="player-name">{entry.player}</div>
                  <div className="score-bubble">{Number(entry.score).toLocaleString()}</div>
                </div>
              ))}
              <div className="list-end-marker">• • •</div>
            </div>
          )
        ) : (
          // Jumps Leaderboard
          jumpsLeaderboard.length === 0 ? (
            <div className="no-scores">No jump data yet! Be the first to jump!</div>
          ) : (
            <div className="leaderboard-scores">
              {/* Only show top 20 entries in mobile view */}
              {jumpsLeaderboard
                .slice(0, isMobile ? 20 : undefined)
                .map((entry, index) => (
                <div 
                  key={`${entry.address}-${entry.jumps}`} 
                  className={`leaderboard-row ${index < 3 ? 'top-three' : ''} ${index === 0 ? 'first-place' : ''} ${index >= 10 ? 'extended-list' : ''}`}
                >
                  <div className="rank">
                    {renderRank(index)}
                  </div>
                  <div className="player-name">{entry.player}</div>
                  <div className="score-bubble jumps-bubble">{Number(entry.jumps).toLocaleString()}</div>
                </div>
              ))}
              <div className="list-end-marker">• • •</div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default Leaderboard; 