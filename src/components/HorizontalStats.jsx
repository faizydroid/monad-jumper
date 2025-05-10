import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { useAccount } from 'wagmi';
import { useWeb3 } from '../contexts/Web3Context';
import { fetchGameSessionsCount } from '../utils/fetchHelpers';

// Use memo to prevent unnecessary rerenders of the entire component
const HorizontalStats = memo(function HorizontalStats() {
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [sessionGamesCount, setSessionGamesCount] = useState(0);
  const { playerHighScore, totalJumps, username, setUserUsername, fetchPlayerStats, fetchJumps, leaderboard } = useWeb3();
  const { isConnected, address } = useAccount();
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [jumpRank, setJumpRank] = useState("...");
  
  // Create a ref to track if component is mounted
  const isMountedRef = useRef(true);
  
  // Track data fetch status to avoid redundant fetches
  const fetchStatusRef = useRef({
    gamesFetched: false,
    sessionsFetched: false,
    lastFetch: 0,
    lastRankFetch: 0 // Add tracking for rank fetches
  });
  
  // Add this effect at the top level with optimized queries
  useEffect(() => {
    async function fetchJumpRank() {
      console.log("fetchJumpRank called with:", { 
        address, 
        hasSupabase: !!window.supabase, 
        isMounted: isMountedRef.current,
        totalJumps
      });
      
      if (!address || !window.supabase || !isMountedRef.current) {
        console.log("Early return from fetchJumpRank due to:", {
          address: !address,
          supabase: !window.supabase,
          mounted: !isMountedRef.current
        });
        
        // Set a fallback value if conditions aren't met after 2 seconds
        setTimeout(() => {
          if (jumpRank === "...") {
            console.log("Setting fallback jumpRank value");
            setJumpRank(totalJumps > 0 ? "N/A" : "Unranked");
          }
        }, 2000);
        
        return;
      }
      
      // Skip frequent refetches - increase cache time to 5 minutes
      const now = Date.now();
      
      try {
        console.log("Fetching accurate jump rank from Supabase");
        
        // Get all users with their jump counts sorted by count descending
        const { data, error } = await window.supabase
          .from('jumps')
          .select('wallet_address, count')
          .order('count', { ascending: false })
          .limit(1100); // Get enough to determine up to 1000+ rank
        
        console.log("Supabase query results:", { data, error });
          
        if (error) {
          console.error("Error fetching jump rankings:", error);
          setJumpRank("Error");
          return;
        }
        
        // No results means no jumps
        if (!data || data.length === 0) {
          console.log("No jump data found");
          setJumpRank("N/A");
          return;
        }
        
        // Store highest jump count per wallet
        const userHighJumps = new Map();
        
        // First pass - determine highest jump count per wallet
        data.forEach(item => {
          const address = item.wallet_address.toLowerCase();
          const currentHighJumps = userHighJumps.get(address) || 0;
          
          if (item.count > currentHighJumps) {
            userHighJumps.set(address, item.count);
          }
        });
        
        // Second pass - create deduplicated array with highest jump counts
        const uniqueJumps = Array.from(userHighJumps.entries())
          .map(([address, count]) => ({ wallet_address: address, count }))
          .sort((a, b) => b.count - a.count); // Sort by count descending
        
        // Find the user's position in the processed data
        const userPosition = uniqueJumps.findIndex(
          entry => entry.wallet_address.toLowerCase() === address.toLowerCase()
        );
        
        // If found, display appropriate rank
        if (userPosition >= 0) {
          const rank = userPosition + 1;
          if (rank <= 1000) {
            setJumpRank(`#${rank}`);
          } else {
            setJumpRank("1000+");
          }
        } else if (totalJumps > 0) {
          // Player has jumps but not in results (should be rare)
          setJumpRank("N/A");
        } else {
          setJumpRank("Unranked");
        }
        
        // Update last fetch time
        fetchStatusRef.current.lastRankFetch = now;
      } catch (error) {
        console.error("Error calculating jump rank:", error);
        setJumpRank("Error");
      }
    }
    
    fetchJumpRank();
    
    // Add periodic refresh of jump rank
    const refreshInterval = setInterval(() => {
      fetchJumpRank();
    }, 60000); // Refresh every minute
    
    // Add failsafe timeout to ensure jumpRank doesn't stay at "..." forever
    const failsafeTimeout = setTimeout(() => {
      if (jumpRank === "...") {
        console.log("Failsafe: Setting jumpRank after timeout");
        setJumpRank(totalJumps > 0 ? "N/A" : "Unranked");
      }
    }, 5000);
    
    // Cleanup function
    return () => {
      isMountedRef.current = false;
      clearInterval(refreshInterval);
      clearTimeout(failsafeTimeout);
    };
  }, [address, totalJumps]);
  
  // Optimize the fetchGamesCount function
  const fetchGamesCount = useCallback(async () => {
    if (!address || !window.supabase || !isMountedRef.current) return 0;
    if (fetchStatusRef.current.gamesFetched) return; // Skip if already fetched
    
    try {
      const { data, error } = await window.supabase
        .from('games')
        .select('count')
        .eq('wallet_address', address.toLowerCase())
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching games count:", error);
        return 0;
      }
      
      if (!isMountedRef.current) return 0; // Check if still mounted
      
      const count = data?.count || 0;
      setGamesPlayed(count);
      fetchStatusRef.current.gamesFetched = true;
      return count;
    } catch (error) {
      console.error("Error in fetchGamesCount:", error);
      return 0;
    }
  }, [address]);
  
  // Optimize the fetchGameSessionsCount function
  const fetchSessionsCount = useCallback(async () => {
    if (!address || !window.supabase || !isMountedRef.current) return;
    if (fetchStatusRef.current.sessionsFetched) return; // Skip if already fetched
    
    try {
      const result = await fetchGameSessionsCount(address, window.supabase, setSessionGamesCount);
      fetchStatusRef.current.sessionsFetched = true;
      return result;
    } catch (error) {
      console.error('Error in fetchSessionsCount:', error);
    }
  }, [address]);
  
  // Combine fetches using a single effect
  useEffect(() => {
    if (!isConnected || !address) {
      // Reset state when disconnected
      setGamesPlayed(0);
      setSessionGamesCount(0);
      fetchStatusRef.current.gamesFetched = false;
      fetchStatusRef.current.sessionsFetched = false;
      return;
    }
    
    // Use a slight delay to avoid simultaneous DB requests
    const timer1 = setTimeout(() => fetchGamesCount(), 100);
    const timer2 = setTimeout(() => fetchSessionsCount(), 500);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [address, isConnected, fetchGamesCount, fetchSessionsCount]);
  
  // Reset mounted flag when component unmounts
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // State to cache score rank
  const [scoreRank, setScoreRank] = useState("...");

  // Effect to fetch accurate score rank from Supabase - with increased cache time
  useEffect(() => {
    async function fetchScoreRank() {
      if (!address || !window.supabase || !playerHighScore) return;
      
      // Check cached rank freshness - cache for 5 minutes
      const now = Date.now();
      if (now - fetchStatusRef.current.lastFetch < 300000) {
        return; // Skip if recently fetched
      }
      
      try {
        // Get all unique scores sorted by score descending
        const { data, error } = await window.supabase
          .from('scores')
          .select('wallet_address, score')
          .order('score', { ascending: false })
          .limit(1100); // Get enough to determine up to 1000+ rank
          
        if (error) {
          console.error("Error fetching score rankings:", error);
          return;
        }
        
        // Process scores to keep only highest score per user (deduplication)
        const userHighScores = new Map(); // Map wallet_address -> highest score
        
        // First pass - determine highest score per wallet
        data.forEach(item => {
          const address = item.wallet_address.toLowerCase();
          const currentHighScore = userHighScores.get(address) || 0;
          
          if (item.score > currentHighScore) {
            userHighScores.set(address, item.score);
          }
        });
        
        // Second pass - create deduplicated array with highest scores
        const uniqueScores = Array.from(userHighScores.entries())
          .map(([address, score]) => ({ wallet_address: address, score }))
          .sort((a, b) => b.score - a.score); // Sort by score descending
        
        // Find the user's position in the processed data
        const userPosition = uniqueScores.findIndex(
          entry => entry.wallet_address.toLowerCase() === address.toLowerCase()
        );
        
        // If found, display appropriate rank
        if (userPosition >= 0) {
          const rank = userPosition + 1;
          if (rank <= 1000) {
            setScoreRank(`#${rank}`);
          } else {
            setScoreRank("1000+");
          }
        } else if (playerHighScore > 0) {
          // Player has a score but not in results (should be rare)
          setScoreRank("N/A");
        } else {
          setScoreRank("Unranked");
        }
        
        // Update last fetch time
        fetchStatusRef.current.lastFetch = now;
      } catch (error) {
        console.error("Error calculating score rank:", error);
        setScoreRank("Error");
      }
    }
    
    fetchScoreRank();
  }, [address, playerHighScore]);
  
  // Memoize player rank calculation
  const playerRank = useMemo(() => {
    // First check the cached rank
    if (scoreRank !== "...") {
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
  }, [address, leaderboard, playerHighScore, scoreRank]);
  
  // Handle username submission directly with Web3Context
  const handleSubmitUsername = useCallback(async (e) => {
    e.preventDefault();
    
    if (newUsername.trim().length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }
    
    try {
      // Use the setUserUsername function from Web3Context
      const success = await setUserUsername(newUsername);
      if (success) {
        setUsernameError('');
        setNewUsername('');
        // Show success message
        setShowSuccess(true);
        
        // Create confetti effect
        createConfettiEffect();
        
        // Hide success message after 4 seconds
        setTimeout(() => {
          setShowSuccess(false);
        }, 4000);
      } else {
        setUsernameError('Failed to set username. Please try again.');
      }
    } catch (error) {
      console.error("Error setting username:", error);
      setUsernameError(error.message || 'Failed to set username');
    }
  }, [newUsername, setUserUsername]);

  // Function to create confetti effect
  const createConfettiEffect = useCallback(() => {
    const container = document.querySelector('.username-form-card');
    if (!container) return;
    
    // Create confetti particles
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-particle';
      
      // Random confetti properties
      const size = Math.random() * 10 + 5; // Size between 5-15px
      const colors = ['#FFD166', '#4ECDC4', '#FF6B6B', '#A5D858', '#9B5DE5'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      // Set styles
      confetti.style.width = `${size}px`;
      confetti.style.height = `${size}px`;
      confetti.style.backgroundColor = color;
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.top = '0';
      confetti.style.position = 'absolute';
      confetti.style.zIndex = '10';
      confetti.style.borderRadius = `${Math.random() > 0.5 ? '50%' : '0'}`;
      confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
      
      // Animation properties
      confetti.style.animation = `confetti-fall ${Math.random() * 3 + 2}s ease-out forwards`;
      
      // Add to container
      container.appendChild(confetti);
      
      // Remove after animation completes
      setTimeout(() => {
        if (container.contains(confetti)) {
          container.removeChild(confetti);
        }
      }, 5000);
    }
  }, []);

  // Reset form if address changes
  useEffect(() => {
    setNewUsername('');
    setUsernameError('');
    setShowSuccess(false);
  }, [address]);

  // Memoize the disconnected state
  const disconnectedContent = useMemo(() => (
    <div className="stats-card-horizontal">
      <div className="card-badge">STATS</div>
      <div className="stats-info">
        <h3 className="greeting-title">Ready to break the monad?</h3>
        <p className="greeting-message">Connect your wallet to start jumping! ??</p>
      </div>
      <p>Connect wallet to see your stats</p>
    </div>
  ), []);

  if (!isConnected || !address) {
    return disconnectedContent;
  }

  // Memoize username form
  const usernameForm = useMemo(() => (
    <div className="stats-card-horizontal username-form-card">
      <div className="card-badge">SET USERNAME</div>
      
      <div className="stats-info">  
        <br></br>
      </div>
      
      <form onSubmit={handleSubmitUsername} className="username-form">
        {usernameError && <div className="error-message">{usernameError}</div>}
        {showSuccess && <div className="success-message">Username set successfully! Let's play! ??</div>}
        <input
          type="text"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          placeholder="Enter username (min 3 characters)"
          className="username-input"
          required
        />
        <button type="submit" className="set-username-button">
          Set Username
        </button>
      </form>
    </div>
  ), [newUsername, handleSubmitUsername, usernameError, showSuccess]);

  // If no username is set, show the username input form
  if (!username) {
    return usernameForm;
  }

  // Get username for greeting - this part isn't memoized since it contains
  // frequently changing values, but the overall component is memoized
  return (
    <div className="stats-card-horizontal">
      <div className="card-badge">STATS</div>
      
      <div className="stats-grid-horizontal">
        <div className="stat-item-horizontal">
          <div className="stat-icon">
            <img src="/icon/score_ico.png" alt="High Score" width="28" height="28" />
          </div>
          <div className="stat-label">Hi-Score</div>
          <div className="stat-value">{playerHighScore !== undefined ? Number(playerHighScore).toLocaleString() : '0'}</div>
        </div>
        
        <div className="stat-item-horizontal">
          <div className="stat-icon">
            <img src="/icon/jump_ico.png" alt="Total Jumps" width="28" height="28" />
          </div>
          <div className="stat-label">Total Jumps</div>
          <div className="stat-value">{totalJumps !== undefined ? Number(totalJumps).toLocaleString() : '0'}</div>
        </div>
        
        <div className="stat-item-horizontal">
          <div className="stat-icon">
            <img src="/icon/jump_rank_ico.png" alt="Jump Rank" width="28" height="28" />
          </div>
          <div className="stat-label">Jump Rank</div>
          <div className="stat-value">
            {jumpRank === "..." ? 
              totalJumps > 0 ? 
                <span className="loading-rank">Loading...</span> : 
                <span>Unranked</span>
              : 
              jumpRank
            }
          </div>
        </div>
        
        <div className="stat-item-horizontal">
          <div className="stat-icon">
            <img src="/icon/score_rank_ico.png" alt="Score Rank" width="28" height="28" />
          </div>
          <div className="stat-label">ScoreRank</div>
          <div className="stat-value">
            {playerRank === "..." ? 
              <span className="loading-rank">Loading...</span> : 
              playerRank
            }
          </div>
        </div>

        <div className="stat-item-horizontal">
          <div className="stat-icon">
            <img src="/icon/game_ico.png" alt="Total Games" width="28" height="28" />
          </div>
          <div className="stat-label">Total Games</div>
          <div className="stat-value">
            {sessionGamesCount > gamesPlayed ? sessionGamesCount : gamesPlayed || 0}
          </div>
        </div>
      </div>
    </div>
  );
});

export default HorizontalStats; 