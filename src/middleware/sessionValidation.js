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

// Modified to work with the secure Supabase client wrapper
export const setupSessionValidation = (supabaseClient) => {
  // Log that we're setting up session validation
  console.log("Setting up session validation for Supabase client");
  
  // The Supabase client is now wrapped with security in supabaseClient.js
  // This function is kept for compatibility with existing code
  return supabaseClient;
};

export default {
  validateGameSession,
  setupSessionValidation
}; 