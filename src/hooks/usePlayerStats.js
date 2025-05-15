import { useEffect, useState, useRef, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { createClient } from '@supabase/supabase-js';

// Set up Supabase client
const supabase = createClient(
  import.meta.env.VITE_REACT_APP_SUPABASE_URL,
  import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY
);

// FORCE MOCK VALUES FOR TESTING - remove this in production
const FORCE_MOCK_VALUES = true;

export default function usePlayerStats() {
  const { isConnected, address } = useAccount();
  const [playerHighScore, setPlayerHighScore] = useState(FORCE_MOCK_VALUES ? 1065 : 0);
  const [totalJumps, setTotalJumps] = useState(FORCE_MOCK_VALUES ? 18248 : 0);
  const [gamesPlayed, setGamesPlayed] = useState(FORCE_MOCK_VALUES ? 495 : 0);
  const [gameSessionsCount, setGameSessionsCount] = useState(FORCE_MOCK_VALUES ? 495 : 0);
  const [jumpRank, setJumpRank] = useState(FORCE_MOCK_VALUES ? "#11" : "Calculating");
  const [scoreRank, setScoreRank] = useState(FORCE_MOCK_VALUES ? "1000+" : "...");
  
  // Track fetch attempts to implement exponential backoff
  const fetchAttempts = useRef({
    playerStats: 0,
    gamesPlayed: 0,
    gameSessions: 0,
    jumpRank: 0,
    scoreRank: 0
  });

  const isMounted = useRef(true);
  const debugMode = useRef(true); // Enable for debug logging

  // Enhanced logging function
  const logDebug = useCallback((message, data = {}) => {
    if (debugMode.current) {
      console.log(`[usePlayerStats] ${message}`, {
        address: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'none',
        ...data
      });
    }
  }, [address]);

  // Fetch player's high score and total jumps
  const fetchPlayerStats = useCallback(async () => {
    if (FORCE_MOCK_VALUES) return; // Skip fetch if using mock values
    if (!address || !supabase) return;

    try {
      logDebug('Fetching player stats', { attempt: fetchAttempts.current.playerStats + 1 });
      
      const { data: scoreData } = await supabase
        .from('scores')
        .select('score')
        .eq('wallet_address', address.toLowerCase())
        .order('score', { ascending: false })
        .limit(1)
        .maybeSingle();

      setPlayerHighScore(scoreData?.score || 0);
      logDebug('Set player high score', { score: scoreData?.score || 0 });

      const { data: jumpData } = await supabase
        .from('jumps')
        .select('count')
        .eq('wallet_address', address.toLowerCase())
        .maybeSingle();

      setTotalJumps(jumpData?.count || 0);
      logDebug('Set total jumps', { jumps: jumpData?.count || 0 });
      
      // Reset attempt counter on success
      fetchAttempts.current.playerStats = 0;
      } catch (error) {
      console.error("Error fetching player stats:", error);
      // Increment attempt counter
      fetchAttempts.current.playerStats++;
    }
  }, [address, logDebug]);
  
  // Fetch games count
  const fetchGamesPlayed = useCallback(async () => {
    if (FORCE_MOCK_VALUES) return; // Skip fetch if using mock values
    if (!address || !supabase) return;
    
    try {
      logDebug('Fetching games played', { attempt: fetchAttempts.current.gamesPlayed + 1 });
      
      const { data } = await supabase
        .from('games')
        .select('count')
        .eq('wallet_address', address.toLowerCase())
        .maybeSingle();
      
      setGamesPlayed(data?.count || 0);
      logDebug('Set games played', { count: data?.count || 0 });
      
      // Reset attempt counter on success
      fetchAttempts.current.gamesPlayed = 0;
    } catch (err) {
      console.error("Error fetching games played:", err);
      // Increment attempt counter
      fetchAttempts.current.gamesPlayed++;
    }
  }, [address, logDebug]);
  
  // Fetch game sessions count
  const fetchGameSessions = useCallback(async () => {
    if (FORCE_MOCK_VALUES) return; // Skip fetch if using mock values
    if (!address || !supabase) return;
    
    try {
      logDebug('Fetching game sessions', { attempt: fetchAttempts.current.gameSessions + 1 });
      
      const { count } = await supabase
        .from('game_sessions')
        .select('session_id', { count: 'exact', head: true })
        .eq('wallet_address', address.toLowerCase());

      setGameSessionsCount(count || 0);
      logDebug('Set game sessions count', { count: count || 0 });
      
      // Reset attempt counter on success
      fetchAttempts.current.gameSessions = 0;
    } catch (err) {
      console.error("Error fetching game sessions:", err);
      // Increment attempt counter
      fetchAttempts.current.gameSessions++;
    }
  }, [address, logDebug]);

  // Fetch Jump Rank
  const fetchJumpRank = useCallback(async () => {
    if (FORCE_MOCK_VALUES) return; // Skip fetch if using mock values
    if (!address || !supabase) return;
    
    try {
      logDebug('Fetching jump rank', { attempt: fetchAttempts.current.jumpRank + 1 });
      
      const { data, error } = await supabase.rpc('get_jump_rank', {
        user_address: address.toLowerCase()
      });

      if (error) throw error;

      if (data?.rank) {
        const rank = data.rank;
        const rankDisplay = rank <= 1000 ? `#${rank}` : "1000+";
        setJumpRank(rankDisplay);
        logDebug('Set jump rank', { rank: rankDisplay });
      } else {
        setJumpRank("Unranked");
        logDebug('No jump rank found, set to Unranked');
      }
      
      // Reset attempt counter on success
      fetchAttempts.current.jumpRank = 0;
    } catch (err) {
      console.error("Error fetching jump rank:", err);
      // If we've made more than 3 attempts, fall back to a default value
      if (fetchAttempts.current.jumpRank >= 3) {
        setJumpRank(totalJumps > 0 ? "#0" : "Unranked");
        logDebug('Set fallback jump rank after multiple failures');
      }
      // Increment attempt counter
      fetchAttempts.current.jumpRank++;
    }
  }, [address, totalJumps, logDebug]);

  // Fetch Score Rank
  const fetchScoreRank = useCallback(async () => {
    if (FORCE_MOCK_VALUES) return; // Skip fetch if using mock values
    if (!address || !supabase) return;
    
    try {
      logDebug('Fetching score rank', { 
        attempt: fetchAttempts.current.scoreRank + 1,
        playerHighScore 
      });
      
      const { data, error } = await supabase
          .from('scores')
          .select('wallet_address, score')
          .order('score', { ascending: false })
        .limit(1100);

      if (error) throw error;

      const uniqueScores = new Map();
      data.forEach(({ wallet_address, score }) => {
        const addr = wallet_address.toLowerCase();
        if (!uniqueScores.has(addr) || score > uniqueScores.get(addr)) {
          uniqueScores.set(addr, score);
        }
      });

      const sorted = Array.from(uniqueScores.entries())
        .sort((a, b) => b[1] - a[1]);

      const position = sorted.findIndex(([addr]) => addr === address.toLowerCase());
      const rankDisplay = position >= 0 
        ? (position + 1 <= 1000 ? `#${position + 1}` : "1000+") 
        : (playerHighScore > 0 ? "#0" : "Unranked");
        
      setScoreRank(rankDisplay);
      logDebug('Set score rank', { rank: rankDisplay, position });
      
      // Reset attempt counter on success
      fetchAttempts.current.scoreRank = 0;
    } catch (err) {
      console.error("Error fetching score rank:", err);
      // If we've made more than 3 attempts, fall back to a default value
      if (fetchAttempts.current.scoreRank >= 3) {
        setScoreRank(playerHighScore > 0 ? "#0" : "Unranked");
        logDebug('Set fallback score rank after multiple failures');
      }
      // Increment attempt counter
      fetchAttempts.current.scoreRank++;
    }
  }, [address, playerHighScore, logDebug]);

  // Set up polling for data refresh
  useEffect(() => {
    logDebug('Setting up data polling');
    isMounted.current = true;
    
    if (isConnected && address) {
      // Initial fetch
      if (!FORCE_MOCK_VALUES) {
        fetchPlayerStats();
        fetchGamesPlayed();
        fetchGameSessions();
        fetchJumpRank();
        fetchScoreRank();
      }
      
      // Polling interval
      const interval = setInterval(() => {
        if (isMounted.current && !FORCE_MOCK_VALUES) {
          logDebug('Polling for data updates');
          fetchPlayerStats();
          fetchGamesPlayed();
          fetchGameSessions();
          fetchJumpRank();
          fetchScoreRank();
        }
      }, 5000); // Poll every 5 seconds
    
    return () => {
        clearInterval(interval);
        isMounted.current = false;
      };
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [
    isConnected, 
    address, 
    fetchPlayerStats, 
    fetchGamesPlayed, 
    fetchGameSessions, 
    fetchJumpRank, 
    fetchScoreRank,
    logDebug
  ]);
  
  // Fallback timer for loading states
  useEffect(() => {
    if (FORCE_MOCK_VALUES) return; // Skip if using mock values
    
    // Set fallback values if loading takes too long
    if (jumpRank === "Calculating" || scoreRank === "...") {
      logDebug('Setting up fallback timer for ranks');
      
      const fallbackTimer = setTimeout(() => {
        if (!isMounted.current) return;
        
        if (jumpRank === "Calculating") {
          setJumpRank(totalJumps > 0 ? "#0" : "Unranked");
          logDebug('Applied fallback value for jump rank');
        }
        
        if (scoreRank === "...") {
          setScoreRank(playerHighScore > 0 ? "#0" : "Unranked");
          logDebug('Applied fallback value for score rank');
        }
      }, 8000); // 8 second timeout
      
      return () => clearTimeout(fallbackTimer);
    }
  }, [jumpRank, scoreRank, playerHighScore, totalJumps, logDebug]);
  
  return {
    playerHighScore,
    totalJumps,
    gamesPlayed,
    gameSessionsCount,
    jumpRank,
    scoreRank
  };
} 