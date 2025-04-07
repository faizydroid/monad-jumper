import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';
import { monadTestnet } from '../config/chains';
import { useAccount } from 'wagmi';
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

const RPC_URL = 'https://prettiest-snowy-pine.monad-testnet.quiknode.pro/4fc856936286525197c30da74dd994d2c7710e93';

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

// Add safe wrapper function to prevent proxy recursion
const createSafeEthereumWrapper = () => {
  // If ethereum not available, return null
  if (!window.ethereum) return null;
  
  // Create a simple object with only the methods we need
  // This prevents proxy-related infinite recursion
  return {
    request: (...args) => window.ethereum.request(...args),
    on: (event, handler) => window.ethereum.on(event, handler),
    removeListener: (event, handler) => window.ethereum.removeListener(event, handler),
    selectedAddress: window.ethereum.selectedAddress,
    isMetaMask: window.ethereum.isMetaMask,
    chainId: window.ethereum.chainId
  };
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
    if (!isConnected || !address) {
      console.log('Cannot record score: not connected');
      return false;
    }
    
    console.log(`🎮 Recording score: ${score}`);
    
    if (score > 0) {
      // Always update the current game score
      setCurrentGameScore(score);
      
      // Check if this is a new high score
      if (score > playerHighScore) {
        console.log(`🎮 New high score: ${score} > ${playerHighScore}`);
        
        // Update local state
        setPlayerHighScore(score);
        setHighScore(score);
        
        // Save to localStorage
        localStorage.setItem(`highScore_${address.toLowerCase()}`, score);
        
        // Save to Supabase
        try {
          console.log(`🎮 Saving high score to Supabase: ${score}`);
          const savedScore = await saveScore(address, score);
          console.log(`🎮 High score saved to Supabase: ${savedScore}`);
          return true;
        } catch (error) {
          console.error('🎮 Error saving high score:', error);
          return false;
        }
      } else {
        console.log(`🎮 Score ${score} not higher than current high score ${playerHighScore}`);
        return true;
      }
    }
    
    return false;
  }, [address, isConnected, playerHighScore, saveScore]);

  // Add the function that is referenced in useEffect early on to prevent reference errors
  const recordBundledJumps = async (jumpCount) => {
    if (!jumpCount || jumpCount <= 0) {
      console.log('No jumps to record, skipping transaction');
      return true; // Don't process zero jumps
    }
    
    console.log(`Recording ${jumpCount} bundled jumps`);
    
    // First track locally in Supabase - this ensures we have a record even if the blockchain call fails
    try {
      if (account) {
        await saveJumpsToSupabase(account, jumpCount);
      }
    } catch (dbError) {
      console.error('Failed to record jumps in database:', dbError);
      // Continue to blockchain call anyway
    }
    
    // If we're in development mode with mocking enabled, just update the local state
    if (import.meta.env.DEV && import.meta.env.VITE_MOCK_TRANSACTIONS === 'true') {
      console.log("DEV MODE: Mocking bundled jumps transaction");
      setPendingJumps(prev => Math.max(0, prev - jumpCount));
      return true;
    }
    
    try {
      // Check for required dependencies
      if (!signer || !contract || !account) {
        console.log('Missing dependencies for blockchain transaction, storing jumps locally');
        setPendingJumps(prev => prev + jumpCount);
        return false;
      }
      
      // Update the local state even before making the RPC call
      const newPendingJumps = Math.max(0, pendingJumps - jumpCount);
      setPendingJumps(newPendingJumps);
      
      // Rate limit to avoid too many RPC calls - if we have a transaction in flight, wait
      if (window.__jumpTransactionInProgress) {
        console.log('Jump transaction already in progress, will try later');
        return true;
      }
      
      // Set transaction flag
      window.__jumpTransactionInProgress = true;
      
      try {
        console.log(`Submitting transaction to record ${jumpCount} jumps`);
        
        // Submit the transaction with explicit gasLimit
        const tx = await contract.recordJumps(jumpCount, {
          gasLimit: 300000 // Set a specific gas limit for Monad testnet
        });
        
        console.log("Transaction submitted:", tx.hash);
        return true;
      } catch (txError) {
        console.error("Transaction error:", txError);
        
        // Re-add to pending if transaction failed
        setPendingJumps(prev => prev + jumpCount);
        return false;
      } finally {
        // Clear transaction flag after a delay to prevent rapid retries
        setTimeout(() => {
          window.__jumpTransactionInProgress = false;
        }, 5000);
      }
    } catch (error) {
      console.error("Unexpected error in recordBundledJumps:", error);
      
      // Store jumps for later retry
      setPendingJumps(prev => prev + jumpCount);
      return false;
    }
  };
  
  // Add the saveJumpsToSupabase function early since recordBundledJumps depends on it
  const saveJumpsToSupabase = async (walletAddress, jumpCount) => {
    if (!walletAddress || jumpCount <= 0 || !supabase) {
      console.error('Invalid parameters for saving jumps to Supabase');
      return false;
    }
    
    try {
      console.log(`Saving ${jumpCount} jumps to Supabase for ${walletAddress}`);
      const normalizedAddress = walletAddress.toLowerCase();
      
      // First ensure user exists in database
      try {
        const { data: existingUser } = await supabase
          .from('users')
          .select('wallet_address')
          .eq('wallet_address', normalizedAddress)
          .maybeSingle();
          
        if (!existingUser) {
          // Create user if doesn't exist
          await supabase.from('users').insert({
            wallet_address: normalizedAddress,
            username: `Player_${normalizedAddress.substring(0, 6)}`
          });
        }
      } catch (userError) {
        console.error('Error checking/creating user:', userError);
      }
      
      // Check for existing jumps record
      const { data: existingJumps, error } = await supabase
        .from('jumps')
        .select('id, count')
        .eq('wallet_address', normalizedAddress)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching existing jumps:', error);
        return false;
      }
      
      if (existingJumps) {
        // Update existing record
        const newTotal = existingJumps.count + jumpCount;
        await supabase
          .from('jumps')
          .update({ count: newTotal })
          .eq('id', existingJumps.id);
          
        setTotalJumps(newTotal);
        return true;
      } else {
        // Create new record
        await supabase
          .from('jumps')
          .insert({
            wallet_address: normalizedAddress,
            count: jumpCount
          });
          
        setTotalJumps(jumpCount);
        return true;
      }
    } catch (error) {
      console.error('Error saving jumps to Supabase:', error);
      return false;
    }
  };

  // Update the provider initialization in Web3Context.jsx with better network detection
  useEffect(() => {
    // Skip initialization if we already have a provider or if we're in fallback mode
    if (provider || isInEdgeFallbackMode) return;
    
    const initializeProvider = async () => {
        try {
            console.log("Initializing Web3 provider...");
            
            // Check if window.ethereum exists
            if (typeof window.ethereum !== 'undefined') {
              // Create a safe wrapper for ethereum to prevent recursion issues
              const safeEthereum = createSafeEthereumWrapper();
              if (!safeEthereum) {
                console.error("Failed to create safe ethereum wrapper");
                return;
              }
              
              // Create a cached provider to avoid repeated initialization
              let initProvider;
              try {
                // Set network options with more robust configuration
                const networkOptions = {
                  name: 'Monad Network',
                  chainId: monadTestnet.id,
                  // Critical options to prevent network errors:
                  allowUnlimitedContractSize: true,
                  polling: false,
                  staticNetwork: true,
                  // Add more tolerance for network errors:
                  ignoreNetworkError: true,
                  cacheTimeout: 5 * 60 * 1000 // 5 minute cache to reduce RPC calls
                };
                
                // Create provider with more robust options and safe ethereum wrapper
                initProvider = new ethers.providers.Web3Provider(
                  safeEthereum, 
                  networkOptions
                );
                
                console.log("Provider initialized successfully");
                setProvider(initProvider);
                
                // Request the network switch first to ensure we're on the right chain
                try {
                  // This chain ID format needs to be in hex with 0x prefix
                  const chainIdHex = `0x${monadTestnet.id.toString(16)}`;
                  
                  console.log(`Requesting switch to chain: ${chainIdHex}`);
                  await safeEthereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: chainIdHex }],
                  });
                  
                  console.log("Successfully switched to Monad network");
                } catch (switchError) {
                  console.warn("Network switch request failed:", switchError.message);
                  
                  // If the chain isn't added, try to add it
                  if (switchError.code === 4902) {
                    try {
                      await safeEthereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [
                          {
                            chainId: `0x${monadTestnet.id.toString(16)}`,
                            chainName: monadTestnet.name,
                            nativeCurrency: monadTestnet.nativeCurrency,
                            rpcUrls: [monadTestnet.rpcUrls.default.http[0]],
                            blockExplorerUrls: [monadTestnet.blockExplorers?.default.url],
                          },
                        ],
                      });
                      console.log("Monad network added to wallet");
                    } catch (addError) {
                      console.error('Failed to add Monad network:', addError);
                    }
                  }
                }
                
                // Initialize signer only if we're connected
                if (isConnected && address) {
                  try {
                    const signer = initProvider.getSigner();
                        setSigner(signer);
                    console.log("Signer initialized successfully");
                    
                    // Initialize contract if we have an address - do this only once
                    const contractAddress = import.meta.env.VITE_REACT_APP_GAME_CONTRACT_ADDRESS || 
                                          '0xc9fc1784df467a22f5edbcc20625a3cf87278547'; // Fallback address
                                         
                    if (contractAddress && !contract) {
                      try {
                        const gameContract = new ethers.Contract(
                          contractAddress,
                          gameContractABI,
                          signer
                        );
                        setContract(gameContract);
                        console.log("Game contract initialized successfully:", contractAddress);
                      } catch (contractError) {
                        console.error("Error initializing contract:", contractError);
                      }
                    }
                  } catch (signerError) {
                    console.error("Error getting signer:", signerError);
                  }
                }
                
                // Instead of getNetwork(), which makes an RPC call, just set the network
                try {
                  // Override the getNetwork() method to always return our expected network
                  initProvider.network = {
                    chainId: monadTestnet.id,
                    name: monadTestnet.name,
                    ensAddress: null
                  };
                  
                  // Save configured network to help with troubleshooting
                  console.log("Using configured network:", JSON.stringify({
                    name: monadTestnet.name,
                    chainId: monadTestnet.id
                  }));
                } catch (networkError) {
                  console.warn("Could not set network info:", networkError);
                }
              } catch (providerError) {
                console.error("Error creating provider:", providerError);
                    }
                } else {
              console.log("No ethereum object found in window - using fallback provider");
              // Don't recreate the provider if we already have one
              if (!readOnlyProvider) {
                // Use our fallback RPC system instead of hardcoding an RPC endpoint
                if (window.__lastWorkingRPC) {
                  try {
                    const fallbackProvider = new ethers.providers.JsonRpcProvider(
                      window.__lastWorkingRPC,
                      {
                        chainId: monadTestnet.id,
                        name: monadTestnet.name
                      }
                    );
                    setReadOnlyProvider(fallbackProvider);
                    console.log("Fallback provider initialized with last working RPC");
                  } catch (fallbackError) {
                    console.error("Error creating fallback provider:", fallbackError);
                  }
                }
              }
                }
        } catch (error) {
            console.error("Error in provider initialization:", error);
          }
      };

    // Don't await the initialization to prevent blocking
    initializeProvider().catch(err => {
      console.error("Provider initialization failed:", err);
    });
  }, [provider, isConnected, address, isInEdgeFallbackMode, contract, readOnlyProvider]);

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

  // Modified to accept direct address from RainbowKit
  const connectWallet = useCallback(async (directAddress) => {
    try {
      if (!window.ethereum) {
        console.warn("No wallet detected.");
        setProviderError("No wallet detected. Please install MetaMask.");
        return false;
      }
      
      // Create safe wrapper for ethereum
      const safeEthereum = createSafeEthereumWrapper();
      if (!safeEthereum) {
        console.error("Failed to create safe ethereum wrapper");
        setProviderError("Error connecting to wallet. Please refresh and try again.");
        return false;
      }
      
      await safeEthereum.request({ method: "eth_requestAccounts" });
      console.log("Wallet connected!");
      
      if (directAddress) {
        // Direct connection when address is provided from RainbowKit
        console.log("Direct address provided:", directAddress);
        await handleAccountChange(directAddress);
        return true;
      }
      
      // Request chain switch/add if needed
      try {
        await safeEthereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${monadTestnet.id.toString(16)}` }],
        });
      } catch (switchError) {
        // This error code indicates the chain hasn't been added to MetaMask
        if (switchError.code === 4902) {
          try {
            await safeEthereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: `0x${monadTestnet.id.toString(16)}`,
                  chainName: monadTestnet.name,
                  nativeCurrency: monadTestnet.nativeCurrency,
                  rpcUrls: [monadTestnet.rpcUrls.default.http[0]],
                  blockExplorerUrls: [monadTestnet.blockExplorers?.default.url],
                },
              ],
            });
          } catch (addError) {
            console.error('Error adding chain:', addError);
            throw addError;
          }
        } else {
          console.error('Error switching chain:', switchError);
          throw switchError;
        }
      }

      // Request account access
      const accounts = await safeEthereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        await handleAccountChange(accounts[0]);
      }
      return true;
    } catch (error) {
      console.error("Error connecting wallet:", error);
      return false;
    }
  }, [handleAccountChange]);

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

  // Update the recordJump function to handle transaction states properly
  const recordJump = async (platformType) => {
    try {
      // Add more detailed logging
      console.log("recordJump called with platform type:", platformType);
      console.log("Context state:", { 
        providerExists: !!provider, 
        contractExists: !!contract, 
        accountExists: !!account,
        isConnected: isConnected,
        address: address
      });
      
      if (!provider || !contract || !account) {
        console.log("Missing provider, contract, or account in recordJump");
        
        // Try to recover by using safe ethereum wrapper if available
        if (window.ethereum) {
          console.log("Attempting to recover using safe ethereum wrapper");
          
          try {
            const safeEthereum = createSafeEthereumWrapper();
            if (!safeEthereum) {
              console.error("Failed to create safe ethereum wrapper");
              // Track jump count locally for recovery later
              setPendingJumps(prev => prev + 1);
              return false;
            }
            
            const ethersProvider = new ethers.providers.Web3Provider(safeEthereum);
            const signer = ethersProvider.getSigner();
            const connectedAddress = await signer.getAddress();
            
            console.log("Recovered address:", connectedAddress);
            
            // Get contract from environment
            const contractAddress = import.meta.env.VITE_REACT_APP_GAME_CONTRACT_ADDRESS;
            const recoveredContract = new ethers.Contract(
              contractAddress,
              gameContractABI,
              signer
            );
            
            // Track jump in Supabase instead of on-chain for now
            await saveJumpsToSupabase(connectedAddress, 1);
            return true;
          } catch (recoveryError) {
            console.error("Recovery attempt failed:", recoveryError);
          }
        }
        
        // Track jump count locally for bundling later
        setPendingJumps(prev => prev + 1);
        return false;
      }

      // If we're in a local development environment, we can mock the transaction
      if (import.meta.env.DEV && import.meta.env.VITE_MOCK_TRANSACTIONS === 'true') {
        console.log("DEV MODE: Mocking jump transaction");
        return true;
      }

      // Increment pending jumps rather than sending individual transactions
      setPendingJumps(prev => prev + 1);
      console.log("Jump recorded locally, will be bundled later");
      
      // Track jump in Supabase as well
      await saveJumpsToSupabase(account, 1);
      return true;
    } catch (error) {
      console.error("Error recording jump:", error);
      // Track jump count locally even on error
      setPendingJumps(prev => prev + 1);
      // Don't throw to prevent game interruption
      return false;
    }
  };

  // Clean up timer when component unmounts
  useEffect(() => {
    return () => {
      if (jumpTimer) {
        clearTimeout(jumpTimer);
      }
    };
  }, [jumpTimer]);

  const updateScore = async (score, jumpCount) => {
    try {
    console.log(`updateScore called with score: ${score}, jumpCount: ${jumpCount}`);
    
    if (!signer || !contract || !account) {
      console.error("Missing required items for transaction:", { 
        signer: !!signer, 
        contract: !!contract, 
        account: !!account 
      });
        
        // Just record the jumps locally instead of trying to make a contract call
        if (jumpCount > 0) {
          setPendingJumps(prev => prev + jumpCount);
          console.log(`Added ${jumpCount} jumps to pending jumps (total: ${pendingJumps + jumpCount})`);
        }
        
        // Also update score locally if it's provided
        if (score > 0) {
          setCurrentGameScore(score);
          await recordScore(score);
        }
        
      return false;
    }

      if (!jumpCount || jumpCount <= 0) {
      console.log("No jumps to record, skipping transaction");
      return true; // Return true but don't send a transaction for 0 jumps
    }

    try {
      console.log(`Submitting transaction to record ${jumpCount} jumps on Monad testnet`);
      console.log("Contract address:", contract.address);
      console.log("Using account:", account);
      
      // Submit the transaction with explicit gasLimit
      const tx = await contract.recordJumps(jumpCount, {
        gasLimit: 300000 // Set a specific gas limit for Monad testnet
      });
      
      console.log("Transaction submitted:", tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log("Transaction confirmed in block:", receipt.blockNumber);
    
        // Also update score locally if it's provided
        if (score > 0) {
          await recordScore(score);
        }
    
    return true;
    } catch (error) {
      console.error("Transaction error:", error);
      // Check for specific errors
      if (error.message?.includes("insufficient funds")) {
        console.error("Insufficient funds on Monad testnet");
      }
        
        // Fall back to local tracking to avoid data loss
        setPendingJumps(prev => prev + jumpCount);
        console.log(`Added ${jumpCount} jumps to pending jumps after transaction error`);
        
        return false;
      }
    } catch (outerError) {
      // Catch any other errors that might occur outside of the transaction
      console.error("Unexpected error in updateScore:", outerError);
      return false;
    }
  };

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

  // Optimized fetchLeaderboard with caching to reduce DB queries
  const fetchLeaderboard = async () => {
    try {
      console.log('Fetching leaderboard');
      
      // Check for cached leaderboard
      const cachedLeaderboard = localStorage.getItem('cached_leaderboard');
      if (cachedLeaderboard) {
        try {
          const { data, timestamp } = JSON.parse(cachedLeaderboard);
          // Use cache if less than 5 minutes old
          if (Date.now() - timestamp < 300000) {
            console.log('Using cached leaderboard data');
            setLeaderboard(data);
            return data;
          }
        } catch (e) {
          // Invalid cache, ignore and continue
        }
      }
      
      // If no supabase client, or if we're in development and mocking is enabled, use mock data
      if (!supabase || (import.meta.env.DEV && import.meta.env.VITE_MOCK_DATA === 'true')) {
        console.log('Using mock leaderboard data');
        const mockLeaderboard = Array.from({ length: 10 }, (_, i) => ({
          player: `Player${i + 1}`,
          address: `0x${i.toString().padStart(40, '0')}`,
          score: 1000 - i * 100,
          timestamp: new Date().toLocaleDateString()
        }));
        
        setLeaderboard(mockLeaderboard);
        return mockLeaderboard;
      }
      
      // Fetch top 10 scores with unique users in a single query
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
        .limit(100);  // Fetch more than needed to filter unique
      
      if (scoreError) throw scoreError;
      console.log('Raw scores fetched:', scores?.length || 0);
      
      // Process scores to keep only the highest score per user
      const uniqueAddresses = new Set();
      const formattedLeaderboard = [];
      
      scores?.forEach(item => {
        const address = item.wallet_address.toLowerCase();
        if (!uniqueAddresses.has(address)) {
          uniqueAddresses.add(address);
          
          // Format the entry (using username from the joined users table if available)
          const username = item.users?.username || 
          `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
        
          formattedLeaderboard.push({
          player: username,
          address: address,
          score: item.score,
          timestamp: new Date(item.created_at).toLocaleDateString()
          });
          
          // Only keep top 10
          if (formattedLeaderboard.length >= 10) {
            return;
          }
        }
      });
      
      console.log('Final leaderboard with unique users:', formattedLeaderboard.length);
      
      // Cache the result
      localStorage.setItem('cached_leaderboard', JSON.stringify({
        data: formattedLeaderboard,
        timestamp: Date.now()
      }));
      
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
  const fetchPlayerStats = async () => {
    if (!address) return;

    try {
      console.log(`Fetching player stats for address ${address}`);
      
      // Get highest score by ordering and taking first result
      const { data, error } = await supabase
        .from('scores')
        .select('score')
        .eq('wallet_address', address.toLowerCase())
        .order('score', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching player stats:', error);
        return;
      }

      const highScore = data?.score || 0;
      
      console.log('Fetched player high score:', highScore);

      const stats = {
        highScore: highScore,
        address: address
      };

      console.log('Setting player stats:', stats);
      setPlayerStats(stats);
      setPlayerHighScore(highScore);
      
      // Also check for scores in localStorage fallback
      const localScoreKey = `player_score_${address.toLowerCase()}`;
      const localScore = localStorage.getItem(localScoreKey);
      
      if (localScore && parseInt(localScore) > highScore) {
        const parsedScore = parseInt(localScore);
        console.log(`Found higher local score: ${parsedScore}, using instead of ${highScore}`);
        setPlayerHighScore(parsedScore);
      }
      
    } catch (error) {
      console.error('Error in fetchPlayerStats:', error);
      
      // Try to use localStorage as fallback
      const localScoreKey = `player_score_${address.toLowerCase()}`;
      const localScore = localStorage.getItem(localScoreKey);
      
      if (localScore) {
        const parsedScore = parseInt(localScore);
        console.log(`Using fallback local score: ${parsedScore}`);
        setPlayerHighScore(parsedScore);
      }
    }
  };

  // Add this effect to fetch player stats when address changes
  useEffect(() => {
    if (address) {
      fetchPlayerStats();
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

    const processJumps = () => {
      if (pendingJumpCount <= 0) return;
      
      const jumpCount = pendingJumpCount;
      pendingJumpCount = 0;
      
      console.log(`Processing ${jumpCount} accumulated jumps`);
      recordBundledJumps(jumpCount).catch(e => console.error('Error processing jumps:', e));
    };

    // Single consolidated message handler for all game-related events
    const handleGameMessages = async (event) => {
      try {
        // First check event types that don't need RPC calls
        
        // Handle direct events from the game via custom events
        if (event.type === 'gameScore') {
          const score = event.detail?.score;
          if (!score) return;
          
          console.log("🎮 Received game score event:", score);
          debouncedScoreUpdate(score);
            return;
          }

        if (event.type === 'gameJump') {
          const { count } = event.detail || {};
          if (!count || count <= 0) return;
          
          // Add to pending jumps instead of making immediate RPC calls
          pendingJumpCount += count;
          
          // Reset the timer for batch processing
          if (jumpProcessingTimer) clearTimeout(jumpProcessingTimer);
          jumpProcessingTimer = setTimeout(processJumps, 2000);
              return;
        }
        
        // Handle game over - this is one event we want to process immediately
        if (event.type === 'gameOver') {
          const { finalScore } = event.detail || {};
          if (!finalScore) return;
          
          console.log("🎮 Game Over - Processing score:", finalScore);
          
          // Process the final score immediately
          await recordScore(finalScore);
          
          // Process any pending jumps
          processJumps();
      return;
    }

        // Handle messages from iframe
        if (event.data && typeof event.data === 'object') {
          // Handle score updates from iframe
          if (event.data.type === 'gameScore') {
        const score = event.data.score;
            if (!score) return;
        
            console.log("📊 Received score from game iframe:", score);
            debouncedScoreUpdate(score);
          return;
        }

          // Handle jump events from iframe - accumulate instead of immediate processing
          if (event.data.type === 'JUMP_PERFORMED') {
            const jumpCount = event.data.jumpCount || 1;
            console.log("🦘 Jump received from iframe:", jumpCount);
            
            // Add to pending count
            pendingJumpCount += jumpCount;
            
            // Reset the timer for batch processing
            if (jumpProcessingTimer) clearTimeout(jumpProcessingTimer);
            jumpProcessingTimer = setTimeout(processJumps, 2000);
              return;
          }
          
          // Handle bundle jumps - process immediately as this is already a batch
          if (event.data.type === 'BUNDLE_JUMPS' && event.data.data) {
            const { score, jumpCount } = event.data.data || {};
            if (!jumpCount || jumpCount <= 0) return;
            
            console.log("🎮 Bundle includes score:", score, "jumps:", jumpCount);
            
            // Record score first if provided
            if (score > 0) {
              await recordScore(score);
            }
            
            // Process the jumps
            await recordBundledJumps(jumpCount);
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

  // Update the NFT verification logic with improved resilience against rate limiting and network errors
  const checkNFT = async (address) => {
    try {
        if (!address) return false;
        
        // Check if we're in a cooldown period due to rate limiting
        const cooldownUntilStr = localStorage.getItem('nft_check_cooldown');
        if (cooldownUntilStr) {
            const cooldownUntil = parseInt(cooldownUntilStr);
            if (Date.now() < cooldownUntil) {
                console.log(`NFT check in cooldown until ${new Date(cooldownUntil).toLocaleTimeString()}, using cached result`);
                // During cooldown, use cached result if available
                const cachedStatusStr = localStorage.getItem(`nft_status_${address}`);
                if (cachedStatusStr) {
                    try {
                        const { hasNFT, timestamp } = JSON.parse(cachedStatusStr);
                        // Cache valid for 6 hours during cooldown periods
                        if (Date.now() - timestamp < 6 * 60 * 60 * 1000) {
                            return hasNFT;
                        }
                    } catch (e) {
                        console.error("Error parsing cached NFT status", e);
                    }
                }
                return false; // Default to false if no valid cache during cooldown
            } else {
                // Cooldown expired, remove it
                localStorage.removeItem('nft_check_cooldown');
            }
        }
        
        // Check cache first (valid for 3 hours instead of 1 to reduce RPC calls)
        const cachedStatusStr = localStorage.getItem(`nft_status_${address}`);
        if (cachedStatusStr) {
            try {
                const { hasNFT, timestamp } = JSON.parse(cachedStatusStr);
                if (Date.now() - timestamp < 3 * 60 * 60 * 1000) {
                    console.log("Using cached NFT status");
                    return hasNFT;
                }
            } catch (e) {
                console.error("Error parsing cached NFT status", e);
            }
        }

        // Proceed with NFT check
        console.log(`Checking NFT for address: ${address}`);
        let result = false;
        
        try {
            // First attempt with provider if available
            if (provider) {
                try {
                    console.log("Using connected provider for NFT check");
                    const contract = new ethers.Contract(BOOSTER_CONTRACT, BOOSTER_ABI, provider);
                    const balance = await contract.balanceOf(address);
                    result = balance.toNumber() > 0;
                    console.log(`NFT check result with provider: ${result ? "Has NFT" : "No NFT"}`);
                    
                    // Cache the result
                    localStorage.setItem(`nft_status_${address}`, JSON.stringify({
                        hasNFT: result,
                        timestamp: Date.now()
                    }));
                    
                    setHasNFT(result);
                    return result;
                } catch (providerError) {
                    console.error("Error checking NFT with provider:", providerError);
                    // Fall through to fallback approach
                }
            }
            
            // Fallback to read-only provider
            if (readOnlyProvider) {
                try {
                    console.log("Using read-only provider for NFT check");
                    const BOOSTER_CONTRACT = '0xbee3b1b8e62745f5e322a2953b365ef474d92d7b';
                    const BOOSTER_ABI = ["function balanceOf(address owner) view returns (uint256)"];
                    
                    const contract = new ethers.Contract(BOOSTER_CONTRACT, BOOSTER_ABI, readOnlyProvider);
                    const balance = await contract.balanceOf(address);
                    result = balance.toNumber() > 0;
                    console.log(`NFT check result with read-only provider: ${result ? "Has NFT" : "No NFT"}`);
                } catch (roError) {
                    console.error("Error checking NFT with read-only provider:", roError);
                    // Fall through to last resort RPC approach
                }
            }
            
            // Last resort: try with a direct JsonRpcProvider
            if (!result) {
                try {
                    console.log("Attempting last resort NFT check with direct RPC");
                    // Use first RPC from the chain config
                    const rpcUrl = monadTestnet.rpcUrls.default.http[0];
                    const directProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
                    
                    const BOOSTER_CONTRACT = '0xbee3b1b8e62745f5e322a2953b365ef474d92d7b';
                    const BOOSTER_ABI = ["function balanceOf(address owner) view returns (uint256)"];
                    
                    const contract = new ethers.Contract(BOOSTER_CONTRACT, BOOSTER_ABI, directProvider);
                    const balance = await contract.balanceOf(address);
                    result = balance.toNumber() > 0;
                    console.log(`NFT check result with direct RPC: ${result ? "Has NFT" : "No NFT"}`);
                } catch (directError) {
                    console.error("Error with direct RPC NFT check:", directError);
                }
            }
        } catch (e) {
            console.error("Error checking NFT balance:", e);
            // If we get a rate limit error, set a cooldown period (1 minute)
            if (e.message && (e.message.includes('rate limit') || e.message.includes('429'))) {
                const cooldownTime = Date.now() + 60000; // 1 minute cooldown
                localStorage.setItem('nft_check_cooldown', cooldownTime.toString());
                console.log(`Rate limit detected, setting NFT check cooldown until ${new Date(cooldownTime).toLocaleTimeString()}`);
            }
            
            // Use cached result if available when error occurs
            if (cachedStatusStr) {
                try {
                    const { hasNFT } = JSON.parse(cachedStatusStr);
                    console.log("Using cached NFT status due to error");
                    result = hasNFT;
                } catch {
                    result = false;
                }
            }
        }
        
        // Cache the result
        localStorage.setItem(`nft_status_${address}`, JSON.stringify({
            hasNFT: result,
            timestamp: Date.now()
        }));
        
        setHasNFT(result);
        return result;
    } catch (error) {
        console.error('Error in checkNFT:', error);
        return false;
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
    // Define a fallback RPC URLs array to use when primary fails
    const FALLBACK_RPC_URLS = [
      'https://prettiest-snowy-pine.monad-testnet.quiknode.pro/4fc856936286525197c30da74dd994d2c7710e93',
      'https://rpc.ankr.com/monad_testnet',
      'https://thirdweb.monad-testnet.titanrpc.io',
      'https://rpc.monad.testnet.gateway.fm'
    ];
    
    // This stores the last successful RPC endpoint
    window.__lastWorkingRPC = localStorage.getItem('last_working_rpc') || FALLBACK_RPC_URLS[0];

    // Function to create a provider with the current best RPC URL
    const createProviderWithFallback = async (currentIndex = 0) => {
      // Circuit breaker - prevent excessive attempts
      const lastAttemptTime = parseInt(localStorage.getItem('rpc_last_attempt') || '0');
      const attemptThrottle = 10000; // 10 seconds between full retry cycles
      
      if (Date.now() - lastAttemptTime < attemptThrottle && lastAttemptTime > 0) {
        console.log('RPC connection attempts throttled, using cached value if available');
        return null;
      }
      
      // Set last attempt timestamp
      localStorage.setItem('rpc_last_attempt', Date.now().toString());
      
      // Non-recursive implementation to prevent call stack issues
      for (let i = currentIndex; i < FALLBACK_RPC_URLS.length; i++) {
        const url = i === 0 ? window.__lastWorkingRPC : FALLBACK_RPC_URLS[i];
        
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
          window.__lastWorkingRPC = url;
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
    
    // Initialize the fallback provider system
    if (!readOnlyProvider) {
      console.log('Setting up fallback provider system');
      createProviderWithFallback().then(provider => {
        if (provider) {
          setReadOnlyProvider(provider);
          console.log('Fallback provider initialized successfully');
        }
      }).catch(err => {
        console.error('Failed to initialize any fallback provider:', err);
      });
    }
    
    // Set up a network change listener
    if (window.ethereum) {
      const safeEthereum = createSafeEthereumWrapper();
      if (safeEthereum) {
        const handleChainChanged = async (chainId) => {
          console.log('Chain changed to:', chainId);
          // Clear provider to force re-creation with new network
          setProvider(null);
          
          // Wait a moment for things to settle
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        };
        
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
        
        // Create a new provider for each attempt to avoid stale connections
        const provider = createProviderWithFallback();
        return await fn(provider);
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
    highScore,
    totalJumps,
    recordJumps,
    recordBundledJumps,
    saveJumpsToSupabase,
    fetchJumps,
    fetchUserData,
    refreshJumps,
    isCheckingNFT,
    hasNFT,
    checkNFTStatus: checkNFT
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}

export const useWeb3 = () => useContext(Web3Context);
export const useWeb3Context = useWeb3; 