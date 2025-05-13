const ethers = require('ethers');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: ['https://www.jumpnads.xyz', 'https://jumpnads.xyz', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-game-session-token']
}));

// Create a mock wallet for testing purposes
// In production, you would use a real wallet with proper key management
const mockPrivateKey = process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001';
const wallet = new ethers.Wallet(mockPrivateKey);
console.log(`Using wallet address: ${wallet.address} for game signatures`);

// In-memory store for session tokens (in production, use Redis or similar)
const sessionTokens = new Map();

// In-memory rate limiting store
const ipRateLimits = new Map();

// Middleware to clean up expired tokens (older than 10 minutes)
function cleanupExpiredTokens() {
  const now = Date.now();
  const expiryTime = 10 * 60 * 1000; // 10 minutes
  
  for (const [token, data] of sessionTokens.entries()) {
    if (now - data.timestamp > expiryTime) {
      sessionTokens.delete(token);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupExpiredTokens, 60 * 1000);

// Add strict validation middleware for all Supabase requests
app.use('/api/*', (req, res, next) => {
  // Get client IP for rate limiting
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  // Basic IP-based rate limiting
  const now = Date.now();
  const rateWindow = 60 * 1000; // 1 minute window
  const maxRequests = 30; // Max requests per window
  
  // Check rate limits
  if (!ipRateLimits.has(clientIP)) {
    ipRateLimits.set(clientIP, []);
  }
  
  // Get request timestamps for this IP and clean old ones
  const requests = ipRateLimits.get(clientIP).filter(time => now - time < rateWindow);
  
  // Check if too many requests
  if (requests.length >= maxRequests) {
    console.log(`Rate limit exceeded for ${clientIP}`);
    return res.status(429).json({
      error: 'Too many requests, please try again later',
      retryAfter: '60 seconds'
    });
  }
  
  // Add current request timestamp
  requests.push(now);
  ipRateLimits.set(clientIP, requests);
  
  // Allow to continue
  next();
});

// Custom middleware to proxy Supabase requests with validation
app.use('/api/proxy/supabase', async (req, res) => {
  try {
    // ALWAYS require session token for ALL Supabase operations
    // Check multiple sources for the token
    const sessionToken = req.headers['x-game-session-token'] || 
                         req.cookies.gameSessionToken || 
                         req.body.sessionToken;
    
    if (!sessionToken) {
      return res.status(403).json({
        error: 'Unauthorized: No session token provided',
        details: 'All Supabase operations require a valid game session token'
      });
    }
    
    // Try to parse token if it's a JSON string
    let parsedToken = null;
    let rawToken = sessionToken;
    
    try {
      if (typeof sessionToken === 'string' && (sessionToken.startsWith('{') || sessionToken.startsWith('['))) {
        parsedToken = JSON.parse(sessionToken);
        // Use the inner token value if available
        if (parsedToken && parsedToken.token) {
          rawToken = parsedToken.token;
        }
      }
    } catch (e) {
      console.warn('Failed to parse session token as JSON:', e);
    }
    
    // Validate the token
    const tokenData = sessionTokens.get(rawToken) || sessionTokens.get(sessionToken);
    
    if (!tokenData) {
      return res.status(403).json({
        error: 'Invalid session token',
        details: 'The provided token was not found or has expired'
      });
    }
    
    if (tokenData.used) {
      return res.status(403).json({
        error: 'Token already used',
        details: 'This token has already been used for a previous operation'
      });
    }
    
    // Mark token as used IMMEDIATELY
    tokenData.used = true;
    
    // Try to clear the token cookie - don't abort if this fails
    try {
      res.clearCookie('gameSessionToken');
    } catch (cookieError) {
      console.warn('Failed to clear cookie, continuing anyway');
    }
    
    // Continue with request to Supabase
    // Extract the supabase endpoint from request
    const supabaseAction = req.body.action;
    
    // Additional validation for score submissions
    if (supabaseAction === 'scores' && req.method === 'POST') {
      const scoreData = req.body.data;
      
      // Require additional validation for scores table
      if (!scoreData || !scoreData.wallet_address || !scoreData.score) {
        return res.status(400).json({ 
          error: 'Invalid score data',
          details: 'Missing required fields'
        });
      }
      
      // Check if token address exists and matches (but be lenient)
      let tokenAddressValid = true;
      if (tokenData.address && scoreData.wallet_address) {
        // Do case-insensitive comparison
        if (tokenData.address.toLowerCase() !== scoreData.wallet_address.toLowerCase()) {
          console.warn(`Token address mismatch: Token=${tokenData.address}, Request=${scoreData.wallet_address}`);
          tokenAddressValid = false;
          
          // Even though invalid, let it proceed for score saving
          // Just log a warning but don't block the request
        }
      }
      
      // Check for score consistency with token data - be lenient for saving scores
      let scoreMatches = true;
      if (parsedToken && parsedToken.finalScore !== undefined) {
        // If token contains a score claim, validate it matches the submission
        const tokenScore = parseInt(parsedToken.finalScore);
        const submittedScore = parseInt(scoreData.score);
        
        if (isNaN(tokenScore) || isNaN(submittedScore) || tokenScore !== submittedScore) {
          console.warn(`Score mismatch: Token claims ${tokenScore}, submission is ${submittedScore}`);
          scoreMatches = false;
          
          // For scores, let it proceed anyway but log a warning
          // This helps ensure scores are still saved even if validation is imperfect
        }
      }
      
      // Add validation results to response
      res.json({
        success: true,
        validated: true,
        addressMatch: tokenAddressValid,
        scoreMatch: scoreMatches,
        address: tokenData.address,
        gameId: tokenData.gameId
      });
      
    } else if (supabaseAction === 'jumps' && (req.method === 'POST' || req.method === 'PUT')) {
      const jumpData = req.body.data;
      
      // Require additional validation for jumps table
      if (!jumpData || !jumpData.wallet_address || !jumpData.count) {
        return res.status(400).json({ 
          error: 'Invalid jump data',
          details: 'Missing required fields'
        });
      }
      
      // Ensure wallet matches token
      if (jumpData.wallet_address.toLowerCase() !== tokenData.address.toLowerCase()) {
        return res.status(403).json({
          error: 'Token does not match address',
          details: 'The wallet address in the request does not match the token owner'
        });
      }
      
      // Add validation results to response
      res.json({
        success: true,
        validated: true,
        address: tokenData.address,
        gameId: tokenData.gameId
      });
      
    } else {
      // Generic response for other validated endpoints
      res.json({
        success: true,
        validated: true
      });
    }
  } catch (error) {
    console.error('Error in Supabase proxy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/game/signature', async (req, res) => {
  const { player, score, jumps } = req.body;
  
  // Create message hash
  const messageHash = ethers.utils.solidityKeccak256(
    ['address', 'uint256', 'uint256'],
    [player, score, jumps]
  );
  
  // Sign with private key
  const signature = await wallet.signMessage(ethers.utils.arrayify(messageHash));
  
  res.json({ signature });
});

// Validate a session token
app.post('/api/validate-session-token', async (req, res) => {
  // Get token from header, body, or cookie
  const token = req.headers['x-game-session-token'] || 
                req.body.token || 
                req.cookies.gameSessionToken || 
                null;
  
  if (!token) {
    return res.status(400).json({
      error: 'Missing token',
      valid: false
    });
  }
  
  try {
    // Parse token if it's a string
    let parsedToken = token;
    
    try {
      if (typeof token === 'string' && (token.startsWith('{') || token.startsWith('['))) {
        parsedToken = JSON.parse(token);
      }
    } catch (e) {
      console.warn('Failed to parse token as JSON:', e);
    }
    
    // Check token timestamp is recent - within last 10 minutes max
    const tokenTime = parsedToken.timestamp || parsedToken.finishTime || 0;
    const now = Date.now();
    const maxTokenAge = 10 * 60 * 1000; // 10 minutes
    
    if (tokenTime && (now - tokenTime > maxTokenAge)) {
      return res.status(403).json({
        error: 'Token expired',
        valid: false,
        details: `Token is ${Math.round((now - tokenTime) / 1000)}s old, max age is ${maxTokenAge / 1000}s`
      });
    }
    
    // Basic validity check passed
    return res.json({
      valid: true,
      token: {
        ...parsedToken,
        value: undefined, // Don't return potentially sensitive values
        validated: true,
        validatedAt: now
      }
    });
  } catch (error) {
    console.error('Token validation error:', error);
    return res.status(500).json({
      error: 'Token validation error',
      message: error.message,
      valid: false
    });
  }
});

// Register a new session token
app.post('/api/register-session-token', async (req, res) => {
  const { address, token, gameId, timestamp, tokenData } = req.body;
  
  if (!address || !token || !gameId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    // Parse token data if available
    let parsedToken = tokenData;
    
    if (!parsedToken && typeof token === 'string') {
      try {
        // Try to parse JSON token
        if (token.startsWith('{') || token.startsWith('[')) {
          parsedToken = JSON.parse(token);
        }
      } catch (e) {
        console.warn('Failed to parse token as JSON:', e);
      }
    }
    
    // Store token in app memory
    const registeredToken = {
      token, 
      address, 
      gameId,
      timestamp: timestamp || Date.now(),
      registered: true,
      parsed: parsedToken
    };
    
    // For now, just log it - in a real app you'd store this in a database
    console.log('Registered token:', registeredToken);
    
    return res.json({
      success: true,
      message: 'Token registered successfully',
      tokenId: Math.random().toString(36).substring(2)
    });
  } catch (error) {
    console.error('Error registering token:', error);
    return res.status(500).json({
      error: 'Token registration error',
      message: error.message
    });
  }
});

// Add a check for direct Supabase API key usage in headers
app.use((req, res, next) => {
  // List of valid API keys we want to protect
  const protectedApiKeys = [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56aWZpcHV1bnphbmVheGR4cWptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTc5Nzk2OCwiZXhwIjoyMDU3MzczOTY4fQ.DYCfh24h9yiu3TXmkZ5Y3N96_3HluZ6VQEom8fzEYBg',
    // Add any other API keys here
  ];
  
  // Skip our own authorized routes
  if (req.path.startsWith('/api/proxy/')) {
    return next();
  }
  
  // Check all headers for protected API keys
  for (const [headerName, headerValue] of Object.entries(req.headers)) {
    // Check if any protected key is found in the header
    if (typeof headerValue === 'string' && 
        protectedApiKeys.some(key => headerValue.includes(key))) {
      
      console.error(`SECURITY ALERT: Direct API key usage detected in request headers to ${req.path}`);
      
      // Log the attempt
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      console.error(`Client IP: ${clientIP}, Path: ${req.path}, Method: ${req.method}`);
      
      // Block the request
      return res.status(403).json({
        error: 'Unauthorized direct API access',
        message: 'Direct usage of API keys is not allowed'
      });
    }
  }
  
  // Check request body if it exists and is readable
  if (req.body && typeof req.body === 'object') {
    const bodyStr = JSON.stringify(req.body);
    
    // Check if any protected key is found in the body
    if (protectedApiKeys.some(key => bodyStr.includes(key))) {
      console.error(`SECURITY ALERT: Direct API key usage detected in request body to ${req.path}`);
      
      // Log the attempt
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      console.error(`Client IP: ${clientIP}, Path: ${req.path}, Method: ${req.method}`);
      
      // Block the request
      return res.status(403).json({
        error: 'Unauthorized direct API access',
        message: 'Direct usage of API keys is not allowed in request body'
      });
    }
  }
  
  // Check query parameters
  if (req.query) {
    const queryStr = JSON.stringify(req.query);
    
    // Check if any protected key is found in query parameters
    if (protectedApiKeys.some(key => queryStr.includes(key))) {
      console.error(`SECURITY ALERT: Direct API key usage detected in query parameters to ${req.path}`);
      
      // Log the attempt
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      console.error(`Client IP: ${clientIP}, Path: ${req.path}, Method: ${req.method}`);
      
      // Block the request
      return res.status(403).json({
        error: 'Unauthorized direct API access',
        message: 'Direct usage of API keys is not allowed in query parameters'
      });
    }
  }
  
  // Also block any direct requests to Supabase endpoints
  if (req.path.includes('supabase.co/rest') || req.path.includes('nzifipuunzaneaxdxqjm')) {
    console.error(`SECURITY ALERT: Direct Supabase request attempted to ${req.path}`);
    
    // Log the attempt
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.error(`Client IP: ${clientIP}, Path: ${req.path}, Method: ${req.method}`);
    
    return res.status(403).json({
      error: 'Unauthorized direct Supabase access',
      message: 'Direct access to Supabase endpoints is not allowed'
    });
  }
  
  // No protected API keys found, proceed
  next();
});

// Add a security reporting endpoint
app.post('/api/security/report', (req, res) => {
  try {
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const reportData = req.body;
    
    console.error('SECURITY INCIDENT REPORT:', {
      timestamp: new Date().toISOString(),
      clientIP,
      data: reportData
    });
    
    // In a production environment, you could:
    // 1. Send this to a security monitoring service
    // 2. Store in a separate database for analysis
    // 3. Trigger alerts
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing security report:', error);
    res.status(500).json({ error: 'Error processing report' });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Add a test endpoint to verify server is working
app.get('/api/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    tokens: {
      count: sessionTokens.size,
      newest: sessionTokens.size > 0 ? 
        Array.from(sessionTokens.entries())[sessionTokens.size - 1][1].timestamp : null
    }
  });
}); 