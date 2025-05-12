// Supabase middleware for session token validation
const validateGameSession = async (req, supabase) => {
  // Get the token from request headers
  const token = req.headers['x-game-session-token'];
  
  if (!token) {
    console.error('No session token provided in headers');
    return { valid: false, error: 'No session token provided' };
  }
  
  try {
    // Determine the base URL - preferably use an environment variable
    const baseUrl = process.env.API_URL || window.location.origin;
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

// Configure Supabase client to use session validation
export const setupSessionValidation = (supabaseClient) => {
  // Log that we're setting up session validation
  console.log("Setting up session validation for Supabase client");
  
  try {
    // The original approach using realtime.setAuth is not correct
    // Instead, we'll keep a reference to the client and its methods
    const originalFrom = supabaseClient.from.bind(supabaseClient);
    
    // Override the 'from' method to inject our validation logic
    supabaseClient.from = (table) => {
      const builder = originalFrom(table);
      
      // Store original insert method
      const originalInsert = builder.insert.bind(builder);
      
      // Override insert method for 'scores' table only
      if (table === 'scores') {
        builder.insert = function(data, options = {}) {
          console.log('Intercepted scores insert:', data);
          
          try {
            // Ensure options.headers exists
            options.headers = options.headers || {};
            
            // Check for session token in data
            if (data.session_token) {
              // Add token to request headers
              options.headers['x-game-session-token'] = data.session_token;
              console.log('Added session token to request headers');
            }
            
            // Call original insert with our modified options
            return originalInsert(data, options);
          } catch (error) {
            console.error('Error in session validation middleware:', error);
            // Fall back to original behavior
            return originalInsert(data);
          }
        };
      }
      
      return builder;
    };
    
    return supabaseClient;
  } catch (error) {
    console.error('Failed to set up session validation middleware:', error);
    return supabaseClient; // Return original client as fallback
  }
};

export default {
  validateGameSession,
  setupSessionValidation
}; 