const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');

// Discord bot configuration
const BOT_TOKEN = 'MTM2ODExNjc5NDYzMTY1MTM5OQ.G9MEqM.TqhS03tgsweR9hZYF2O3UjgFuIyI9J_iCmBzNE';
const GUILD_ID = '960989963560816701';
const NFT_ROLE_ID = '1368988575131242517';

// Create Express server
const app = express();
const PORT = process.env.PORT || 9000;

// Enable CORS for all routes (important for local development)
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:5173', 
    'https://jumpnads.xyz', 
    'https://www.jumpnads.xyz'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Handle preflight OPTIONS requests
app.options('*', cors());

// Parse JSON bodies
app.use(bodyParser.json());

// Validate Discord bot token at startup
(async function validateToken() {
  try {
    console.log('Validating Discord bot token...');
    const response = await axios.get('https://discord.com/api/v9/users/@me', {
      headers: {
        'Authorization': `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('Discord bot token is valid! Bot logged in as:', response.data.username);
  } catch (error) {
    console.error('ERROR: Discord bot token validation failed!');
    console.error('Error details:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.error('CRITICAL: The Discord bot token is invalid or expired. Please update the token.');
    }
  }
})();

// Add a test endpoint to check if the server is running
app.get('/ping', async (req, res) => {
  try {
    // Validate Discord token
    let tokenStatus = { valid: false, error: null };
    
    try {
      const response = await axios.get('https://discord.com/api/v9/users/@me', {
        headers: {
          'Authorization': `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      tokenStatus.valid = true;
      tokenStatus.botName = response.data.username;
      tokenStatus.botId = response.data.id;
    } catch (error) {
      tokenStatus.error = error.response?.data || error.message;
      console.error('Token validation error:', tokenStatus.error);
    }
    
    res.json({ 
      status: "ok", 
      message: "Discord bot server is running",
      discord: {
        token: tokenStatus,
        guild_id: GUILD_ID,
        role_id: NFT_ROLE_ID
      } 
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Endpoint for verification
app.post('/verify-nft', async (req, res) => {
  try {
    const { discordId, success, walletAddress } = req.body;
    
    if (!discordId || success === undefined) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    console.log(`Verification request for Discord user ${discordId}, wallet ${walletAddress}, Success: ${success}`);
    
    if (success) {
      try {
        // Check if the user is in the guild first
        try {
          const memberCheckUrl = `https://discord.com/api/v9/guilds/${GUILD_ID}/members/${discordId}`;
          await axios.get(memberCheckUrl, {
            headers: {
              'Authorization': `Bot ${BOT_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (memberError) {
          // If user isn't in the guild, return a helpful message
          if (memberError.response?.data?.code === 10007 || memberError.response?.data?.code === 10013) {
            console.log(`User ${discordId} is not in the Discord server or doesn't exist`);
            return res.status(400).json({ 
              success: false, 
              error: { 
                message: "User is not a member of the Discord server. Please join the server first!", 
                code: "USER_NOT_IN_SERVER"
              },
              note: 'Verification was successful, but user is not in the Discord server'
            });
          }
          // If it's another error, continue to try assigning the role
        }
        
        // Use Discord API directly instead of discord.js library
        // Add member to role using Discord API
        const addRoleUrl = `https://discord.com/api/v9/guilds/${GUILD_ID}/members/${discordId}/roles/${NFT_ROLE_ID}`;
        
        const response = await axios.put(addRoleUrl, {}, {
          headers: {
            'Authorization': `Bot ${BOT_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`Successfully added role to user ${discordId}`);
        
        // Return success
        return res.json({ success: true, message: 'Role added successfully' });
      } catch (error) {
        console.error('Error adding role:', error.response?.data || error.message);
        
        // Format nicer error messages
        let errorMessage = 'Failed to assign Discord role';
        let errorCode = 'UNKNOWN_ERROR';
        
        if (error.response?.data?.code === 10007 || error.response?.data?.code === 10013) {
          errorMessage = 'User is not a member of the Discord server. Please join the server first!';
          errorCode = 'USER_NOT_IN_SERVER';
        } else if (error.response?.data?.code === 50013) {
          errorMessage = 'Bot does not have permission to assign roles';
          errorCode = 'MISSING_PERMISSIONS';
        }
        
        return res.status(400).json({ 
          success: false, 
          error: { message: errorMessage, code: errorCode },
          note: 'NFT verification was successful, but role could not be assigned'
        });
      }
    } else {
      return res.json({ success: false, message: 'No NFT found' });
    }
  } catch (error) {
    console.error('Error processing verification:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Discord bot verification server running on port ${PORT}`);
  console.log(`Test the server by visiting http://localhost:${PORT}/ping`);
}); 