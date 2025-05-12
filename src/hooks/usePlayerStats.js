import { useState, useRef, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useWeb3 } from '../contexts/Web3Context';
import { fetchGameSessionsCount } from '../utils/fetchHelpers';

// Custom hook to handle player stats calculations
export function usePlayerStats() {
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [sessionGamesCount, setSessionGamesCount] = useState(0);
  const [jumpRank, setJumpRank] = useState("Calculating");
  const [scoreRank, setScoreRank] = useState("...");
  const [isInitiallyLoaded, setIsInitiallyLoaded] = useState(false);
  
  const { playerHighScore, totalJumps, leaderboard } = useWeb3();
  const { isConnected, address } = useAccount();
  
  // Create a ref to track if component is mounted
  const isMountedRef = useRef(true);
  
  // Track data fetch status to avoid redundant fetches
  const fetchStatusRef = useRef({
    gamesFetched: false,
    sessionsFetched: false,
    lastFetch: 0,
    lastRankFetch: 0
  });
  
  // Fetch jump rank with more immediate timing
  useEffect(() => {
    async function fetchJumpRank() {
      if (!address || !window.supabase || !isMountedRef.current) {
        console.log("Early return from fetchJumpRank due to missing requirements");
        
        // Set a fallback value if conditions aren't met after 1 second (reduced from 2s)
        setTimeout(() => {
          if (jumpRank === "Calculating" && isMountedRef.current) {
            console.log("Setting fallback jumpRank value");
            setJumpRank(totalJumps > 0 ? "N/A" : "Unranked");
          }
        }, 1000);
        
        return;
      }
      
      try {
        console.log("Fetching fresh jump rank from Supabase");
        
        // Get all users with their jump counts sorted by count descending
        const { data, error } = await window.supabase
          .from('jumps')
          .select('wallet_address, count')
          .order('count', { ascending: false })
          .limit(1100); // Get enough to determine up to 1000+ rank
          
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
          console.log(`User found at position ${userPosition}, rank ${rank}`);
          
          if (rank <= 1000) {
            setJumpRank(`#${rank}`);
          } else {
            setJumpRank("1000+");
          }
        } else if (totalJumps > 0) {
          // Player has jumps but not in results (should be rare)
          console.log("User has jumps but not found in leaderboard");
          setJumpRank("N/A");
        } else {
          console.log("User has no jumps, setting as Unranked");
          setJumpRank("Unranked");
        }
        
        // Mark as initially loaded
        if (!isInitiallyLoaded && isMountedRef.current) {
          setIsInitiallyLoaded(true);
        }
      } catch (error) {
        console.error("Error calculating jump rank:", error);
        setJumpRank("Error");
      }
    }
    
    // Immediate fetch on mount
    fetchJumpRank();
    
    // Set up a refresh interval with shorter timeframe
    const refreshInterval = setInterval(() => {
      if (isMountedRef.current) {
        fetchJumpRank();
      }
    }, 5000); // Refresh every 5 seconds (reduced from 15s)
    
    // Cleanup function
    return () => {
      clearInterval(refreshInterval);
    };
  }, [address, totalJumps, isInitiallyLoaded]);
  
  // Fetch games count
  const fetchGamesCount = useCallback(async () => {
    if (!address || !window.supabase || !isMountedRef.current) return 0;
    if (fetchStatusRef.current.gamesFetched) return; // Skip if already fetched
    
    try {
      console.log("Fetching games count");
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
  
  // Fetch game sessions count
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
  
  // Effect to fetch accurate score rank from Supabase with more frequent updates
  useEffect(() => {
    async function fetchScoreRank() {
      if (!address || !window.supabase || !playerHighScore) return;
      
      // Cache for only 60 seconds to get more frequent updates
      const now = Date.now();
      if (now - fetchStatusRef.current.lastFetch < 60000) {
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
        
        // Mark as initially loaded
        if (!isInitiallyLoaded && isMountedRef.current) {
          setIsInitiallyLoaded(true);
        }
      } catch (error) {
        console.error("Error calculating score rank:", error);
        setScoreRank("Error");
      }
    }
    
    // Immediate fetch
    fetchScoreRank();
    
    // Set up a more frequent refresh interval
    const refreshInterval = setInterval(() => {
      if (isMountedRef.current) {
        fetchScoreRank();
      }
    }, 3000); // Refresh every 3 seconds
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [address, playerHighScore, isInitiallyLoaded]);
  
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
  
  // Calculate player rank directly from scoreRank, but add leaderboard fallback
  const finalScoreRank = (() => {
    // First check the cached score rank
    if (scoreRank !== "...") {
      return scoreRank;
    }
    
    // Special case - if not connected or no address, return N/A
    if (!isConnected || !address) {
      return "N/A";
    }
    
    // If we're still loading but have a high score, return "Loading..."
    if (playerHighScore > 0) {
      return "LOADING...";
    }
    
    // Default unranked state
    return "Unranked";
  })();
  
  // Get total games directly from both sources
  const totalGames = sessionGamesCount > gamesPlayed ? sessionGamesCount : gamesPlayed || 0;
  
  // Create shared isLoading flags
  const loadingFlags = {
    jumpRank: jumpRank === "Calculating" || jumpRank === "...",
    scoreRank: finalScoreRank === "..." || finalScoreRank === "LOADING..."
  };
  
  return {
    jumpRank,
    scoreRank: finalScoreRank,
    totalGames,
    isLoading: loadingFlags,
    // Force refresh function for components to call
    forceRefresh: () => {
      fetchStatusRef.current = {
        gamesFetched: false,
        sessionsFetched: false,
        lastFetch: 0,
        lastRankFetch: 0
      };
    }
  };
} 