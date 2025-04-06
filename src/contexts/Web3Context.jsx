import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';
import { monadTestnet } from '../config/chains';
import { useAccount } from 'wagmi';
import GameScoreABI from '../abis/GameScore.json';
import { gameContractABI } from '../contracts/abi';
import { CONTRACT_ADDRESSES } from '../contracts/config';

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

  // Update the provider initialization in Web3Context.jsx
  useEffect(() => {
    const initializeProvider = async () => {
        try {
            console.log("Initializing Web3 provider...");
            
            // Check if window.ethereum exists
            if (typeof window.ethereum !== 'undefined') {
                // For ethers v5
      const provider = new ethers.providers.Web3Provider(window.ethereum);
                console.log("Provider initialized successfully");
                
      setProvider(provider);
                
                // Get signer and chain info
                try {
                    const signer = provider.getSigner();
                    setSigner(signer);
                    const network = await provider.getNetwork();
                    setChainId(network.chainId);
                    console.log("Signer and network info retrieved");
                } catch (error) {
                    console.error("Error getting signer:", error);
                }
            } else {
                console.log("No ethereum object found in window");
            }
    } catch (error) {
      console.error("Error initializing provider:", error);
    }
    };

    initializeProvider();
  }, []);

  // After the existing provider initialization useEffect, add a new useEffect to initialize the contract
  useEffect(() => {
    const initializeContract = async () => {
      if (!provider || !signer) {
        console.log("Provider or signer not available yet, cannot initialize contract");
        return;
      }
      
      try {
        console.log("Initializing game contract...");
        
        // Get the contract address from environment variables or use fallback
        const contractAddress = GAME_CONTRACT_ADDRESS || CONTRACT_ADDRESSES.GameScore;
        console.log("Using contract address:", contractAddress);
        
        // Create contract instance
        const gameContract = new ethers.Contract(
          contractAddress,
          gameContractABI,
          signer
        );
        
        console.log("Contract initialized successfully:", gameContract.address);
        setContract(gameContract);
        
        // Also initialize a read-only contract with provider
        const readOnlyContract = new ethers.Contract(
          contractAddress,
          gameContractABI,
          provider
        );
        
        // Test the contract by calling a view function
        try {
          const testResult = await readOnlyContract.name();
          console.log("Contract test successful:", testResult);
        } catch (testError) {
          console.warn("Contract test call failed:", testError);
        }
      } catch (error) {
        console.error("Error initializing contract:", error);
      }
    };

    if (provider && signer) {
      initializeContract();
    }
  }, [provider, signer]);

  // Add fallback provider and contract initialization
  useEffect(() => {
    // Only create fallback if we don't have a primary provider
    if (!provider || !contract) {
      console.log("Setting up fallback provider and contract...");
      
      try {
        // Create fallback provider
        const fallbackProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
        setReadOnlyProvider(fallbackProvider);
        
        // Create read-only contract
        const contractAddress = GAME_CONTRACT_ADDRESS || CONTRACT_ADDRESSES.GameScore;
        const readOnlyContract = new ethers.Contract(
          contractAddress,
          gameContractABI,
          fallbackProvider
        );
        
        // If we don't have a primary contract, use the read-only one
        if (!contract) {
          console.log("Using read-only contract as fallback");
          setContract(readOnlyContract);
        }
      } catch (error) {
        console.error("Error setting up fallback provider:", error);
      }
    }
  }, [provider, contract]);

  // Add a debug effect to log when contract is set
  useEffect(() => {
    console.log("Contract state:", {
      contract: !!contract,
      contractAddress: contract?.address
    });
  }, [contract]);

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
      
      await window.ethereum.request({ method: "eth_requestAccounts" });
      console.log("Wallet connected!");
      
      if (directAddress) {
        // Direct connection when address is provided from RainbowKit
        console.log("Direct address provided:", directAddress);
        await handleAccountChange(directAddress);
        return true;
      }
      
      // Request chain switch/add if needed
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${monadTestnet.id.toString(16)}` }],
        });
      } catch (switchError) {
        // This error code indicates the chain hasn't been added to MetaMask
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
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
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
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
        
        // Try to recover by using window.ethereum directly if available
        if (window.ethereum && window.ethereum.selectedAddress) {
          console.log("Attempting to recover using window.ethereum");
          
          try {
            const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
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
    console.log(`updateScore called with score: ${score}, jumpCount: ${jumpCount}`);
    
    if (!signer || !contract || !account) {
      console.error("Missing required items for transaction:", { 
        signer: !!signer, 
        contract: !!contract, 
        account: !!account 
      });
      return false;
    }

    if (jumpCount <= 0) {
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
    
    return true;
    } catch (error) {
      console.error("Transaction error:", error);
      // Check for specific errors
      if (error.message?.includes("insufficient funds")) {
        console.error("Insufficient funds on Monad testnet");
      }
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

  // Update the saveScore function to use Supabase
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

  // Completely rewrite the fetchLeaderboard function to ensure one user appears only once
  const fetchLeaderboard = async () => {
    try {
      console.log('Fetching leaderboard with unique users only');
      
      // First get all scores
      const { data: allScores, error: scoreError } = await supabase
        .from('scores')
        .select('wallet_address, score, created_at')
        .order('score', { ascending: false });
      
      if (scoreError) throw scoreError;
      console.log('Raw scores fetched:', allScores?.length || 0);
      
      // Process scores to keep only the highest score per user
      const uniqueAddresses = new Set();
      const uniqueScores = [];
      
      // This logic ensures we keep only the first (highest) score for each address
      allScores.forEach(score => {
        const address = score.wallet_address.toLowerCase();
        if (!uniqueAddresses.has(address)) {
          uniqueAddresses.add(address);
          uniqueScores.push(score);
        }
      });
      
      console.log('Filtered to unique users:', uniqueScores.length);
      
      // Get the top 10 scores only
      const topScores = uniqueScores.slice(0, 10);
      
      // Get usernames for these addresses
      const walletAddresses = topScores.map(item => item.wallet_address.toLowerCase());
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('wallet_address, username')
        .in('wallet_address', walletAddresses);
      
      if (userError) throw userError;
      
      // Create username lookup map
      const usernameMap = {};
      if (userData) {
        userData.forEach(user => {
          usernameMap[user.wallet_address.toLowerCase()] = user.username;
        });
      }
      
      // Format the leaderboard data
      const formattedLeaderboard = topScores.map(item => {
        const address = item.wallet_address.toLowerCase();
        const username = usernameMap[address] || 
          `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
        
        return {
          player: username,
          address: address,
          score: item.score,
          timestamp: new Date(item.created_at).toLocaleDateString()
        };
      });
      
      console.log('Final leaderboard with unique users:', formattedLeaderboard);
      
      // Double-check uniqueness before setting state
      const finalAddresses = new Set();
      const finalLeaderboard = [];
      
      for (const entry of formattedLeaderboard) {
        if (!finalAddresses.has(entry.address)) {
          finalAddresses.add(entry.address);
          finalLeaderboard.push(entry);
        }
      }
      
      setLeaderboard(finalLeaderboard);
      
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLeaderboard([]);
    }
  };

  // Add fetchPlayerStats to get user's stats from Supabase
  const fetchPlayerStats = async () => {
    if (!address) return;

    try {
      const { data, error } = await supabase
        .from('scores')
        .select('score')
        .eq('wallet_address', address.toLowerCase())
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching player stats:', error);
        return;
      }

      const stats = {
        highScore: data?.score || 0,
        address: address
      };

      console.log('Fetched player stats:', stats);
      setPlayerStats(stats);
      setPlayerHighScore(stats.highScore);
    } catch (error) {
      console.error('Error in fetchPlayerStats:', error);
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

  // Update recordScore to ensure scores are saved properly
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
  }, [address, isConnected, playerHighScore]);

  // Update the score event listener
  useEffect(() => {
    const handleGameScore = async (event) => {
      const score = event.detail.score;
      console.log("Received game score event:", score);
      await recordScore(score);
    };

    window.addEventListener('gameScore', handleGameScore);
    return () => window.removeEventListener('gameScore', handleGameScore);
  }, [isConnected]); // Add isConnected to dependencies

  // Add this to your existing useEffect hooks
  useEffect(() => {
    const handleGameOver = async (event) => {
      const { finalScore, jumpCount } = event.detail;
      console.log("Game Over - Processing score:", finalScore, "jumps:", jumpCount);
      
      // Record the final score
      await recordScore(finalScore);
      
      // Process any pending jumps
      if (jumpCount > 0) {
        await recordJump(jumpCount);
      }
    };

    const handleJump = async (event) => {
      const { count } = event.detail;
      console.log("Jump event received:", count);
      await recordJump(count);
    };

    window.addEventListener('gameOver', handleGameOver);
    window.addEventListener('gameJump', handleJump);
    
    return () => {
      window.removeEventListener('gameOver', handleGameOver);
      window.removeEventListener('gameJump', handleJump);
    };
  }, [isConnected]);

  // Update the fetchScores function to run periodically
  useEffect(() => {
    // Initial fetch
    fetchScores(address);
    
    // Set up periodic refresh
    const interval = setInterval(fetchScores, 10000, address); // Refresh every 10 seconds
    
    return () => clearInterval(interval);
  }, [isConnected, address]);

  // Add this effect to handle iframe messages
  useEffect(() => {
    const handleIframeMessage = async (event) => {
      // Check if the message is from our game iframe
      if (event.data && event.data.type === 'gameScore') {
        const score = event.data.score;
        console.log("Received score from game iframe:", score);
        
        try {
          if (!address) {
            console.error('No wallet address available');
            return;
          }

          // First ensure user exists
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('wallet_address')
            .eq('wallet_address', address.toLowerCase())
            .single();

          if (!userData) {
            // Create user if doesn't exist
            const { error: insertError } = await supabase
              .from('users')
              .insert([{ 
                wallet_address: address.toLowerCase(),
                username: `Player_${address.slice(0, 6)}`
              }]);

            if (insertError) {
              console.error('Error creating user:', insertError);
              return;
            }
          }

          // Save the score
          const { data, error } = await supabase
            .from('scores')
            .upsert([{
              wallet_address: address.toLowerCase(),
              score: parseInt(score),
              timestamp: new Date().toISOString()
            }], {
              onConflict: 'wallet_address',
              returning: true
            });

          if (error) throw error;

          console.log('Score saved to Supabase:', data);
          setPlayerHighScore(score);
          fetchLeaderboard();

        } catch (error) {
          console.error('Error handling game score:', error);
        }
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [address]);

  // Update the game over handler
  useEffect(() => {
    const handleGameOver = async (event) => {
      const { finalScore } = event.detail;
      console.log("Game Over - Final score:", finalScore);
      
      // Send score via postMessage to ensure it's captured
      window.postMessage({
        type: 'gameScore',
        score: finalScore
      }, '*');
    };

    window.addEventListener('gameOver', handleGameOver);
    return () => window.removeEventListener('gameOver', handleGameOver);
  }, []);

  // Fetch user's high score
  const fetchHighScore = async () => {
    if (!address) {
      console.log('No address available for fetchHighScore');
      return;
    }

    console.log('Fetching high score for address:', address.toLowerCase());

    try {
      // Get all scores for this user
      const { data, error } = await supabase
        .from('scores')
        .select('score, created_at')
        .eq('wallet_address', address.toLowerCase())
        .order('score', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      console.log('High score query results:', data);

      if (data && data.length > 0) {
        const highestScore = data[0].score;
        console.log('Setting high score to:', highestScore);
        setPlayerHighScore(highestScore);
        setHighScore(highestScore);
        
        // Store in localStorage as backup
        localStorage.setItem(`highScore_${address.toLowerCase()}`, highestScore);
      } else {
        console.log('No high scores found for this user');
        setPlayerHighScore(0);
        setHighScore(0);
      }
    } catch (error) {
      console.error('Error fetching high score:', error);
      
      // Try to recover from localStorage
      const cachedScore = localStorage.getItem(`highScore_${address.toLowerCase()}`);
      if (cachedScore) {
        console.log('Recovering high score from cache:', cachedScore);
        setPlayerHighScore(parseInt(cachedScore));
        setHighScore(parseInt(cachedScore));
      } else {
        setPlayerHighScore(0);
        setHighScore(0);
      }
    }
  };

  // Record jumps
  const recordJumps = async (count) => {
    if (!address || !count) return;

    try {
      const { error } = await supabase
        .from('jumps')
        .insert([{
          wallet_address: address.toLowerCase(),
          count: count
        }]);

      if (error) throw error;
      setTotalJumps(prev => prev + count);
    } catch (error) {
      console.error('Error recording jumps:', error);
    }
  };

  // Initialize when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      checkAndLoadUsername(address)
        .then(username => {
          console.log('Username checked/loaded:', username);
        })
        .catch(err => {
          console.error('Error checking username:', err);
        });
      fetchHighScore();
      fetchLeaderboard();
    }
  }, [isConnected, address]);

  // Listen for game events
  useEffect(() => {
    const handleGameScore = async (event) => {
      if (event.data?.type === 'gameScore') {
        await saveScore(address, event.data.score);
      }
    };

    window.addEventListener('message', handleGameScore);
    return () => window.removeEventListener('message', handleGameScore);
  }, [address]);

  // Add useEffect to monitor modal state changes
  useEffect(() => {
    console.log('Username modal state changed:', {
      showUsernameModal,
      username,
      address,
      isConnected
    });
  }, [showUsernameModal, username, address, isConnected]);

  // Update the score handling effect
  useEffect(() => {
    const handleGameScore = async (event) => {
      // Handle postMessage events
      if (event.data?.type === 'gameScore') {
        const score = event.data.score;
        console.log('Received game score from postMessage:', score);
        
        if (!address || !score) {
          console.log('No address or score to save');
          return;
        }

        try {
          console.log('Saving score to Supabase:', score, 'for address:', address);

          // First ensure user exists
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('wallet_address')
            .eq('wallet_address', address.toLowerCase())
            .single();

          if (!userData) {
            // Create user if doesn't exist
            const { error: insertError } = await supabase
              .from('users')
              .insert([{ 
                wallet_address: address.toLowerCase(),
                username: `Player_${address.slice(0, 6)}`
              }]);

            if (insertError) {
              console.error('Error creating user:', insertError);
              return;
            }
          }

          // Save the score
          const { data, error } = await supabase
            .from('scores')
            .insert([{
              wallet_address: address.toLowerCase(),
              score: parseInt(score),
              created_at: new Date().toISOString()
            }]);

          if (error) throw error;

          console.log('Score saved successfully:', data);
          
          // Get current high score to compare
          const currentHighScore = Math.max(playerHighScore, highScore);
          console.log('Current high score before update:', currentHighScore);
          
          // Update high score if needed
          if (parseInt(score) > currentHighScore) {
            console.log(`New high score! ${score} > ${currentHighScore}`);
            const newHighScore = parseInt(score);
            
            // Update both state variables to ensure consistency
            setPlayerHighScore(newHighScore);
            setHighScore(newHighScore);
            
            // Cache to localStorage
            localStorage.setItem(`highScore_${address.toLowerCase()}`, newHighScore);
          }
          
          // Trigger a fetch of all scores but don't override if we just set a high score
          const shouldOverride = parseInt(score) <= currentHighScore;
          await fetchScores(address);
          fetchLeaderboard();

        } catch (error) {
          console.error('Error saving score to Supabase:', error);
        }
      }
    };

    window.addEventListener('message', handleGameScore);
    
    return () => {
      window.removeEventListener('message', handleGameScore);
    };
  }, [address, playerHighScore, highScore]);

  // Add this check to make sure we're not accidentally resetting the high score
  useEffect(() => {
    console.log('High score state changed:', {
      playerHighScore,
      highScore,
      address: address?.toLowerCase()
    });
    
    // Sanity check
    if (playerHighScore > 0 && highScore === 0) {
      console.error('Inconsistent state detected - recovering highScore from playerHighScore');
      setHighScore(playerHighScore);
    } else if (highScore > 0 && playerHighScore === 0) {
      console.error('Inconsistent state detected - recovering playerHighScore from highScore');
      setPlayerHighScore(highScore);
    }
  }, [playerHighScore, highScore]);

  const recordBundledJumps = useCallback(async (jumpCount) => {
    console.log(`Recording ${jumpCount} bundled jumps on the blockchain`);
    
    if (!isConnected || !address) {
      console.error('Cannot record jumps: wallet not connected');
      return false;
    }
    
    try {
      // Create contract instance (directly here, don't rely on context)
      if (!window.ethereum) {
        console.error('No Ethereum provider available');
        return false;
      }
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // Get the contract address from environment or use a fallback
      const jumpContractAddress = 
        import.meta.env.VITE_REACT_APP_GAME_CONTRACT_ADDRESS || 
        "0xfc84a3379e2d8bc9d80ab8391991ef091bd02ba6";
      
      console.log(`Using contract address: ${jumpContractAddress}`);
      
      // Minimal ABI for the jump function
      const jumpContractABI = [
        "function finalizeGame(uint256 _score, uint256 _jumps) external payable",
        "function recordJump() external",
        "function recordJumps(uint256 _jumps) external"
      ];
      
      const jumpContract = new ethers.Contract(jumpContractAddress, jumpContractABI, signer);
      
      // First try recordJumps if it exists
      let tx;
      if (jumpContract.recordJumps) {
        console.log(`Calling recordJumps(${jumpCount})`);
        tx = await jumpContract.recordJumps(jumpCount, {
          gasLimit: ethers.utils.hexlify(300000)
        });
      } else {
        // Use finalizeGame with a score of 1 (just to record jumps)
        console.log(`Calling finalizeGame(1, ${jumpCount})`);
        
        // Calculate jump cost (if needed)
        const jumpCost = ethers.utils.parseEther("0.0001").mul(jumpCount);
        
        tx = await jumpContract.finalizeGame(1, jumpCount, {
          value: jumpCost,
          gasLimit: ethers.utils.hexlify(300000)
        });
      }
      
      console.log('Jump recording transaction sent:', tx.hash);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log('Jump recording confirmed:', receipt);
      
      // Update local state
      setTotalJumps(prev => prev + jumpCount);
      return true;
    } catch (error) {
      console.error('Failed to record bundled jumps:', error);
      
      // Try to show more specific error message
      if (error.code === 'ACTION_REJECTED') {
        console.log('Transaction was rejected by user');
      } else if (error.message.includes('user rejected transaction')) {
        console.log('User rejected the transaction');
      } else {
        console.log('Error details:', error.message);
      }
      
      return false;
    }
  }, [isConnected, address]);

  // Add this function to track outgoing transactions and update UI immediately
  const setupTransactionTracker = () => {
    // Capture the original console.log
    const originalConsoleLog = console.log;
    console.log = function(...args) {
      // Call the original console.log
      originalConsoleLog.apply(console, args);
      
      // Check if this is a bundle transaction sent message
      const message = args.join(' ');
      if (message.includes('Bundle transaction sent:') || 
          message.includes('✅ Bundle transaction sent:')) {
        
        // Extract transaction hash
        const txHash = message.split(':')[1]?.trim();
        if (txHash) {
          console.log('Detected outgoing transaction:', txHash);
          
          // Immediately force UI update in the game iframe
          try {
            const gameFrame = document.querySelector('iframe');
            if (gameFrame && gameFrame.contentWindow) {
              // Force UI update to "Jumps recorded!"
              gameFrame.contentWindow.postMessage({
                type: 'TRANSACTION_SUCCESS',
                data: { 
                  type: 'jump', 
                  status: 'confirmed',
                  message: 'Jumps recorded!',
                  hash: txHash
                }
              }, '*');
              
              // Also update any waiting approval UI
              gameFrame.contentWindow.postMessage({
                type: 'UPDATE_WAITING_APPROVAL',
                data: { 
                  newStatus: 'Jumps recorded!',
                  hash: txHash
                }
              }, '*');
            }
          } catch (error) {
            console.error('Error updating game UI:', error);
          }
        }
      }
    };
    
    return () => {
      // Restore original console.log on cleanup
      console.log = originalConsoleLog;
    };
  };

  // Add this inside the useEffect where you set up events
  useEffect(() => {
    // Set up transaction tracker
    const cleanupTracker = setupTransactionTracker();
    
    // Return cleanup function
    return () => {
      cleanupTracker();
    };
  }, []);

  // Add this function to handle game over events correctly
  const handleGameOver = (score, jumps) => {
    console.log('Game over detected, score:', score, 'jumps:', jumps);
    
    // Always set the game iframe to "waiting" state initially
    try {
      const gameFrame = document.querySelector('iframe');
      if (gameFrame && gameFrame.contentWindow) {
        // Important: Send reset message to ensure "Waiting for approval" is shown
        gameFrame.contentWindow.postMessage({
          type: 'TX_RESET',
          data: { type: 'jump' }
        }, '*');
        
        // Also send explicit waiting state
        gameFrame.contentWindow.postMessage({
          type: 'TX_WAITING',
          data: { type: 'jump' }
        }, '*');
      }
    } catch (error) {
      console.error('Error resetting transaction status:', error);
    }
    
    // Continue with normal game over handling
    // (recording score, etc.)
  };

  // Listen for game over events
  useEffect(() => {
    const handleGameOverMessage = (event) => {
      if (event.data && event.data.type === 'GAME_OVER') {
        const { finalScore } = event.data.data || { finalScore: 0 };
        handleGameOver(finalScore, pendingJumps);
      }
    };
    
    window.addEventListener('message', handleGameOverMessage);
    return () => {
      window.removeEventListener('message', handleGameOverMessage);
    };
  }, [pendingJumps]);

  // Ultra-simple implementation matching the exact table schema
  const saveJumpsToSupabase = async (walletAddress, newJumps) => {
    if (!walletAddress || newJumps <= 0 || !supabase) {
      console.error('⛔ Invalid parameters for saving jumps');
      return;
    }
    
    try {
      console.log(`🔵 SCHEMA-MATCHING JUMP SAVE: Adding ${newJumps} jumps for ${walletAddress}`);
      const normalizedAddress = walletAddress.toLowerCase();
      
      // First ensure the user exists (required by foreign key constraint)
      await ensureUserExists(normalizedAddress);
      
      // Check for existing record
      const { data: existingRecord, error: fetchError } = await supabase
        .from('jumps')
        .select('id, count')
        .eq('wallet_address', normalizedAddress)
        .maybeSingle();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('⛔ Error fetching existing record:', fetchError);
        return null;
      }
      
      // Simple logic - if record exists, update it; otherwise create it
      if (existingRecord) {
        console.log(`🔵 Found existing record with count ${existingRecord.count}`);
        const newTotal = existingRecord.count + newJumps;
        console.log(`🔵 Updating to new total: ${newTotal}`);
        
        // Update existing record - match schema exactly
        const { error: updateError } = await supabase
          .from('jumps')
          .update({ count: newTotal })
          .eq('id', existingRecord.id);
        
        if (updateError) {
          console.error('⛔ Error updating jumps:', updateError);
          return null;
        }
        
        console.log(`🔵 Successfully updated jump count to ${newTotal}`);
        setTotalJumps(newTotal);
        return newTotal;
      } else {
        console.log(`🔵 No existing record, creating new with count ${newJumps}`);
        
        // Insert new record - match schema exactly
        const { error: insertError } = await supabase
          .from('jumps')
          .insert([{ 
            wallet_address: normalizedAddress,
            count: newJumps
          }]);
        
        if (insertError) {
          console.error('⛔ Error inserting jumps:', insertError);
          return null;
        }
        
        console.log(`🔵 Successfully created new jump record with count ${newJumps}`);
        setTotalJumps(newJumps);
        return newJumps;
      }
    } catch (error) {
      console.error('⛔ Unexpected error in saveJumpsToSupabase:', error);
      return null;
    }
  };

  // Helper function to ensure user exists
  const ensureUserExists = async (walletAddress) => {
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('wallet_address')
        .eq('wallet_address', walletAddress)
        .maybeSingle();
      
      if (!existingUser) {
        console.log('📊 Creating new user record for wallet:', walletAddress);
        await supabase
          .from('users')
          .insert([{
            wallet_address: walletAddress,
            username: `Player_${walletAddress.slice(0, 6)}`
          }]);
      }
    } catch (error) {
      console.error('📊 Error ensuring user exists:', error);
    }
  };

  // Add a dedicated function to fetch jumps
  const fetchJumps = async (walletAddress) => {
    if (!walletAddress || !supabase) return;
    
    try {
      console.log('📊 Fetching jumps for wallet:', walletAddress);
      const normalizedAddress = walletAddress.toLowerCase();
      
      // First check and clean up any duplicates
      const { data: countData } = await supabase
        .from('jumps')
        .select('id')
        .eq('wallet_address', normalizedAddress);
      
      if (countData && countData.length > 1) {
        console.log(`📊 Found ${countData.length} records during fetch - cleaning up`);
        
        // Keep the first record, delete the rest
        const keepId = countData[0].id;
        const deleteIds = countData.slice(1).map(item => item.id);
        
        await supabase
          .from('jumps')
          .delete()
          .in('id', deleteIds);
      }
      
      // Now fetch the single record
      const { data, error } = await supabase
        .from('jumps')
        .select('count')
        .eq('wallet_address', normalizedAddress)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('📊 Error fetching jumps:', error);
        return;
      }
      
      const jumpCount = data?.count || 0;
      console.log('📊 Fetched jumps from database:', jumpCount);
      
      // Update the state with the fetched value
      setTotalJumps(jumpCount);
      return jumpCount;
    } catch (error) {
      console.error('📊 Error in fetchJumps:', error);
      return 0;
    }
  };

  // Update fetchUserData to include jumps
  const fetchUserData = async (address) => {
    if (!address || !supabase) return;
    
    try {
      console.log('📊 Fetching user data including jumps for:', address);
      
      // Fetch scores (existing code)
      fetchScores(address);
      
      // Fetch jumps
      await fetchJumps(address);
      
      console.log('📊 User data fetch complete');
    } catch (error) {
      console.error('📊 Error fetching user data:', error);
    }
  };

  // Add useEffect to fetch jumps when user connects
  useEffect(() => {
    if (isConnected && address) {
      console.log('📊 User connected, fetching jumps for:', address);
      fetchJumps(address);
    }
  }, [isConnected, address]);

  // Add explicit refresh function
  const refreshJumps = () => {
    if (isConnected && address) {
      console.log('📊 Refreshing jumps data');
      return fetchJumps(address);
    }
    return Promise.resolve(0);
  };

  // Update the game message handler to properly save high scores
  useEffect(() => {
    if (!isConnected || !address) return;

    const handleGameMessages = (event) => {
      if (!event.data) return;
      
      // Handle different message types
      const { type, data, score } = event.data;
      
      if (type === 'gameScore') {
        console.log(`🎮 Game score message received with score: ${score || data?.score}`);
        
        // Extract the score from the message
        const gameScore = score || data?.score || 0;
        
        if (gameScore > 0) {
          console.log(`🎮 Processing game score: ${gameScore}`);
          
          // Save the score to Supabase if it's higher than current high score
          if (gameScore > playerHighScore) {
            console.log(`🎮 New high score from game: ${gameScore} > ${playerHighScore}`);
            
            // Direct call to save the score
            saveScore(address, gameScore)
              .then(result => {
                console.log(`🎮 Successfully saved new high score: ${result}`);
                
                // Force a refresh of the UI
                setPlayerHighScore(gameScore);
                setHighScore(gameScore);
                
                // Also update localStorage
                localStorage.setItem(`highScore_${address.toLowerCase()}`, gameScore);
              })
              .catch(err => {
                console.error('🎮 Failed to save high score:', err);
              });
          } else {
            console.log(`🎮 Score ${gameScore} not higher than current high score ${playerHighScore}`);
          }
        }
      }
      
      // Handle bundle jumps messages (they may also contain scores)
      if (type === 'BUNDLE_JUMPS' && data) {
        console.log('🎮 Bundle request received:', data);
        
        const bundleScore = data.score;
        if (bundleScore && bundleScore > 0) {
          console.log(`🎮 Bundle includes score: ${bundleScore}`);
          
          // Also check if this is a new high score
          if (bundleScore > playerHighScore) {
            console.log(`🎮 Bundle has new high score: ${bundleScore} > ${playerHighScore}`);
            
            // Save the high score
            saveScore(address, bundleScore)
              .then(() => {
                console.log(`🎮 Saved bundle high score: ${bundleScore}`);
                setPlayerHighScore(bundleScore);
              })
              .catch(err => {
                console.error('🎮 Error saving bundle score:', err);
              });
          }
        }
      }
    };
    
    window.addEventListener('message', handleGameMessages);
    return () => window.removeEventListener('message', handleGameMessages);
  }, [isConnected, address, playerHighScore]);

  // Update the NFT verification logic with better error handling
  const checkNFT = async (address) => {
    try {
      setIsCheckingNFT(true);
      
      if (!address || !provider) {
        console.log('Missing address or provider for NFT check');
        setHasNFT(false);
        return;
      }
      
      // Complete ABI for the NFT contract's hasMinted function
      const nftContractABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function hasMinted(address) view returns (bool)",
        "function ownerOf(uint256 tokenId) view returns (address)"
      ];
      
      const nftContractAddress = '0xbee3b1b8e62745f5e322a2953b365ef474d92d7b';
      const nftContract = new ethers.Contract(
        nftContractAddress,
        nftContractABI,
        provider
      );
      
      // First try the hasMinted function
      try {
        const hasMinted = await nftContract.hasMinted(address);
        console.log('NFT check result:', hasMinted);
        setHasNFT(hasMinted);
        return;
      } catch (contractError) {
        console.warn('hasMinted check failed, falling back to balanceOf:', contractError);
        
        // Fallback to checking balanceOf
        const balance = await nftContract.balanceOf(address);
        const hasNFT = balance.gt(0);
        console.log('NFT balance check result:', hasNFT, 'Balance:', balance.toString());
        setHasNFT(hasNFT);
      }
      
    } catch (error) {
      console.error('Error checking NFT:', error);
      setHasNFT(false);
    } finally {
      setIsCheckingNFT(false);
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