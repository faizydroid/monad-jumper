// Check if we're in production mode
const isProduction = typeof window !== 'undefined' && 
                    window.location.hostname !== 'localhost' && 
                    !window.location.hostname.includes('127.0.0.1') &&
                    !window.location.hostname.includes('.local');

// Set up conditional logging functions
const logInfo = isProduction ? () => {} : console.log;
const logWarn = isProduction ? () => {} : console.warn;
const logError = console.error; // Keep error logging for critical issues

// Supabase middleware for session token validation
export const validateGameSession = async (req, supabase) => {
  // Get the token from request headers, local storage, or cookie
  const token = req.headers['x-game-session-token'] || 
               (typeof window !== 'undefined' && window.__SECURE_GAME_TOKEN?.value) ||
               (typeof window !== 'undefined' && window.__APP_SECURE_TOKEN) ||
               (typeof document !== 'undefined' && getCookie('gameSessionToken'));
  
  if (!token) {
    logError('No session token found for validation');
    
    // For high score saving, we'll allow it to continue with a warning
    // Check if this is a score-related operation
    if (req.body?.action === 'scores' || req.url?.includes('scores')) {
      logWarn('No token for score operation - allowing with validation warning');
      return { 
        valid: true, 
        fallback: true, 
        error: 'Missing token for score operation'
      };
    }
    
    return { valid: false, error: 'No session token provided' };
  }
  
  try {
    // Determine the base URL - preferably use an environment variable
    const baseUrl = process.env.API_URL || 
                   (typeof window !== 'undefined' ? window.location.origin : '');
    const validationUrl = `${baseUrl}/api/validate-session-token`;
    
    logInfo(`Validating session token at: ${validationUrl}`);
    
    // Make a request to our validation endpoint
    const response = await fetch(validationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-game-session-token': token
      },
      credentials: 'include',
      body: JSON.stringify({ token })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown validation error' }));
      logError('Session validation failed:', errorData);
      
      // Special handling for score operations - allow them to continue with a warning
      if (req.body?.action === 'scores' || req.url?.includes('scores')) {
        logWarn('Score validation failed but allowing operation with warning');
        return { 
          valid: true, 
          fallback: true, 
          error: errorData.error || 'Validation failed'
        };
      }
      
      return { valid: false, error: errorData.error || 'Validation failed' };
    }
    
    const result = await response.json();
    logInfo('Session validation successful:', result);
    return { valid: true, data: result };
  } catch (error) {
    logError('Error validating session token:', error);
    // Continue anyway - don't block the user if validation server is down
    return { valid: true, error: error.message, fallback: true };
  }
};

// Helper function to get a cookie by name
function getCookie(name) {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Export a function to create a secured version of Supabase that uses the proxy
export const createSecureSupabase = (supabase) => {
  // If supabase is not provided, return null to avoid errors
  if (!supabase) {
    logError('No Supabase client provided to createSecureSupabase');
    return null;
  }

  // IMPORTANT: Return the original client if we're in the admin dashboard
  // This is a simple way to avoid issues with the admin dashboard
  if (typeof window !== 'undefined' && window.location.pathname.includes('/admin')) {
    logInfo('Using original Supabase client for admin dashboard');
    return supabase;
  }

  // Store the original functions we need to override
  const originalFrom = supabase.from;
  const originalRpc = supabase.rpc;
  
  // Create a wrapped version that uses our proxy
  const secureFrom = (table) => {
    // Get the original table methods
    const originalTable = originalFrom(table);
    
    // Create secured versions of the methods
    return {
      ...originalTable,
      // Override insert to use our proxy
      insert: async (data, options = {}) => {
        // Only redirect score and sensitive operations
        const sensitiveEndpoints = ['scores', 'jumps', 'users'];
        
        if (sensitiveEndpoints.includes(table)) {
          // Check if we have a session token
          const token = typeof window !== 'undefined' && window.__SECURE_GAME_TOKEN?.value;
          
          if (!token || window.__SECURE_GAME_TOKEN?.used) {
            logError(`Secure token missing or already used for ${table} operation`);
            return { 
              error: { message: 'Missing or used session token' },
              status: 403,
              statusText: 'Forbidden'
            };
          }
          
          try {
            // Mark token as used
            window.__SECURE_GAME_TOKEN.used = true;
            
            // Use our proxy endpoint which requires token validation
            const response = await fetch('/api/proxy/supabase', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-game-session-token': typeof token === 'string' ? token : JSON.stringify(token)
              },
              credentials: 'include',
              body: JSON.stringify({
                action: table,
                data: data,
                options: options
              })
            });
            
            return await response.json();
          } catch (error) {
            logError(`Error in secure proxy for ${table}:`, error);
            return { error, status: 500, statusText: 'Internal Server Error' };
          }
        } else {
          // For non-sensitive endpoints, use the original method
          return originalTable.insert(data, options);
        }
      }
    };
  };
  
  // Return a modified Supabase client with all original methods
  return {
    ...supabase,
    from: secureFrom,
    // Ensure rpc is properly passed through
    rpc: originalRpc ? originalRpc.bind(supabase) : undefined,
    // Add any other methods that need to be preserved
    rest: supabase.rest,
    auth: supabase.auth,
    storage: supabase.storage,
    functions: supabase.functions
  };
}; 