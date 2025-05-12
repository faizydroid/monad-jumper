const ethers = require('ethers');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: true,
  credentials: true
}));

// Create a mock wallet for testing purposes
// In production, you would use a real wallet with proper key management
const mockPrivateKey = process.env.PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000001';
const wallet = new ethers.Wallet(mockPrivateKey);
console.log(`Using wallet address: ${wallet.address} for game signatures`);

// In-memory store for session tokens (in production, use Redis or similar)
const sessionTokens = new Map();

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

// Register a new session token
app.post('/api/register-session-token', async (req, res) => {
  const { address, token, gameId, timestamp } = req.body;
  
  if (!address || !token || !gameId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Store the token with address association
  sessionTokens.set(token, {
    address: address.toLowerCase(),
    gameId,
    timestamp: timestamp || Date.now(),
    used: false
  });
  
  console.log(`Registered session token for ${address} and game ${gameId}`);
  
  // Set as HTTP-only cookie too
  res.cookie('gameSessionToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 10 * 60 * 1000 // 10 minutes
  });
  
  res.json({ success: true });
});

// Validate a session token
app.post('/api/validate-session-token', async (req, res) => {
  const { token, address, score } = req.body;
  
  // Get token from headers if not in body
  const headerToken = req.headers['x-game-session-token'];
  const tokenToValidate = token || headerToken;
  
  // Also try to get from cookies
  const cookieToken = req.cookies.gameSessionToken;
  
  if (!tokenToValidate && !cookieToken) {
    return res.status(400).json({ error: 'No token provided', valid: false });
  }
  
  // Check if token exists in our store
  const tokenData = sessionTokens.get(tokenToValidate || cookieToken);
  
  if (!tokenData) {
    return res.status(403).json({ error: 'Invalid token', valid: false });
  }
  
  // Check if token is for the same address
  if (address && tokenData.address !== address.toLowerCase()) {
    return res.status(403).json({ error: 'Token does not match address', valid: false });
  }
  
  // Check if token has been used
  if (tokenData.used) {
    return res.status(403).json({ error: 'Token already used', valid: false });
  }
  
  // Mark token as used
  tokenData.used = true;
  
  // Clear the cookie
  res.clearCookie('gameSessionToken');
  
  // Return success
  return res.json({ 
    valid: true, 
    address: tokenData.address,
    gameId: tokenData.gameId
  });
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