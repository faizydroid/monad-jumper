const axios = require('axios');

// Discord bot token to check
const BOT_TOKEN = 'MTM2ODExNjc5NDYzMTY1MTM5OQ.G9MEqM.TqhS03tgsweR9hZYF2O3UjgFuIyI9J_iCmBzNE';

// Function to check if token is valid
async function checkToken() {
  console.log('Checking Discord bot token...');
  
  try {
    const response = await axios.get('https://discord.com/api/v9/users/@me', {
      headers: {
        'Authorization': `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ SUCCESS: Token is valid!');
    console.log('Bot username:', response.data.username);
    console.log('Bot ID:', response.data.id);
    return true;
  } catch (error) {
    console.error('❌ ERROR: Token is invalid!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error details:', error.response.data);
      
      if (error.response.status === 401) {
        console.error('This is an authentication error - your token is likely expired or incorrect.');
        console.error('Please generate a new token in the Discord Developer Portal.');
      }
    } else {
      console.error('Error:', error.message);
    }
    
    return false;
  }
}

// Check guild info
async function checkGuild() {
  const GUILD_ID = '960989963560816701';
  
  console.log('\nChecking Discord guild...');
  
  try {
    const response = await axios.get(`https://discord.com/api/v9/guilds/${GUILD_ID}`, {
      headers: {
        'Authorization': `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ SUCCESS: Guild exists and bot has access!');
    console.log('Guild name:', response.data.name);
    console.log('Guild ID:', response.data.id);
    console.log('Member count:', response.data.approximate_member_count || 'Unknown');
    return true;
  } catch (error) {
    console.error('❌ ERROR: Could not access guild!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error details:', error.response.data);
      
      if (error.response.status === 404) {
        console.error('The guild ID is incorrect or the bot is not in this guild.');
      } else if (error.response.status === 403) {
        console.error('The bot does not have permission to access this guild.');
      }
    } else {
      console.error('Error:', error.message);
    }
    
    return false;
  }
}

// Check role info
async function checkRole() {
  const GUILD_ID = '960989963560816701';
  const ROLE_ID = '1368988575131242517';
  
  console.log('\nChecking Discord role...');
  
  try {
    const response = await axios.get(`https://discord.com/api/v9/guilds/${GUILD_ID}/roles`, {
      headers: {
        'Authorization': `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const role = response.data.find(r => r.id === ROLE_ID);
    
    if (role) {
      console.log('✅ SUCCESS: Role exists!');
      console.log('Role name:', role.name);
      console.log('Role ID:', role.id);
      console.log('Role position:', role.position);
      return true;
    } else {
      console.error('❌ ERROR: Role not found in guild!');
      console.log('Available roles:');
      response.data.forEach(r => {
        console.log(`- ${r.name} (${r.id})`);
      });
      return false;
    }
  } catch (error) {
    console.error('❌ ERROR: Could not check roles!');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error details:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    
    return false;
  }
}

// Run all checks
async function runAllChecks() {
  const tokenValid = await checkToken();
  
  if (tokenValid) {
    await checkGuild();
    await checkRole();
  }
  
  console.log('\nDiagnostics complete!');
}

// Run the checks
runAllChecks(); 