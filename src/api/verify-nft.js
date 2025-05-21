import { ethers } from 'ethers';
import axios from 'axios';
import { DISCORD_CONFIG, NFT_CONFIG, MONAD_TESTNET } from '../config/discord';

// Simple ERC721 ABI for checking NFT ownership
const MINIMAL_ERC721_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)'
];

/**
 * API endpoint to verify NFT ownership and assign Discord role
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { address, signature, message, discordId, discordToken } = req.body;

  if (!address || !signature || !message || !discordId || !discordToken) {
    return res.status(400).json({ success: false, message: 'Missing required parameters' });
  }

  try {
    // Verify that the signature matches the address
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    // Connect to Monad Testnet
    const provider = new ethers.providers.JsonRpcProvider(MONAD_TESTNET.RPC_URLS[0]);
    
    // Create contract instance
    const nftContract = new ethers.Contract(
      NFT_CONFIG.CONTRACT_ADDRESS,
      MINIMAL_ERC721_ABI,
      provider
    );

    // Check if the user owns any NFTs from the contract
    const balance = await nftContract.balanceOf(address);
    
    if (balance.toNumber() === 0) {
      return res.status(200).json({ 
        success: false, 
        message: 'No NFT found for this address' 
      });
    }

    // Verify Discord token is valid by getting user info
    const discordUserResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${discordToken}`
      }
    });

    // Confirm user identity matches
    if (discordUserResponse.data.id !== discordId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Discord user validation failed' 
      });
    }

    // Assign the role using Discord API
    await axios.put(
      `https://discord.com/api/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${discordId}/roles/${DISCORD_CONFIG.DEFAULT_NFT_ROLE_ID}`,
      {},
      {
        headers: {
          Authorization: `Bot ${DISCORD_CONFIG.BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Record verification in database if needed
    // This would be implemented based on your database setup

    return res.status(200).json({
      success: true,
      message: 'NFT verified and role granted successfully'
    });
    
  } catch (error) {
    console.error('Verification error:', error);
    
    // Handle known errors
    if (error.response && error.response.status === 403) {
      return res.status(403).json({
        success: false,
        message: 'Bot lacks permission to assign roles'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again later.'
    });
  }
} 