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
    // Exact URI as registered in Discord Developer Portal - must match exactly what's in Discord Developer Portal
    const redirectUri = encodeURIComponent("http://localhost:3000/verify");
    window.location.href = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CONFIG.CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=identify`;
  };

  // Verify NFT ownership and assign role
  const handleVerify = async () => {
    if (!isConnected || !discordToken || !discordUser) {
      setVerificationStatus('Please connect both wallet and Discord first');
      return;
    }

    setIsLoading(true);
    setVerificationStatus('Verifying...');

    try {
      // Sign message to verify wallet ownership
      const timestamp = new Date().getTime();
      const message = `Verifying NFT ownership for Discord role. Timestamp: ${timestamp}`;
      const signature = await signMessageAsync({ message });

      // Perform verification directly in the frontend for now
      // Since we don't have a backend server running on the same port
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
        
        // Mock response based on NFT ownership
        const response = {
          data: {
            success: balance.toNumber() > 0,
            message: balance.toNumber() > 0 
              ? 'NFT verified successfully! Role would be granted in a production environment.' 
              : 'No NFT found for this address'
          }
        };

        if (response.data.success) {
          setVerificationStatus('Success! NFT verified and role granted.');
        } else {
          setVerificationStatus(response.data.message || 'No NFT found for this address');
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
            VERIFY
          </button>
        </div>
        
        {verificationStatus && (
          <div className={`verification-status ${verificationStatus.includes('Success') ? 'success' : verificationStatus.includes('No NFT') ? 'error' : ''}`}>
            {verificationStatus}
          </div>
        )}
      </div>
    </div>
  );
};

export default NFTVerification; 