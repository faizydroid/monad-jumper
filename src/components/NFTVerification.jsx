import React, { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { injected } from '@wagmi/connectors';
import { ethers } from 'ethers';
import axios from 'axios';
import { DISCORD_CONFIG, NFT_CONFIG, MONAD_TESTNET } from '../config/discord';
import './NFTVerification.css';

const NFTVerification = () => {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  
  const [discordToken, setDiscordToken] = useState('');
  const [discordUser, setDiscordUser] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  
  // Add a direct effect to set a class/data attribute on body when this component mounts
  // This helps the mobile detection logic recognize we're on the verification page
  useEffect(() => {
    console.log("🎯 NFT Verification component mounted - setting verification flags");
    
    // Set global flag that can be checked in App.jsx
    window.__ON_VERIFICATION_PAGE__ = true;
    
    // Add class to body
    document.body.classList.add('verification-page');
    
    // Add data attribute
    document.body.setAttribute('data-page', 'verify');
    
    // Set up an interval to periodically check and re-apply verification flags
    // This helps prevent the mobile view from taking over
    const flagCheckInterval = setInterval(() => {
      // Check if we're still on the verification page path
      if (window.location.pathname === '/verify' || 
          window.location.pathname.startsWith('/verify') ||
          window.location.href.includes('/verify')) {
        
        // Re-apply flags if they're missing
        if (!window.__ON_VERIFICATION_PAGE__ || 
            !document.body.classList.contains('verification-page') || 
            document.body.getAttribute('data-page') !== 'verify') {
          
          console.log("🔄 Reinstalling verification flags that were lost");
          window.__ON_VERIFICATION_PAGE__ = true;
          document.body.classList.add('verification-page');
          document.body.setAttribute('data-page', 'verify');
        }
      }
    }, 500); // Check every 500ms
    
    // Cleanup on unmount
    return () => {
      console.log("NFT Verification component unmounted - clearing verification flags");
      window.__ON_VERIFICATION_PAGE__ = false;
      document.body.classList.remove('verification-page');
      document.body.removeAttribute('data-page');
      clearInterval(flagCheckInterval);
    };
  }, []);
  
  // Parse Discord token from URL if coming from Discord OAuth
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      if (token) {
        setDiscordToken(token);
        fetchDiscordUser(token);
      }
    }
  }, []);

  // Fetch Discord user info
  const fetchDiscordUser = async (token) => {
    try {
      const response = await axios.get('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setDiscordUser(response.data);
    } catch (error) {
      console.error('Error fetching Discord user:', error);
      setVerificationStatus('Failed to fetch Discord user info');
    }
  };

  // Connect wallet handler
  const handleConnectWallet = async () => {
    try {
      await connect({ connector: injected() });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  // Connect Discord handler
  const handleConnectDiscord = () => {
    // Determine if we're in dev or production
    const isProduction = window.location.hostname !== 'localhost';
    
    // Get current hostname to handle both www and non-www versions
    const currentHost = window.location.hostname;
    const useWWW = currentHost.startsWith('www.');
    
    // Redirect URI - use appropriate URL for environment
    let redirectUri;
    if (isProduction) {
      // Use the exact same domain (www or non-www) as the user is currently on
      const protocol = window.location.protocol;
      redirectUri = encodeURIComponent(`${protocol}//${currentHost}/verify`);
      
      // For safety, also register two alternate versions with Discord OAuth
      console.log(`Using redirect URI: ${redirectUri}`);
    } else {
      // Local development
      redirectUri = encodeURIComponent("http://localhost:3000/verify");
    }
      
    window.location.href = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CONFIG.CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=identify`;
  };

  // Join Discord server handler
  const joinDiscordServer = () => {
    // Use the correct Discord server invite link - either from config or hardcoded invite
    window.open('https://discord.gg/960989963560816701', '_blank');
  };

  // Automatically assign Discord role
  const assignDiscordRole = async (discordId, hasNft) => {
    try {
      console.log('Assigning role to Discord user:', discordId, 'NFT status:', hasNft);
      
      // Determine environment
      const isProduction = window.location.hostname !== 'localhost';
      
      // Use the bot server endpoint based on environment
      const BOT_API_URL = isProduction
        ? 'https://jumpnads-bot.example.com/verify-nft' // Replace with your actual production bot API
        : 'http://localhost:9000/verify-nft';
      
      console.log('Using bot API URL:', BOT_API_URL);
      
      const response = await axios.post(BOT_API_URL, {
        discordId,
        success: hasNft,
        walletAddress: address
      }, { 
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Role assignment response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error assigning Discord role:', error);
      throw error;
    }
  };

  // Verify NFT ownership and assign role
  const handleVerify = async () => {
    if (!isConnected || !discordToken || !discordUser) {
      setVerificationStatus('Please connect both wallet and Discord first');
      return;
    }

    setIsLoading(true);
    setVerificationStatus('Verifying...');
    setIsVerified(false);

    try {
      // Sign message to verify wallet ownership
      const timestamp = new Date().getTime();
      const message = `Verifying NFT ownership for Discord role. Timestamp: ${timestamp}`;
      const signature = await signMessageAsync({ message });

      // Perform verification directly in the frontend
      try {
        // Connect to Monad Testnet
        const provider = new ethers.providers.JsonRpcProvider(MONAD_TESTNET.RPC_URLS[0]);
        
        // Create contract instance with minimal ERC-1155 ABI
        const MINIMAL_ERC1155_ABI = [
          'function balanceOf(address account, uint256 id) view returns (uint256)'
        ];
        
        const nftContract = new ethers.Contract(
          NFT_CONFIG.CONTRACT_ADDRESS,
          MINIMAL_ERC1155_ABI,
          provider
        );

        // For ERC-1155, we need to specify a token ID
        // Using token ID 0 as shown in the blockchain explorer
        const tokenId = 0;
        const balance = await nftContract.balanceOf(address, tokenId);
        
        // Check if user owns the NFT
        const hasNft = balance.toNumber() > 0;
        
        if (hasNft) {
          // AUTOMATICALLY assign Discord role via the bot API
          const roleResponse = await assignDiscordRole(discordUser.id, true);
          
          if (roleResponse.success) {
            setIsVerified(true);
            setVerificationStatus('NFT verified! Your Discord role has been automatically assigned. ✅');
          } else {
            // Handle API error cases with specific messages
            if (roleResponse.error?.code === 'USER_NOT_IN_SERVER') {
              setVerificationStatus('NFT verified! Please join the Discord server first, then try again.');
            } else if (roleResponse.error?.code === 'MISSING_PERMISSIONS') {
              setVerificationStatus('NFT verified! Bot needs higher permissions. Please contact server admin.');
            } else {
              setVerificationStatus('NFT verified! Role assignment issue: ' + (roleResponse.error?.message || 'Unknown error'));
            }
          }
        } else {
          setVerificationStatus('No NFT found for this address. Please make sure you connected the correct wallet.');
        }
      } catch (error) {
        console.error('NFT verification error:', error);
        setVerificationStatus('Failed to verify NFT ownership. Please try again.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationStatus('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="nft-verification-container">
      <div className="nft-verification-card">
        <h1 className="verification-heading">Jumpnads NFT verification</h1>
        
        <img 
          src="/images/early-access-pass.png" 
          alt="Early Access Pass" 
          className="verification-image" 
        />
        
        <div className="verification-buttons">
          <button 
            className="connect-discord-btn" 
            onClick={handleConnectDiscord}
            disabled={discordUser}
          >
            {discordUser ? `CONNECTED: ${discordUser.username}` : 'CONNECT DISCORD'}
          </button>
          
          <button 
            className="connect-wallet-btn" 
            onClick={isConnected ? disconnect : handleConnectWallet}
          >
            {isConnected ? `CONNECTED: ${address.slice(0, 6)}...${address.slice(-4)}` : 'CONNECT WALLET'}
          </button>
          
          <button 
            className="verify-btn" 
            onClick={handleVerify}
            disabled={!isConnected || !discordUser || isLoading}
          >
            {isLoading ? 'VERIFYING...' : 'VERIFY'}
          </button>
        </div>
        
        {verificationStatus && (
          <div className={`verification-status ${verificationStatus.includes('verified!') ? 'success' : verificationStatus.includes('No NFT') ? 'error' : ''}`}>
            {verificationStatus}
          </div>
        )}
      </div>
    </div>
  );
};

export default NFTVerification;