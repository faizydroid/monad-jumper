// Utility functions for data fetching

// Add error filtering for fetch requests related to session tokens
const originalFetch = window.fetch;

// Patterns to skip logging errors
const skipErrorPatterns = [
  'register-session-token',
  'supabase',
  '404',
  'get_jump_rank',
  'rpc'
];

// Override fetch to silently fail for certain endpoints
window.fetch = async function(...args) {
  try {
    const url = args[0].toString();
    
    // Special handling for RPC calls
    if (url.includes('/rpc/')) {
      try {
        const response = await originalFetch.apply(this, args);
        return response;
      } catch (err) {
        // Silently suppress RPC errors
        console.debug(`Silenced RPC error for: ${url}`);
        return new Response(JSON.stringify({ 
          error: { message: 'RPC function not found', code: 'silent-handled' },
          data: null,
          silenced: true 
        }), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
    }
    
    // Check if url contains any patterns we want to silence
    const shouldSilenceFail = skipErrorPatterns.some(pattern => url.includes(pattern));
    
    const response = await originalFetch.apply(this, args);
    
    // For the patterns we want to silence, don't throw errors on 404s
    if (shouldSilenceFail && !response.ok) {
      console.debug(`Silenced fetch error for: ${url}`);
      return new Response(JSON.stringify({ silenced: true }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    return response;
  } catch (error) {
    // Check if error is related to patterns we want to silence
    const errorString = error.toString();
    const shouldSilence = skipErrorPatterns.some(pattern => 
      args[0].toString().includes(pattern) || errorString.includes(pattern)
    );
    
    if (shouldSilence) {
      console.debug(`Silenced fetch error: ${errorString}`);
      return new Response(JSON.stringify({ silenced: true }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    throw error;
  }
};

/**
 * Debounces a function to prevent frequent calls
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction() {
    const context = this;
    const args = arguments;
    const later = () => {
      clearTimeout(timeout);
      func.apply(context, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Cache for database results
const dataCache = {
  gameSessions: new Map(),
  gameCount: new Map(),
  cacheExpiry: 60000, // 1 minute cache by default
  longExpiry: 300000, // 5 minute cache for less frequently changing data
};

/**
 * Clear all caches - call this when component unmounts or wallet changes
 */
export const clearCaches = () => {
  dataCache.gameSessions.clear();
  dataCache.gameCount.clear();
};

/**
 * Fetch game sessions count from Supabase with caching
 */
export const fetchGameSessionsCount = async (address, supabase, setSessionGamesCount) => {
  if (!address || !supabase) return 0;
  
  try {
    // Check cache first
    const cacheKey = `sessions_${address.toLowerCase()}`;
    const cachedData = dataCache.gameSessions.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp < dataCache.cacheExpiry)) {
      // Use cached data if not expired
      if (setSessionGamesCount) {
        setSessionGamesCount(cachedData.count);
      }
      return cachedData.count;
    }
    
    // Fetch from database if no cache or expired
    const { count, error } = await supabase
      .from('game_sessions')
      .select('session_id', { count: 'exact', head: true })
      .eq('wallet_address', address.toLowerCase());
    
    if (error) {
      console.error('Error counting game sessions:', error);
      return 0;
    }
    
    // Update cache
    dataCache.gameSessions.set(cacheKey, {
      count: count || 0,
      timestamp: Date.now()
    });
    
    // Update state if callback provided
    if (setSessionGamesCount) {
      setSessionGamesCount(count || 0);
    }
    
    return count || 0;
  } catch (error) {
    console.error('Error counting game sessions:', error);
    return 0;
  }
};

/**
 * Increments games count in Supabase with caching
 */
export const incrementGamesCount = async (address, supabase) => {
  if (!address || !supabase) {
    console.error("Cannot increment games count: missing wallet address or supabase client");
    return 0;
  }
  
  try {
    // Check cache for current count
    const cacheKey = `games_${address.toLowerCase()}`;
    const cachedData = dataCache.gameCount.get(cacheKey);
    let currentCount = 0;
    
    // If we have fresh cache, use it to avoid a database read
    if (cachedData && (Date.now() - cachedData.timestamp < dataCache.cacheExpiry)) {
      currentCount = cachedData.count;
    } else {
      // Otherwise fetch from database
      const { data, error } = await supabase
        .from('games')
        .select('count')
        .eq('wallet_address', address.toLowerCase())
        .maybeSingle();
        
      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching current games count:", error);
        return 0;
      }
      
      currentCount = data?.count || 0;
    }
    
    // Calculate new count
    const newCount = currentCount + 1;
    
    // Use upsert to handle both insert and update
    const { error: upsertError } = await supabase
      .from('games')
      .upsert({
        wallet_address: address.toLowerCase(),
        count: newCount
      }, { onConflict: 'wallet_address' });
    
    if (upsertError) {
      console.error("Error updating games count:", upsertError);
      return currentCount;
    }
    
    // Update cache with new count
    dataCache.gameCount.set(cacheKey, {
      count: newCount,
      timestamp: Date.now()
    });
    
    return newCount;
  } catch (err) {
    console.error("Failed to update games count:", err);
    return 0;
  }
};

/**
 * Throttled version of fetch operations to prevent too many calls
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const context = this;
    const args = arguments;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}; 