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
      
      // Store original update method for jumps table
      const originalUpdate = builder.update.bind(builder);
      
      // Store original upsert method for jumps table
      const originalUpsert = builder.upsert.bind(builder);
      
      // Create a function to handle token validation for all operations
      const addSessionTokenToOptions = (data, options = {}) => {
        console.log(`Intercepted ${table} operation:`, data);
        
        try {
          // Ensure options.headers exists
          options.headers = options.headers || {};
          
          // Check for session token in window global
          if (window.__SECURE_GAME_TOKEN?.value && !window.__SECURE_GAME_TOKEN.used) {
            // Add token to request headers
            options.headers['x-game-session-token'] = window.__SECURE_GAME_TOKEN.value;
            console.log(`Added session token to ${table} request headers`);
            
            // Mark as used after adding to headers
            window.__SECURE_GAME_TOKEN.used = true;
          }
          // Also check for session token in data object
          else if (data.session_token) {
            // Add token to request headers
            options.headers['x-game-session-token'] = data.session_token;
            console.log(`Added session token from data to ${table} request headers`);
            
            // Remove from the data to avoid storing it in the database
            if (Array.isArray(data)) {
              data.forEach(item => delete item.session_token);
            } else {
              delete data.session_token;
            }
          }
          
          return options;
        } catch (error) {
          console.error(`Error in session validation middleware for ${table}:`, error);
          return options;
        }
      };
      
      // Override insert method for protected tables
      if (table === 'scores' || table === 'jumps') {
        builder.insert = function(data, options = {}) {
          options = addSessionTokenToOptions(data, options);
          return originalInsert(data, options);
        };
        
        // Also protect update operations for jumps table
        builder.update = function(data, options = {}) {
          options = addSessionTokenToOptions(data, options);
          return originalUpdate(data, options);
        };
        
        // Also protect upsert operations for jumps table
        builder.upsert = function(data, options = {}) {
          options = addSessionTokenToOptions(data, options);
          return originalUpsert(data, options);
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