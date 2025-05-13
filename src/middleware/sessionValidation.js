// Supabase middleware for session token validation
export const validateGameSession = async (req, supabase) => {
  // Get the token from request headers, local storage, or cookie
  const token = req.headers['x-game-session-token'] || 
               (typeof window !== 'undefined' && window.__SECURE_GAME_TOKEN?.value) ||
               (typeof window !== 'undefined' && window.__APP_SECURE_TOKEN) ||
               (typeof document !== 'undefined' && getCookie('gameSessionToken'));
  
  if (!token) {
    console.error('No session token found for validation');
    
    // For high score saving, we'll allow it to continue with a warning
    // Check if this is a score-related operation
    if (req.body?.action === 'scores' || req.url?.includes('scores')) {
      console.warn('No token for score operation - allowing with validation warning');
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
    
    console.log(`Validating session token at: ${validationUrl}`);
    
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
      console.error('Session validation failed:', errorData);
      
      // Special handling for score operations - allow them to continue with a warning
      if (req.body?.action === 'scores' || req.url?.includes('scores')) {
        console.warn('Score validation failed but allowing operation with warning');
        return { 
          valid: true, 
          fallback: true, 
          error: errorData.error || 'Validation failed'
        };
      }
      
      return { valid: false, error: errorData.error || 'Validation failed' };
    }
    
    const result = await response.json();
    console.log('Session validation successful:', result);
    return { valid: true, data: result };
  } catch (error) {
    console.error('Error validating session token:', error);
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
  // Store the original functions we need to override
  const originalInsert = supabase.from;
  
  // Create a wrapped version that uses our proxy
  const secureFrom = (table) => {
    // Get the original table methods
    const originalTable = originalInsert(table);
    
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
            console.error(`Secure token missing or already used for ${table} operation`);
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
            console.error(`Error in secure proxy for ${table}:`, error);
            return { error, status: 500, statusText: 'Internal Server Error' };
          }
        } else {
          // For non-sensitive endpoints, use the original method
          return originalTable.insert(data, options);
        }
      }
    };
  };
  
  // Return a modified Supabase client
  return {
    ...supabase,
    from: secureFrom
  };
}; 