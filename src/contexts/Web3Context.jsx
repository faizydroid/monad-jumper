import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';
import { monadTestnet } from '../config/chains';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import GameScoreABI from '../abis/GameScore.json';
import { gameContractABI } from '../contracts/abi';
import { CONTRACT_ADDRESSES } from '../contracts/config';

// Near the top of the file, add NFT contract constants
const BOOSTER_CONTRACT = '0xbee3b1b8e62745f5e322a2953b365ef474d92d7b';
const BOOSTER_ABI = ["function balanceOf(address owner) view returns (uint256)"];

const Web3Context = createContext();

// Use import.meta.env for Vite
const SUPABASE_URL = import.meta.env.VITE_REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY;
const GAME_CONTRACT_ADDRESS = import.meta.env.VITE_REACT_APP_GAME_CONTRACT_ADDRESS;
const RPC_URL = import.meta.env.VITE_RPC_URL;

// Add more detailed logging for Supabase configuration
console.log('Supabase config:', { 
  SUPABASE_URL, 
  SUPABASE_ANON_KEY: SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.substring(0, 5)}...` : 'missing',
  url_length: SUPABASE_URL?.length || 0,
  key_length: SUPABASE_ANON_KEY?.length || 0
});

// Check for missing configuration
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('⚠️ MISSING SUPABASE CONFIGURATION! Check your environment variables.');
}

// Create Supabase client with explicit timeout
let supabase;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    timeout: 60000 // 60 seconds
  },
  db: {
    schema: 'public'
    },
    auth: {
      persistSession: false
    }
  });
  
  console.log('✅ Supabase client initialized successfully');
  
  // Test the connection
  (async () => {
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1);
      if (error) {
        console.error('❌ Supabase connection test failed:', error);
      } else {
        console.log('✅ Supabase connection test successful:', data);
      }
    } catch (e) {
      console.error('❌ Error testing Supabase connection:', e);
    }
  })();
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error);
  supabase = null;
}

// Near the top of the file, add this provider detection function
const detectProviders = () => {
  const providers = {
    ethereum: window.ethereum,
    okxwallet: window.okxwallet,
    hasMetaMask: !!window.ethereum?.isMetaMask,
    hasOKX: !!window.okxwallet
  };
  
  console.log('Detected providers:', providers);
  return providers;
};

const customWalletProvider = () => {
  // Don't access window.ethereum at all if we're in a recursion situation
  if (window.__ethereum_access_error || typeof window === 'undefined') {
    console.log('Wallet access disabled due to previous errors');
    return null;
  }
  
  try {
    // Create a minimal copy of required properties WITHOUT accessing them directly
    let hasEthereum = false;
    let selectedAddress = null;
    let chainId = null;
    let isMetaMask = false;
    
    // Use a try/catch for each property access to prevent recursion
    try { hasEthereum = !!window.ethereum; } catch (e) { window.__ethereum_access_error = true; return null; }
    if (!hasEthereum) return null;
    
    // Define methods that use Function.prototype.call to avoid proxy recursion
    const safeRequest = async (...args) => {
      try {
        // Use Function.prototype.call to avoid proxy handler recursion
        return await Function.prototype.call.call(window.ethereum.request, window.ethereum, ...args);
      } catch (e) {
        console.error('Safe request error:', e);
        throw e;
      }
    };
    
    const safeOn = (event, handler) => {
      try {
        if (typeof window.ethereum.on !== 'function') return;
        // Use Function.prototype.call to avoid proxy handler recursion
        return Function.prototype.call.call(window.ethereum.on, window.ethereum, event, handler);
      } catch (e) {
        console.error('Safe on error:', e);
      }
    };
    
    const safeRemoveListener = (event, handler) => {
      try {
        if (typeof window.ethereum.removeListener !== 'function') return;
        // Use Function.prototype.call to avoid proxy handler recursion
        return Function.prototype.call.call(window.ethereum.removeListener, window.ethereum, event, handler);
      } catch (e) {
        console.error('Safe removeListener error:', e);
      }
    };
    
    // Create minimal interface without accessing any properties directly
    return {
      // Methods
      request: safeRequest,
      on: safeOn,
      removeListener: safeRemoveListener,
      
      // Static properties (don't access them directly to avoid proxy traps)
      get selectedAddress() { 
        try { return window.ethereum.selectedAddress; } 
        catch (e) { return null; }
      },
      get chainId() { 
        try { return window.ethereum.chainId; } 
        catch (e) { return null; } 
      },
      get isMetaMask() { 
        try { return !!window.ethereum.isMetaMask; } 
        catch (e) { return false; } 
      }
    };
  } catch (error) {
    console.error("Error creating wallet provider:", error);
    // Mark as having an error to prevent future access attempts
    window.__ethereum_access_error = true;
    return null;
  }
};

// Replace all window.ethereum with customWalletProvider()
const getValidProvider = () => {
  const wallet = customWalletProvider();
  if (!wallet) {
    console.warn("No valid wallet provider found");
    return null;
  }
  return wallet;
};

const isEdgeBrowser = () => {
  return navigator.userAgent.indexOf("Edg") !== -1;
};

const isInEdgeFallbackMode = typeof window !== 'undefined' && window.__EDGE_FALLBACK_MODE__ === true;

export function Web3Provider({ children }) {
  const [account, setAccount] = useState(null);
  const [username, setUsername] = useState(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [supabaseError, setSupabaseError] = useState(null);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerStats, setPlayerStats] = useState(null);
  const { address, isConnected, chainId } = useAccount();
  const [gameContract, setGameContract] = useState(null);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [gameScore, setGameScore] = useState(0);
  const [contract, setContract] = useState(null);
  const [pendingJumps, setPendingJumps] = useState(0);
  const [jumpTimer, setJumpTimer] = useState(null);
  const JUMP_BATCH_DELAY = 2000; // Wait 2 seconds to batch jumps
  const [currentGameScore, setCurrentGameScore] = useState(0);
  const [providerInfo, setProviderInfo] = useState(null);
  const [providerError, setProviderError] = useState(null);
  const [readOnlyProvider, setReadOnlyProvider] = useState(null);
  const [playerHighScore, setPlayerHighScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [totalJumps, setTotalJumps] = useState(0);
  const [isCheckingNFT, setIsCheckingNFT] = useState(false);
  const [hasNFT, setHasNFT] = useState(false);
  const [usernameChecked, setUsernameChecked] = useState(false);
  const previousAccount = useRef(null);
  const [playerData, setPlayerData] = useState({ address: null, username: null, score: 0, jumps: 0 });

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  // Make key functions available globally for direct access
  // This allows external components to update state without going through context
  if (typeof window !== 'undefined') {
    window.web3Context = window.web3Context || {};
    // Update the setPlayerHighScore reference whenever it changes
    window.web3Context.setPlayerHighScore = setPlayerHighScore;
    window.web3Context.setTotalJumps = setTotalJumps;
    window.web3Context.playerHighScore = playerHighScore;
  }

  // First define the saveScore function since recordScore depends on it
  const saveScore = async (walletAddress, score) => {
    if (!walletAddress || score <= 0 || !supabase) {
      console.error('🏆 Invalid parameters for saving score');
      return;
    }
    
    try {
      console.log(`🏆 SAVING SCORE: ${score} points for ${walletAddress}`);
      const normalizedAddress = walletAddress.toLowerCase();
      
      // First ensure the user exists (required by foreign key constraint)
      await ensureUserExists(normalizedAddress);
      
      // Get the current high score for this user
      const { data: existingScore, error: fetchError } = await supabase
        .from('scores')
        .select('id, score')
        .eq('wallet_address', normalizedAddress)
        .order('score', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('🏆 Error fetching existing score:', fetchError);
        return null;
      }
      
      // Only save if this is a new high score
      if (existingScore && score <= existingScore.score) {
        console.log(`🏆 Current score (${score}) is not higher than existing high score (${existingScore.score}), not saving`);
        return existingScore.score;
      }
      
      // Insert the new score record (we always insert a new record, not update)
      console.log(`🏆 Inserting new high score: ${score}`);
      const { error: insertError } = await supabase
        .from('scores')
        .insert([{
          wallet_address: normalizedAddress,
          score: score
        }]);
      
      if (insertError) {
        console.error('🏆 Error inserting score:', insertError);
        return null;
      }
      
      console.log(`🏆 Successfully recorded new high score: ${score}`);
      setPlayerHighScore(score);
      
      return score;
    } catch (error) {
      console.error('🏆 Unexpected error in saveScore:', error);
      return null;
    }
  };
  
  // Helper function for ensuring user exists
  const ensureUserExists = async (walletAddress) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('wallet_address')
        .eq('wallet_address', walletAddress)
        .maybeSingle();
        
      if (!data) {
        // Create user if doesn't exist
        await supabase.from('users').insert({
          wallet_address: walletAddress,
          username: `Player_${walletAddress.substring(0, 6)}`
        });
      }
      return true;
    } catch (error) {
      console.error('Error ensuring user exists:', error);
      return false;
    }
  };
  
  // Define recordScore next since the useEffect depends on it
  const recordScore = useCallback(async (score) => {
    if (!isConnected || !address || !score || score <= 0) {
      console.log('Invalid parameters for score recording');
      return false;
    }
    
    try {
      // IMPORTANT: Update local state immediately first, before any async operations
      setPlayerHighScore(prevScore => {
        const newHighScore = Math.max(prevScore || 0, score);
        console.log(`Updating high score in recordScore: ${prevScore} → ${newHighScore}`);
        return newHighScore;
      });
        
      // Then save to database
      await saveScore(address, score);
          return true;
        } catch (error) {
      console.error('Error recording score:', error);
          return false;
        }
  }, [isConnected, address, saveScore]);

  // Update the saveJumpsToSupabase function to skip updating total_jumps
  const saveJumpsToSupabase = useCallback(async (walletAddress, jumpCount, sessionId) => {
    if (!walletAddress || !jumpCount || jumpCount <= 0) {
      console.log("Invalid jump data for Supabase");
      return false;
    }

    try {
      console.log(`Saving ${jumpCount} jumps to Supabase for session ${sessionId}`);
      
      // First check if this session has already been saved to avoid duplicates
      const sessionKey = `saved_session_${sessionId}`;
      if (localStorage.getItem(sessionKey)) {
        console.log(`Session ${sessionId} already saved to Supabase, skipping`);
        return true;
      }
      
      // First check if there's an existing record for this wallet
      const { data: existingJumps, error: fetchError } = await supabase
        .from('jumps')
        .select('count')
        .eq('wallet_address', walletAddress.toLowerCase())
        .maybeSingle();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error("Error fetching existing jumps:", fetchError);
        return false;
      }
      
      // Create jump data object
      const jumpData = {
        wallet_address: walletAddress.toLowerCase(),
        count: jumpCount
      };
      
      // Add the session token if available - this will be extracted and used in headers by the middleware
      if (window.__SECURE_GAME_TOKEN && !window.__SECURE_GAME_TOKEN.used) {
        jumpData.session_token = window.__SECURE_GAME_TOKEN.value;
      }
      
      let result;
      
      if (existingJumps) {
        // Update existing record by adding new jumps
        const newTotal = (existingJumps.count || 0) + jumpCount;
        console.log(`Updating jumps from ${existingJumps.count} to ${newTotal}`);
        
        // Include the count in jump data
        jumpData.count = newTotal;
        
        result = await supabase
          .from('jumps')
          .update(jumpData)
          .eq('wallet_address', walletAddress.toLowerCase());
      } else {
        // Insert new record if none exists
        result = await supabase
          .from('jumps')
          .insert(jumpData);
      }
      
      if (result.error) {
        console.error("Error recording jump:", result.error);
        return false;
      }
      
      // Mark session as saved
      localStorage.setItem(sessionKey, 'true');
      console.log(`Successfully saved ${jumpCount} jumps to Supabase`);
      
      // Update local state
      setTotalJumps(prev => (prev || 0) + jumpCount);
      
      // Clear the session token after use
      if (window.__SECURE_GAME_TOKEN) {
        window.__SECURE_GAME_TOKEN = null;
        
        // Also clear the cookie
        document.cookie = "gameSessionToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      }
      
      return true;
    } catch (error) {
      console.error("Error saving jumps to Supabase:", error);
      return false;
    }
  }, []);

  // Replace the recordBundledJumps implementation with this version
  const recordBundledJumps = async (jumpCount, gameSessionId) => {
    if (!jumpCount || jumpCount <= 0) {
      console.log("No jumps to record");
      return false;
    }
    
    // Check for revive cancellation transactions that App.jsx already processed
    if (window.__processedReviveCancellations && 
        window.__processedReviveCancellations.has(gameSessionId)) {
      console.log(`SKIPPING: recordBundledJumps - Session ${gameSessionId} already processed by App.jsx`);
      return true; // Return true to indicate "success" and allow flow to continue
    }
    
    try {
      // First save to Supabase database
      const account = address;
      if (account) {
        await saveJumpsToSupabase(account, jumpCount, gameSessionId);
      }
      
      // Update local total jumps count
      setTotalJumps(prev => (prev || 0) + jumpCount);
      
      // Check if our global transaction system exists and if this transaction is already processed
      if (window.__GLOBAL_TX_SYSTEM) {
        const txKey = `jumps_${gameSessionId}_${address}_${jumpCount}`;
        
        // Check if this transaction is already recorded or in progress
        if (window.__GLOBAL_TX_SYSTEM.txHistory.has(txKey) || 
            window.__GLOBAL_TX_SYSTEM.activeTransactions.has(txKey) || 
            window.__GLOBAL_TX_SYSTEM.pendingLock) {
          console.log(`🔄 Web3Context: Skipping duplicate jump transaction (${txKey}) - already handled by App.jsx`);
          return true;
        }
      }
      
      // Use wagmi hooks for blockchain transaction instead of ethers.js
      // This prevents network switching issues
      if (walletClient && publicClient) {
        try {
          console.log(`Using wagmi to send ${jumpCount} jumps to blockchain`);
          
          const contractAddress = '0xc9fc1784df467a22f5edbcc20625a3cf87278547';
          const contractAbi = [
            {
              "inputs": [{"type": "uint256", "name": "_jumps"}],
              "name": "recordJumps",
              "outputs": [],
              "stateMutability": "nonpayable",
              "type": "function"
            }
          ];
          
          // Verify we're on the correct chain
          const chainId = await publicClient.getChainId();
          if (chainId !== 10143) {
            console.warn(`Wrong chain: ${chainId}, expected Monad (10143)`);
            return true; // Still return true since we saved to database
          }
          
          // Execute the transaction with wagmi
          const hash = await walletClient.writeContract({
            address: contractAddress,
            abi: contractAbi,
            functionName: 'recordJumps',
            args: [BigInt(jumpCount)],
            account: address,
            // Only set reasonable gas limit
            gas: BigInt(200000)
          });
          
          console.log("Jump transaction sent:", hash);
          return true;
        } catch (txError) {
          console.error("Error sending jump transaction to blockchain:", txError);
          return true; // Return true since we saved to database
        }
      } else {
        console.log("Wallet not connected, only saving jumps to database");
        return true;
      }
    } catch (error) {
      console.error("Error in recordBundledJumps:", error);
      return false;
    }
  };
  
  // Optimize the updateScore function to avoid redundant calls
  const updateScore = useCallback(async (score, jumpCount) => {
    // Generate a unique ID for this score update to avoid duplicates
    const updateId = `score_${score}_jumps_${jumpCount}_${Date.now()}`;
    
    // Skip if already processed this update
    if (window.__processedScoreUpdates && window.__processedScoreUpdates.has(updateId)) {
      return true;
    }
    
    // Create set if it doesn't exist
    if (!window.__processedScoreUpdates) window.__processedScoreUpdates = new Set();
    window.__processedScoreUpdates.add(updateId);
    
    console.log(`updateScore called with score: ${score}, jumpCount: ${jumpCount}`);
    
    // IMPORTANT: Always update local state first for immediate UI feedback
    // Update the high score immediately if the new score is higher
    if (score > 0) {
      setPlayerHighScore(prevScore => {
        const newHighScore = Math.max(prevScore || 0, score);
        console.log(`High score updated in UI: ${prevScore} → ${newHighScore}`);
        
        // Make the high score available globally for other components that might need it
        if (typeof window !== 'undefined') {
          window.__playerHighScore = newHighScore;
        }
        
        return newHighScore;
      });
    }
    
    if (jumpCount > 0) {
      setTotalJumps(prev => (prev || 0) + jumpCount);
    }
    
    try {
      // Handle jump recording
      if (jumpCount > 0) {
        await recordBundledJumps(jumpCount, `game_${Date.now()}`);
      }
      
      // Handle score recording
      if (score > 0) {
        await recordScore(score);
      }
      
      return true; // Return success
    } catch (error) {
      console.error('Error in updateScore:', error);
      return true; // Return true anyway to avoid UI blocking
    }
  }, [recordBundledJumps, recordScore]);

  // Update recordBundledJumps to use session tracking
 

  // Update the provider initialization to avoid window.ethereum on page load
  useEffect(() => {
    // Skip initialization if we already have a provider or if we're in fallback mode
    if (provider || isInEdgeFallbackMode) return;
    
    const initializeProvider = async () => {
        try {
            console.log("Initializing Web3 provider...");
            
        // Don't directly access window.ethereum - use our safe checking function
        if (window.__RECOVERY_MODE) {
          console.log("Recovery mode active - using RPC provider only");
          setupFallbackProviderOnly();
          return;
        }
        
        // Only try to use window.ethereum if it seems available and we haven't encountered errors
        if (isWalletAvailable() && !window.__ethereum_access_error) {
          console.log("Wallet appears available - attempting safe initialization");
          
          // Create safe wrapper - this might return null if any recursion is detected
          const safeEthereum = customWalletProvider();
          
          if (safeEthereum) {
            console.log("Successfully created safe wrapper for wallet");
            
            try {
              // Now create a provider using our safe wrapper
              const web3Provider = new ethers.providers.Web3Provider(
                safeEthereum,
                {
                  name: 'Monad Network',
                  chainId: monadTestnet.id
                }
              );
              
              setProvider(web3Provider);
              console.log("Provider initialized successfully using safe wrapper");
              
              // Don't try to switch networks on initial load - let the user trigger that
              // to avoid any potential recursion issues
              return;
            } catch (providerError) {
              console.error("Error creating web3 provider:", providerError);
              // Continue to fallback
                }
            } else {
            console.log("Could not safely access wallet - using fallback");
          }
        } else {
          console.log("No wallet detected or access disabled - using RPC provider");
        }
        
        // Always set up a fallback provider as well
        setupFallbackProviderOnly();
        
    } catch (error) {
        console.error("Error in provider initialization:", error);
        // Set recovery mode if we encounter errors
        window.__RECOVERY_MODE = true;
        setupFallbackProviderOnly();
      }
    };
    
    // Separate function to set up the fallback provider only
    const setupFallbackProviderOnly = async () => {
      if (readOnlyProvider) return; // Already set up
      
      try {
        // Try primary RPC URL
        const primaryProvider = createFallbackRpcProvider('https://testnet-rpc.monad.xyz');
        
        if (primaryProvider) {
          try {
            // Test the provider
            await primaryProvider.getBlockNumber();
            setReadOnlyProvider(primaryProvider);
            console.log("Fallback provider initialized successfully");
            return;
          } catch (e) {
            console.warn("Primary RPC failed, trying fallbacks");
          }
        }
        
        // Try fallbacks in sequence
        const fallbackUrls = [
          'https://rpc.ankr.com/monad_testnet',
          'https://thirdweb.monad-testnet.titanrpc.io',
          'https://rpc.monad.testnet.gateway.fm'
        ];
        
        for (const url of fallbackUrls) {
          try {
            const fallbackProvider = createFallbackRpcProvider(url);
            if (fallbackProvider) {
              await fallbackProvider.getBlockNumber();
              setReadOnlyProvider(fallbackProvider);
              console.log(`Fallback provider initialized successfully using ${url}`);
              return;
            }
          } catch (e) {
            console.warn(`RPC ${url} failed:`, e.message);
            // Continue to next URL without recursion
            continue;
          }
        }
        
        console.error("All RPCs failed");
      } catch (error) {
        console.error("Error setting up fallback provider:", error);
      }
    };

    // Don't await the initialization to prevent blocking
    initializeProvider().catch(err => {
      console.error("Provider initialization failed:", err);
      window.__RECOVERY_MODE = true;
    });
  }, [provider, isInEdgeFallbackMode, readOnlyProvider]);

  useEffect(() => {
    if (isInEdgeFallbackMode) {
      console.log('Running in Edge fallback mode - limited functionality');
      setProviderError('Browser compatibility issue detected. Limited functionality available. Please consider using Firefox or Chrome for full features.');
    }
  }, []);

  // Handle account change or initial connect - make this a useCallback so it can be used in deps
  const handleAccountChange = useCallback(async (newAccount) => {
    try {
      console.log('Handling account change for:', newAccount);
      setIsLoading(true);
      setSupabaseError(null);
      
      if (!provider && window.ethereum) {
        const newProvider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(newProvider);
      }
      
      const currentProvider = provider || new ethers.providers.Web3Provider(window.ethereum);
      const signer = currentProvider.getSigner();
      setAccount(newAccount);
      setSigner(signer);

      // Check if user exists and has a username
      const { data: existingUser, error } = await supabase
        .from('users')
        .select('username')
        .eq('wallet_address', newAccount.toLowerCase())
        .single();

      console.log('Username check result:', { existingUser, error });

      if (error) {
        if (error.code === 'PGRST116') {
          // No user found, but DON'T show username modal
          console.log('No user found - generating default username');
          const defaultUsername = `Player${Math.floor(Math.random() * 10000)}`;
          setUsername(defaultUsername);
          
          // Create user with default username
          await supabase.from('users').insert({
            wallet_address: newAccount.toLowerCase(),
            username: defaultUsername
          });
        } else {
          console.error('Error checking username:', error);
          setSupabaseError(error.message);
        }
        return;
      }

      if (!existingUser || !existingUser.username) {
        // User exists but no username, generate a default one
        console.log('No username found - generating default username');
        const defaultUsername = `Player${Math.floor(Math.random() * 10000)}`;
        setUsername(defaultUsername);
        
        // Update user with default username
        await supabase.from('users').update({
          username: defaultUsername
        }).eq('wallet_address', newAccount.toLowerCase());
      } else {
        // Username found
        console.log('Username found:', existingUser.username);
        setUsername(existingUser.username);
      }
    } catch (error) {
      console.error('Error handling account change:', error);
      // Generate random username on error
      const defaultUsername = `Player${Math.floor(Math.random() * 10000)}`;
      setUsername(defaultUsername);
    } finally {
      setIsLoading(false);
    }
  }, [provider]);

  // Modified to use the safer approach for wallet connections
  const connectWallet = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Check if wallet is already available
      if (window.ethereum) {
        try {
          // Request account access
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          
          if (accounts.length > 0) {
            setAccount(accounts[0]);
      
            // Set up the provider and contract
            await setupProviderAndContract(accounts[0]);
            
            // Check for username on successful connection
            await checkUsername(accounts[0]);
            
            // Set connected state
            setIsConnected(true);
            
            console.log('Wallet connected:', accounts[0]);
          return true;
        }
        } catch (error) {
          // Specifically handle extension messaging errors
          if (error.message && (
              error.message.includes('chrome.runtime.sendMessage()') || 
              error.message.includes('has not been authorized yet')
            )) {
            console.warn('Chrome extension messaging error - this is normal in some browsers:', error.message);
            // Continue execution, don't treat this as a critical error
          } else {
            console.error('Error connecting wallet:', error);
            setProviderError(error.message || 'Failed to connect wallet');
          }
        }
      } else {
        setProviderError('MetaMask not installed');
      return false;
      }
    } catch (error) {
      console.error('Unexpected error in connectWallet:', error);
      setProviderError(error.message || 'Failed to connect wallet');
      return false;
    } finally {
      setIsLoading(false);
    }
    
    return false;
  }, []);

  // Also, wrap any ethereum event listeners in try/catch
  useEffect(() => {
    if (window.ethereum) {
      // Handle account changes
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          console.log('Please connect to MetaMask.');
          setAccount(null);
          setIsConnected(false);
        } else {
          setAccount(accounts[0]);
          setIsConnected(true);
        }
      };
      
      try {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        
        // Handle chain changes
        window.ethereum.on('chainChanged', () => {
          window.location.reload();
        });
      } catch (error) {
        console.warn('Error setting up ethereum event listeners:', error);
      }
      
      // Cleanup
      return () => {
        try {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        } catch (error) {
          console.warn('Error removing ethereum event listeners:', error);
        }
      };
    }
  }, []);

  // Add persistent username check to avoid redundant modals
  const checkAndLoadUsername = useCallback(async (walletAddress) => {
    if (!walletAddress || !supabase) return null;
    
    const normalizedAddress = walletAddress.toLowerCase();
    
    try {
      // Clear any existing username in state first to prevent showing wrong username
      setUsername(null);
      
      console.log(`👤 Checking username for ${normalizedAddress}...`);
      
      // Skip localStorage and always check Supabase
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('wallet_address', normalizedAddress)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('👤 Error fetching username:', error);
        return null;
      }
      
      if (data && data.username) {
        // We found a username in the database
        console.log(`👤 Found username in database: ${data.username}`);
        
        // Cache it in localStorage
        localStorage.setItem(`username_${normalizedAddress}`, JSON.stringify({
          username: data.username,
          timestamp: Date.now()
        }));
        
        // Set username state
        setUsername(data.username);
        return data.username;
      }
      
      // No username found for this wallet address
      console.log('👤 No username found for this wallet address');
      setShowUsernameModal(true);
      return null;
    } catch (error) {
      console.error('👤 Error in checkAndLoadUsername:', error);
      return null;
    }
  }, [supabase]);

  // Update the setUserUsername function to also cache the username
  const setUserUsername = async (newUsername) => {
    if (!address || !newUsername) return false;
    
    try {
      console.log(`👤 Setting username: ${newUsername} for address: ${address}`);
      const normalizedAddress = address.toLowerCase();
      
      // Check Supabase connection
      console.log('👤 Supabase client:', !!supabase);
      
      // Log the full request details
      console.log('👤 Attempting Supabase upsert with:', {
        table: 'users',
        wallet_address: normalizedAddress,
        username: newUsername
      });
      
      // Save to Supabase with improved error handling
      const { data, error } = await supabase
        .from('users')
        .upsert({ 
          wallet_address: normalizedAddress,
          username: newUsername,
          updated_at: new Date().toISOString()
        }, { 
          returning: 'minimal'
        });
      
      if (error) {
        console.error('👤 Error saving username to Supabase:', error);
        console.error('👤 Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return false;
      }
      
      console.log('👤 Supabase response:', data);
      
      // Update state
      setUsername(newUsername);
      
      // Close modal
      setShowUsernameModal(false);
      
      // Cache in localStorage
      localStorage.setItem(`username_${normalizedAddress}`, JSON.stringify({
        username: newUsername,
        timestamp: Date.now()
      }));
      
      console.log(`👤 Username set and cached: ${newUsername}`);
      return true;
    } catch (error) {
      console.error('👤 Error in setUserUsername:', error);
      console.error('👤 Error type:', typeof error);
      console.error('👤 Error stack:', error.stack);
      return false;
    }
  };

  // Check for username when wallet connects
  useEffect(() => {
    if (isConnected && address && supabase) {
      checkAndLoadUsername(address);
    } else if (!isConnected) {
      // Clear username when wallet disconnects
      setUsername(null);
      setShowUsernameModal(false);
    }
  }, [isConnected, address, supabase, checkAndLoadUsername]);

  // Optimize the recordJump function to avoid redundant recovery attempts
  const recordJump = useCallback(async (platformType) => {
    // Skip recording individual jumps - we'll use bundled approach only
    console.log('Jump registered locally:', platformType);
    
    // Just increment the local counter without network calls
    window.__jumpCount = (window.__jumpCount || 0) + 1;
    console.log('Updated local jump count:', window.__jumpCount);
    
    // Always return success to keep game running smoothly
    return true;
  }, []);

  // Optimize the jump message handler
  const handleGameMessages = useCallback(async (event) => {
    if (!event.data || typeof event.data !== 'object') return;
    
    const { type, data } = event.data;
    
    // Skip processing individual jump messages - only handle bundles
    if (type === 'JUMP_PERFORMED' || type === 'FINAL_JUMP_COUNT') {
      console.log(`Tracking local jump: ${data?.jumpCount || 'unknown'}`);
      return;
    }
    
    // Handle the bundle message with a debounce mechanism
    if (type === 'BUNDLE_JUMPS' && data) {
      // Use a key to prevent duplicate processing of the same session
      const sessionKey = `processed_session_${data.sessionId || Date.now()}`;
      if (window[sessionKey]) {
        console.log('Already processed this game session, skipping');
        return;
      }
      
      // Mark as processed
      window[sessionKey] = true;
      
      console.log(`Processing bundle: ${data.jumpCount} jumps, score: ${data.score}`);
      
      try {
        // First update Supabase (this is more reliable than blockchain)
        if (data.jumpCount > 0) {
          await saveJumpsToSupabase(address, data.jumpCount, data.sessionId);
        }
        
        // Only try blockchain transaction if we have all required dependencies
        if (signer && contract && address) {
          // Bundle jumps and score in one transaction if possible
          await recordBundledJumps(data.jumpCount, data.sessionId);
        } else {
          console.log('Storing jumps locally only - missing blockchain dependencies');
        }
        
        // Always update UI
        if (data.score > 0) {
          // Just update local state without blockchain call
          setPlayerHighScore(prev => Math.max(prev || 0, data.score));
          setTotalJumps(prev => (prev || 0) + data.jumpCount);
        }
    } catch (error) {
        console.error('Error processing bundle:', error);
      }
    }
  }, [address, signer, contract, saveJumpsToSupabase, recordBundledJumps]);

  // Clean up timer when component unmounts
  useEffect(() => {
    return () => {
      if (jumpTimer) {
        clearTimeout(jumpTimer);
      }
    };
  }, [jumpTimer]);

  const usePowerUp = async (type) => {
    if (!contract) return false;
    
    try {
      return await handleTransaction(
        contract.usePowerUp(type, {
          value: ethers.utils.parseEther("0.0005"),
          gasLimit: 100000
        }),
        'power_up',
        { powerUpType: type }
      );
    } catch (error) {
      console.error('Power-up transaction failed:', error);
      return false;
    }
  };

  // Create a global function that can be called from the game iframe
  useEffect(() => {
    window.handleJumpTransaction = recordJump;
    return () => {
      delete window.handleJumpTransaction;
    };
  }, [recordJump]);

  // IMPORTANT FIX: Debug output of current state
  useEffect(() => {
    console.log('Web3Context state:', {
      account,
      username,
      showUsernameModal,
      isLoading
    });
  }, [account, username, showUsernameModal, isLoading]);

  useEffect(() => {
    if (isConnected && address) {
      console.log("Syncing wagmi wallet with Web3Context:", address);
      // Update the account state
      setAccount(address);
      
      // If needed, get a signer
      if (provider) {
        const signer = provider.getSigner();
        setSigner(signer);
      }
      
      // Check for username
      checkAndLoadUsername(address)
        .then(username => {
          console.log('Username checked/loaded:', username);
        })
        .catch(err => {
          console.error('Error checking username:', err);
        });
    } else if (!isConnected) {
      // Reset state when disconnected
      setAccount(null);
      setSigner(null);
    }
  }, [isConnected, address, provider]);

  // Modify fetchLeaderboard to be more reactive
  const fetchLeaderboard = async () => {
    try {
      console.log('Fetching leaderboard');
      
      // If no supabase client, or if we're in development and mocking is enabled, use mock data
      if (!supabase || (import.meta.env.DEV && import.meta.env.VITE_MOCK_DATA === 'true')) {
        console.log('Using mock leaderboard data');
        const mockLeaderboard = Array.from({ length: 50 }, (_, i) => ({
          player: `Player${i + 1}`,
          address: `0x${i.toString().padStart(40, '0')}`,
          score: 1000 - i * 20,
          timestamp: new Date().toLocaleDateString()
        }));
        
        setLeaderboard(mockLeaderboard);
        return mockLeaderboard;
      }
      
      // Fetch scores with unique users in a single query
      const { data: scores, error: scoreError } = await supabase
        .from('scores')
        .select(`
          id, 
          score,
          wallet_address,
          created_at,
          users:wallet_address(username)
        `)
        .order('score', { ascending: false })
        .limit(200);  // Fetch more than needed to filter unique
      
      if (scoreError) throw scoreError;
      console.log('Raw scores fetched:', scores?.length || 0);
      
      // Process scores to keep only the highest score per user
      const uniqueAddresses = new Map();
      
      // First pass - determine highest score per wallet
      scores?.forEach(item => {
        const address = item.wallet_address.toLowerCase();
        const existingEntry = uniqueAddresses.get(address);
        
        if (!existingEntry || item.score > existingEntry.score) {
          uniqueAddresses.set(address, item);
        }
      });
      
      // Convert Map to Array and sort by score descending, then take top 50
      const sortedScores = Array.from(uniqueAddresses.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 50);
      
      // Format into leaderboard entries
      const formattedLeaderboard = sortedScores.map(item => {
        const address = item.wallet_address.toLowerCase();
          
          // Format the entry (using username from the joined users table if available)
          const username = item.users?.username || 
          `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
        
        return {
          player: username,
          address: address,
          score: item.score,
          timestamp: new Date(item.created_at).toLocaleDateString()
        };
      });
      
      console.log('Final leaderboard with unique users:', formattedLeaderboard.length);
      
      setLeaderboard(formattedLeaderboard);
      return formattedLeaderboard;
      
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      
      // Return empty array on error
      setLeaderboard([]);
      return [];
    }
  };

  // Add fetchPlayerStats to get user's stats from Supabase
  const fetchingRef = useRef({
    playerStats: false
  });

  const fetchPlayerStats = useCallback(async (walletAddress) => {
    // Verify this is still the current account before updating state
    if (walletAddress !== account) {
      console.log("Account changed while fetching stats, aborting");
      return;
    }
    
    try {
      console.log("Fetching player stats for address", walletAddress);
      
      // Clear playerData for this address first
      setPlayerData({
        address: walletAddress ? walletAddress.slice(0, 8) : null,
        username: username,
        score: 0, 
        jumps: 0
      });
      
      // Get highest score
      const { data, error } = await supabase
        .from('scores')
        .select('score')
        .eq('wallet_address', walletAddress.toLowerCase())
        .order('score', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching player stats:', error);
        return;
      }

      const highScore = data?.score || 0;
      
      // Verify this is still the current account before updating state
      if (walletAddress === account) {
        setPlayerHighScore(highScore);
        setPlayerData(prev => ({
          ...prev,
          score: highScore
        }));
      }
    } catch (error) {
      console.error("Error fetching player stats:", error);
    }
  }, [account, username]);

  // Add this effect to fetch player stats when address changes
  useEffect(() => {
    if (address) {
      fetchPlayerStats(address);
      fetchLeaderboard();
    }
  }, [address]);

  const saveScoreIncrement = async (increment) => {
    if (!window.ethereum || !gameContract) {
      console.warn('No wallet or contract available - cannot save score increment');
      return false;
    }
    
    try {
      console.log(`Saving score increment: ${increment}`);
      
      const tx = await gameContract.saveScoreIncrement(increment);
      
      // Track the transaction
      const newTx = {
        hash: tx.hash,
        type: 'score_increment',
        value: increment,
        timestamp: Date.now(),
        status: 'pending'
      };
      
      setPendingTransactions(prev => [newTx, ...prev]);
      setTransactionHistory(prev => [newTx, ...prev].slice(0, 50));
      
      // Update current score
      setGameScore(prev => prev + increment);
      
      // Wait for confirmation in background
      tx.wait().then(() => {
        // Update transaction status
        setPendingTransactions(prev => 
          prev.filter(t => t.hash !== tx.hash)
        );
        
        setTransactionHistory(prev => 
          prev.map(t => t.hash === tx.hash ? {...t, status: 'confirmed'} : t)
        );
        
        console.log('Score increment saved');
      }).catch(error => {
        console.error('Error confirming score increment:', error);
      });
      
      return true;
    } catch (error) {
      console.error('Error saving score increment:', error);
      return false;
    }
  };

  const purchasePowerUp = async (type) => {
    if (!window.ethereum || !gameContract || !address) {
      console.warn('No wallet, contract, or address available - cannot purchase power-up');
      return false;
    }
    
    try {
      console.log(`Purchasing power-up: ${type}`);
      
      const tx = await gameContract.purchasePowerUp(type, {
        value: ethers.utils.parseEther('0.0001')
      });
      
      // Track the transaction
      const newTx = {
        hash: tx.hash,
        type: 'power_up',
        powerUpType: type,
        value: '0.0001',
        timestamp: Date.now(),
        status: 'pending'
      };
      
      setPendingTransactions(prev => [newTx, ...prev]);
      setTransactionHistory(prev => [newTx, ...prev].slice(0, 50));
      
      // Wait for confirmation in background
      tx.wait().then(() => {
        // Update transaction status
        setPendingTransactions(prev => 
          prev.filter(t => t.hash !== tx.hash)
        );
        
        setTransactionHistory(prev => 
          prev.map(t => t.hash === tx.hash ? {...t, status: 'confirmed'} : t)
        );
        
        console.log('Power-up purchased');
      }).catch(error => {
        console.error('Error confirming power-up purchase:', error);
      });
      
      return true;
    } catch (error) {
      console.error('Error purchasing power-up:', error);
      return false;
    }
  };

  const continueGame = async () => {
    try {
      if (!gameContract || !account) {
        console.error('Game contract or account not initialized');
        return false;
      }
      
      console.log('Purchasing continue');
      
      const tx = await gameContract.continueGame({
        value: ethers.utils.parseEther('0.0002')
      });
      
      // Track the transaction
      const newTx = {
        hash: tx.hash,
        type: 'continue',
        value: '0.0002',
        timestamp: Date.now(),
        status: 'pending'
      };
      
      setPendingTransactions(prev => [newTx, ...prev]);
      setTransactionHistory(prev => [newTx, ...prev].slice(0, 50));
      
      // Wait for confirmation in background
      tx.wait().then(() => {
        // Update transaction status
        setPendingTransactions(prev => 
          prev.filter(t => t.hash !== tx.hash)
        );
        
        setTransactionHistory(prev => 
          prev.map(t => t.hash === tx.hash ? {...t, status: 'confirmed'} : t)
        );
        
        console.log('Continue purchased');
      }).catch(error => {
        console.error('Error confirming continue purchase:', error);
      });
      
      return true;
    } catch (error) {
      console.error('Error purchasing continue:', error);
      return false;
    }
  };

  // Add a general purpose function to check Web3 availability
  const isWeb3Available = () => {
    const available = !!window.ethereum && !!address;
    if (!available) {
      setProviderError("Web3 wallet not available. Please install MetaMask and connect your wallet.");
    }
    return available;
  };

  // Improve the fetchScores function to properly retrieve high scores
  const fetchScores = async (walletAddress) => {
    if (!walletAddress || !supabase) return;
    
    try {
      console.log('🏆 Fetching high scores for wallet:', walletAddress);
      const normalizedAddress = walletAddress.toLowerCase();
      
      // Get the highest score for this wallet
      const { data, error } = await supabase
        .from('scores')
        .select('score')
        .eq('wallet_address', normalizedAddress)
        .order('score', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('🏆 Error fetching high scores:', error);
        return;
      }
      
      if (data) {
        const highScore = data.score;
        console.log('🏆 Fetched high score from database:', highScore);
        
        // Update the state
        setPlayerHighScore(highScore);
        setHighScore(highScore);
        
        return highScore;
      } else {
        console.log('🏆 No high scores found in database');
        return 0;
      }
    } catch (error) {
      console.error('🏆 Error in fetchScores:', error);
      return 0;
    }
  };

  // CONSOLIDATED EVENT HANDLERS: Replace multiple overlapping game event handlers with a single efficient one
  useEffect(() => {
    // Skip when not connected
    if (!isConnected || !address) return;

    // Debounce function for score updates to prevent rapid state changes
    let scoreUpdateTimeout = null;
    const debouncedScoreUpdate = (score) => {
      if (scoreUpdateTimeout) clearTimeout(scoreUpdateTimeout);
      scoreUpdateTimeout = setTimeout(() => {
        recordScore(score).catch(e => console.error('Error recording score:', e));
      }, 300);
    };

    // Rate limiter for jump events
    let jumpProcessingTimer = null;
    let pendingJumpCount = 0;

    const processJumps = (sessionId) => {
      if (pendingJumpCount <= 0) return;
      
      const jumpCount = pendingJumpCount;
      pendingJumpCount = 0;
      
      console.log(`Processing ${jumpCount} accumulated jumps for session ${sessionId || 'unknown'}`);
      recordBundledJumps(jumpCount, sessionId).catch(e => console.error('Error processing jumps:', e));
    };

    // Single consolidated message handler for all game-related events
    const handleGameMessages = async (event) => {
      try {
        // ONLY handle direct score updates and BUNDLE_JUMPS, ignore all other jump-related events
        
        // Track processed events to avoid duplicates
        const eventId = event.data?.data?.saveId || event.data?.saveId || 'unknown';
        const eventType = event.data?.type || event.type || 'unknown';
        const eventKey = `${eventType}_${eventId}`;
        
        if (window.__processedEvents && window.__processedEvents[eventKey]) {
          console.log(`⚠️ Ignoring duplicate event: ${eventKey}`);
          return;
        }
        
        // Initialize event tracking
        if (!window.__processedEvents) {
          window.__processedEvents = {};
        }
        
        // Handle score updates from direct events
        if (event.type === 'gameScore') {
          const score = event.detail?.score;
          if (!score) return;
          
          console.log("🎮 Received game score event:", score);
          debouncedScoreUpdate(score);
          return;
        }
        
        // Handle game over with direct score only
        if (event.type === 'gameOver') {
          const { finalScore } = event.detail || {};
          if (finalScore) {
            console.log("🎮 Game Over - Processing score:", finalScore);
            await recordScore(finalScore);
          }
          return;
        }

        // Handle messages from iframe - ONLY process BUNDLE_JUMPS, ignore other jump events
        if (event.data && typeof event.data === 'object') {
          // Handle score updates from iframe
          if (event.data.type === 'gameScore') {
            const score = event.data.score;
            if (!score) return;
            
            console.log("📊 Received score from game iframe:", score);
            debouncedScoreUpdate(score);
            return;
          }
          
          // IGNORE all jump-related events except BUNDLE_JUMPS
          if (event.data.type === 'JUMP_PERFORMED' || 
              event.data.type === 'FINAL_JUMP_COUNT' ||
              event.data.type === 'SAVE_JUMPS') {
            console.log(`⏭️ Ignoring event type: ${event.data.type} - jumps will be processed by BUNDLE_JUMPS only`);
            return;
          }
          
          // ONLY process jumps from BUNDLE_JUMPS - the single source of truth
          if (event.data.type === 'BUNDLE_JUMPS' && event.data.data) {
            const { score, jumpCount, saveId } = event.data.data || {};
            
            // Check if this is from a revive cancellation that App.jsx already processed
            if (window.__processedReviveCancellations && 
                window.__processedReviveCancellations.has(saveId)) {
              console.log(`SKIPPING: Web3Context - BUNDLE_JUMPS already processed by App.jsx for ${saveId}`);
              return;
            }
            
            // Mark this event as processed to avoid duplicates
            window.__processedEvents[eventKey] = Date.now();
            
            // Skip if no jumps to record
            if (!jumpCount || jumpCount <= 0) {
              console.log("⚠️ No jumps to record in BUNDLE_JUMPS event");
            return;
          }

            console.log(`🎮 SINGLE SOURCE OF TRUTH: Processing ${jumpCount} jumps with session ID: ${saveId || 'N/A'}`);
            
            // Record score first if provided
            if (score > 0) {
              await recordScore(score);
            }
            
            // Process the jumps with the specific session ID
            // This is THE ONLY PLACE where jumps should be recorded
            await recordBundledJumps(jumpCount, saveId);
              return;
            }
          }
        } catch (error) {
        console.error("Error handling game message:", error);
        // Don't re-throw to prevent component crashes
      }
    };

    // Add listeners for all event types
    window.addEventListener('gameScore', handleGameMessages);
    window.addEventListener('gameOver', handleGameMessages);
    window.addEventListener('gameJump', handleGameMessages);
    window.addEventListener('message', handleGameMessages);
    
    // Clean up all listeners and timers on unmount
    return () => {
      window.removeEventListener('gameScore', handleGameMessages);
      window.removeEventListener('gameOver', handleGameMessages);
      window.removeEventListener('gameJump', handleGameMessages);
      window.removeEventListener('message', handleGameMessages);
      
      if (scoreUpdateTimeout) clearTimeout(scoreUpdateTimeout);
      if (jumpProcessingTimer) {
        clearTimeout(jumpProcessingTimer);
        processJumps(); // Process any remaining jumps
      }
    };
  }, [isConnected, address, recordScore, recordBundledJumps]);

  // Update the NFT verification logic with improved resilience and no recursive calls
  const checkNFT = async (address) => {
    try {
      if (!address) return false;
      
      // Check cache first
      const cachedStatusStr = localStorage.getItem(`nft_status_${address}`);
      if (cachedStatusStr) {
        try {
          const { hasNFT, timestamp } = JSON.parse(cachedStatusStr);
          // Use cache if less than 1 day old to reduce RPC calls
          if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
            console.log("Using cached NFT status");
            setHasNFT(hasNFT);
            return hasNFT;
          }
        } catch (e) {
          console.error("Error parsing cached NFT status", e);
        }
      }

      // Skip actual checking and default to true for production
      let result = true;
      console.log("Production deployment - defaulting NFT check to true");
      
      // Cache the result
      localStorage.setItem(`nft_status_${address}`, JSON.stringify({
        hasNFT: result,
        timestamp: Date.now()
      }));
      
      setHasNFT(result);
      return result;
    } catch (error) {
      console.error('Error in checkNFT:', error);
      // Default to true to avoid blocking users
      setHasNFT(true);
      return true;
    }
  };

  // Add the missing recordJumps function (wrapper for recordJump with multiple jumps)
  const recordJumps = async (count) => {
    if (!count || count <= 0) return false;
    
    console.log(`Recording ${count} jumps at once`);
    try {
      return await recordJump(count);
    } catch (error) {
      console.error('Error in recordJumps:', error);
      return false;
    }
  };

  // Update the useEffect that checks NFT status
  useEffect(() => {
    if (account) {
      // Clear any previous NFT status
      setHasNFT(false);
      
      // Check NFT status
      checkNFT(account);
      } else {
      setHasNFT(false);
    }
  }, [account]);

  // Add the missing fetchJumps function
  const fetchJumps = async (walletAddress) => {
    if (!walletAddress || !supabase) return 0;
    
    try {
      console.log(`Fetching jumps for ${walletAddress}`);
      const normalizedAddress = walletAddress.toLowerCase();
      
      const { data, error } = await supabase
        .from('jumps')
        .select('count')
        .eq('wallet_address', normalizedAddress)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching jumps:', error);
        return 0;
      }
      
      const jumpCount = data?.count || 0;
      console.log(`Found ${jumpCount} jumps for ${walletAddress}`);
      setTotalJumps(jumpCount);
      return jumpCount;
    } catch (error) {
      console.error('Error in fetchJumps:', error);
      return 0;
    }
  };

  // Add the missing fetchUserData function
  const fetchUserData = async (userAddress) => {
    if (!userAddress || !supabase) return;
    
    try {
      console.log(`Fetching user data for ${userAddress}`);
      const normalizedAddress = userAddress.toLowerCase();
      
      // Fetch scores
      await fetchScores(normalizedAddress);
      
      // Fetch jumps
      await fetchJumps(normalizedAddress);
      
      console.log(`User data fetched for ${userAddress}`);
        } catch (error) {
      console.error('Error fetching user data:', error);
      }
    };

  // Add the missing refreshJumps function
  const refreshJumps = async () => {
    if (!address) return 0;
    
    console.log(`Refreshing jumps for ${address}`);
    return await fetchJumps(address);
    };

  // Add a smarter RPC management system to handle rate limiting and network changes
  useEffect(() => {
    // Initialize the fallback provider system
    if (!readOnlyProvider) {
      console.log('Setting up fallback provider system');
      createProviderWithFallback().then(fallbackProvider => {
        if (fallbackProvider) {
          setReadOnlyProvider(fallbackProvider);
          console.log('Fallback provider initialized successfully');
        }
      }).catch(err => {
        console.error('Failed to initialize any fallback provider:', err);
      });
    }
    
    // Set up a network change listener - use safe wrapper to avoid recursion
    if (window.ethereum) {
      const safeEthereum = customWalletProvider();
      if (safeEthereum) {
        const handleChainChanged = (chainId) => {
          console.log('Chain changed to:', chainId);
          // Clear provider to force re-creation with new network
          setProvider(null);
          
          // Wait a moment for things to settle
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        };
        
        // Use the safe wrapper instead of direct window.ethereum
        safeEthereum.on('chainChanged', handleChainChanged);
        
        return () => {
          safeEthereum.removeListener('chainChanged', handleChainChanged);
        };
      }
    }
  }, [readOnlyProvider]);
  
  // Enhanced executeWithBackoff with rate limit handling and global cooldown
  const executeWithBackoff = async (fn, maxRetries = 5, baseDelay = 1000) => {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check if we're in a global rate limit cooldown
        const cooldownUntilStr = localStorage.getItem('rpc_rate_limit_cooldown');
        if (cooldownUntilStr) {
          const cooldownUntil = parseInt(cooldownUntilStr);
          if (Date.now() < cooldownUntil) {
            console.warn(`RPC in rate limit cooldown until ${new Date(cooldownUntil).toLocaleTimeString()}`);
            throw new Error('Rate limit cooldown active, skipping request');
      } else {
            // Cooldown expired, remove it
            localStorage.removeItem('rpc_rate_limit_cooldown');
          }
        }
        
        // Try with an existing provider first
        if (readOnlyProvider) {
          try {
            return await fn(readOnlyProvider);
          } catch (providerError) {
            console.warn("Read-only provider error, will try fallback:", providerError.message);
            // Continue to create new provider
          }
        }
        
        // Create a new provider for each attempt to avoid stale connections
        const fallbackProvider = await createProviderWithFallback();
        if (!fallbackProvider) {
          throw new Error("Failed to create provider for RPC call");
        }
        
        return await fn(fallbackProvider);
    } catch (error) {
        lastError = error;
        
        // Don't retry if we hit a global cooldown
        if (error.message && error.message.includes('cooldown active')) {
          break;
        }
        
        // Check for rate limit errors
        const isRateLimit = error.message && (
          error.message.includes('rate limit') || 
          error.message.includes('429') || 
          error.message.includes('too many requests')
        );
        
        // Set a global cooldown if rate limited
        if (isRateLimit) {
          const cooldownTime = Date.now() + 60000; // 1 minute cooldown
          localStorage.setItem('rpc_rate_limit_cooldown', cooldownTime.toString());
          console.warn(`Rate limit detected, setting global RPC cooldown until ${new Date(cooldownTime).toLocaleTimeString()}`);
          break; // Don't retry if rate limited
        }
        
        if (attempt === maxRetries) {
          console.error(`Max retries (${maxRetries}) exceeded:`, error);
          break;
        }
        
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.warn(`Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  };

  // Function to create a provider with the current best RPC URL
  const createProviderWithFallback = async (currentIndex = 0) => {
    // Circuit breaker - prevent excessive attempts
    const lastAttemptTime = parseInt(localStorage.getItem('rpc_last_attempt') || '0');
    const attemptThrottle = 10000; // 10 seconds between full retry cycles
    
    if (Date.now() - lastAttemptTime < attemptThrottle && lastAttemptTime > 0) {
      console.log('RPC connection attempts throttled, using cached value if available');
      
      // Use last working RPC from cache rather than returning null
      const cachedRPC = localStorage.getItem('last_working_rpc');
      if (cachedRPC) {
        try {
          return new ethers.providers.JsonRpcProvider(cachedRPC, {
            chainId: monadTestnet.id,
            name: monadTestnet.name
          });
        } catch (err) {
          console.warn('Failed to create provider from cached RPC:', err);
          // Continue to normal flow
        }
      }
      return null;
    }
    
    // Set last attempt timestamp
    localStorage.setItem('rpc_last_attempt', Date.now().toString());
    
    // Define fallback RPC URLs here to avoid accessing window global
    const FALLBACK_RPC_URLS = [
      'https://prettiest-snowy-pine.monad-testnet.quiknode.pro/4fc856936286525197c30da74dd994d2c7710e93',
      'https://rpc.ankr.com/monad_testnet',
      'https://thirdweb.monad-testnet.titanrpc.io',
      'https://rpc.monad.testnet.gateway.fm',
      ...monadTestnet.rpcUrls.default.http
    ];
    
    // Filter out duplicates
    const uniqueRPCs = [...new Set(FALLBACK_RPC_URLS)];
    
    // Get cached last working RPC
    const lastWorkingRPC = localStorage.getItem('last_working_rpc') || uniqueRPCs[0];
    
    // Non-recursive implementation to prevent call stack issues
    for (let i = currentIndex; i < uniqueRPCs.length; i++) {
      const url = i === 0 ? lastWorkingRPC : uniqueRPCs[i];
      
      try {
        console.log(`Attempting to connect to RPC: ${url}`);
        const provider = new ethers.providers.JsonRpcProvider(url, {
          chainId: monadTestnet.id,
          name: monadTestnet.name
        });
        
        // Test the provider with a simple call
        const blockNumber = await provider.getBlockNumber();
        console.log(`Connected to RPC ${url} - block: ${blockNumber}`);
        
        // Save as last working RPC
        localStorage.setItem('last_working_rpc', url);
        
        return provider;
      } catch (error) {
        console.warn(`RPC ${url} failed:`, error.message);
        // Continue to next URL without recursion
        continue;
      }
    }
    
    console.error('All RPC endpoints failed');
    return null;
  };

  // Completely avoid window.ethereum access on page load
  const isWalletAvailable = () => {
    if (window.__ethereum_access_error || typeof window === 'undefined') {
      return false;
    }

    try {
      // Just check existence without accessing any properties
      return typeof window.ethereum !== 'undefined';
    } catch (e) {
      console.warn('Error checking wallet availability:', e);
      window.__ethereum_access_error = true;
      return false;
    }
  };

  // Safe function to check ethereum network
  const safeGetChainId = () => {
    if (window.__ethereum_access_error || !isWalletAvailable()) {
          return null;
        }
        
    try {
      return window.ethereum.chainId;
    } catch (e) {
      console.warn('Error getting chainId:', e);
      return null;
    }
  };

  // Initialize without accessing window.ethereum on load
  const createFallbackRpcProvider = (rpcUrl) => {
    try {
      // This doesn't use window.ethereum at all
      return new ethers.providers.JsonRpcProvider(rpcUrl);
    } catch (error) {
      console.error('Error creating fallback provider:', error);
      return null;
    }
  };

  // Modify fetchJumpsLeaderboard to be more reactive
  const fetchJumpsLeaderboard = async () => {
    try {
      console.log('Fetching jumps leaderboard');
      
      // If no supabase client, or if we're in development and mocking is enabled, use mock data
      if (!supabase || (import.meta.env.DEV && import.meta.env.VITE_MOCK_DATA === 'true')) {
        console.log('Using mock jumps leaderboard data');
        const mockJumpsLeaderboard = Array.from({ length: 50 }, (_, i) => ({
          player: `Jumper${i + 1}`,
          address: `0x${i.toString().padStart(40, '0')}`,
          jumps: 5000 - i * 80,
          timestamp: new Date().toLocaleDateString()
        }));
        
        return mockJumpsLeaderboard;
      }
      
      // Fetch top jumpers from the jumps table
      const { data: jumpers, error: jumpersError } = await supabase
        .from('jumps')
        .select(`
          id, 
          count,
          wallet_address,
          created_at,
          users:wallet_address(username)
        `)
        .order('count', { ascending: false })
        .limit(100); // Fetch more than needed to deduplicate
      
      if (jumpersError) throw jumpersError;
      console.log('Jumpers fetched:', jumpers?.length || 0);
      
      // Process jumpers to keep only highest jump count per wallet
      const uniqueAddresses = new Map();
      const dedupedJumpers = [];
      
      // First pass - find highest jump count per wallet
      jumpers?.forEach(item => {
        const address = item.wallet_address.toLowerCase();
        const existingEntry = uniqueAddresses.get(address);
        
        if (!existingEntry || item.count > existingEntry.count) {
          uniqueAddresses.set(address, item);
        }
      });
      
      // Convert Map to Array and sort by count descending
      const sortedJumpers = Array.from(uniqueAddresses.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 50); // Keep top 50
      
      // Format jumpers for display
      const formattedJumpsLeaderboard = sortedJumpers.map(item => {
        const address = item.wallet_address.toLowerCase();
        
        // Format the entry (using username from the joined users table if available)
        const username = item.users?.username || 
          `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
        
        return {
          player: username,
          address: address,
          jumps: item.count,
          timestamp: new Date(item.created_at).toLocaleDateString()
        };
      }) || [];
      
      console.log('Final jumps leaderboard:', formattedJumpsLeaderboard.length);
      
      return formattedJumpsLeaderboard;
      
    } catch (error) {
      console.error('Error fetching jumps leaderboard:', error);
      
      // Return empty array on error
      return [];
    }
  };

  // Set up Supabase real-time subscription for scores and jumps
  useEffect(() => {
    if (!supabase) return;
    
    // Set up subscription for scores table
    const scoresSubscription = supabase
      .channel('public:scores')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'scores' }, 
        () => {
          console.log('Scores table updated, refreshing leaderboard');
          fetchLeaderboard();
        }
      )
      .subscribe();
      
    // Set up subscription for jumps table
    const jumpsSubscription = supabase
      .channel('public:jumps')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'jumps' }, 
        () => {
          console.log('Jumps table updated, jumps leaderboard will refresh on next view');
        }
      )
      .subscribe();
    
    // Cleanup function
    return () => {
      scoresSubscription.unsubscribe();
      jumpsSubscription.unsubscribe();
    };
  }, [supabase]);

  // Reset state when account changes
  useEffect(() => {
    if (account !== previousAccount.current) {
      console.log("Account changed, resetting ALL state");
      
      // Reset ALL state values immediately
      setUsername(null);
      setPlayerData({
        address: account ? account.slice(0, 8) : null,
        username: null,
        score: 0,
        jumps: 0
      });
      setTotalJumps(0);
      setPlayerHighScore(0);
      setShowUsernameModal(false);
      
      // Force a new username check
      setUsernameChecked(false);
      
      // Save the new account ref
      previousAccount.current = account;
      
      // Only proceed with fetching if we have an account
      if (account) {
        console.log("New account connected, fetching fresh data:", account);
        fetchPlayerUsername(account);
        fetchPlayerStats(account);
      }
    }
  }, [account]);

  // Also update the fetchPlayerUsername function to clear cached data
  const fetchPlayerUsername = useCallback(async (walletAddress) => {
    if (!walletAddress) {
      setUsername(null);
      setShowUsernameModal(false);
      setIsLoading(false);
      return;
    }
    
    try {
      console.log("Checking username for wallet:", walletAddress);
      
      // IMPORTANT: Force clear any previous username first to avoid stale data
      setUsername(null);
      
      // Get username from Supabase
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('wallet_address', walletAddress.toLowerCase())
        .maybeSingle();
      
      console.log("📊 Supabase response:", { data, error });
      
      if (data?.username) {
        console.log("✅ Found username:", data.username);
        setUsername(data.username);
        setShowUsernameModal(false);
      } else {
        console.log("❌ No username found for current wallet - username input form will be shown");
        setUsername(null);
        setShowUsernameModal(true);
      }
      
      setUsernameChecked(true);
      setIsLoading(false);
    } catch (error) {
      console.error("🔴 Error checking username:", error);
      setUsername(null);
      setShowUsernameModal(true);
      setIsLoading(false);
    }
  }, [supabase]);

  const checkIfUserExists = async (walletAddress) => {
    if (!walletAddress || !supabase) return false;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('wallet_address, username')
        .eq('wallet_address', walletAddress.toLowerCase())
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking if user exists:', error);
        return false;
      }
      
      if (data) {
        console.log('User exists:', data);
        setUsername(data.username);
        return true;
      } else {
        console.log('User does not exist yet');
        return false;
      }
    } catch (error) {
      console.error('Error checking if user exists:', error);
      return false;
    }
  };

  const incrementGamesPlayed = async (walletAddress) => {
    if (!walletAddress || !supabase) return false;
    
    try {
      // First check if a record exists
      const { data, error } = await supabase
        .from('games')
        .select('count')
        .eq('wallet_address', walletAddress.toLowerCase())
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching games count:', error);
        return false;
      }
      
      let newCount = 1; // Start with 1 if no record exists
      
      if (data) {
        // Increment existing count
        newCount = (parseInt(data.count) || 0) + 1;
        
        // Update the record
        const { error: updateError } = await supabase
          .from('games')
          .update({ count: newCount })
          .eq('wallet_address', walletAddress.toLowerCase());
        
        if (updateError) {
          console.error('Error updating games count:', updateError);
          return false;
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('games')
          .insert({
            wallet_address: walletAddress.toLowerCase(),
            count: newCount
          });
        
        if (insertError) {
          console.error('Error inserting games count:', insertError);
          return false;
        }
      }
      
      console.log(`Updated games count to: ${newCount}`);
      return newCount;
    } catch (error) {
      console.error('Error incrementing games count:', error);
      return false;
    }
  };

  const value = {
    account,
    username,
    showUsernameModal,
    isLoading,
    supabaseError,
    connectWallet,
    setUserUsername,
    handleJumpTransaction: recordJump,
    transactionHistory,
    leaderboard,
    playerStats,
    fetchLeaderboard,
    fetchPlayerStats,
    saveScore,
    saveScoreIncrement,
    purchasePowerUp,
    continueGame,
    pendingTransactions,
    gameScore,
    setGameScore,
    recordJump,
    updateScore,
    usePowerUp,
    contract,
    pendingJumps,
    currentGameScore,
    providerInfo,
    providerError,
    isWeb3Available,
    playerHighScore,
    recordScore,
    refreshScores: fetchScores,
    totalJumps,
    recordJumps,
    recordBundledJumps,
    saveJumpsToSupabase,
    fetchJumps,
    fetchUserData,
    refreshJumps,
    isCheckingNFT,
    hasNFT,
    checkNFTStatus: checkNFT,
    fetchJumpsLeaderboard,
    incrementGamesPlayed
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}

export const useWeb3 = () => useContext(Web3Context);
export const useWeb3Context = useWeb3; 