import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import './AdminDashboard.css';
import AdminLinkGenerator from './AdminLinkGenerator';
import { createClient } from '@supabase/supabase-js';
import { usePublicClient, useWalletClient } from 'wagmi';
import { parseEther } from 'viem';
import { supabase } from '../lib/supabaseClient';
import { EncryptedStorageService } from '../services/EncryptedStorageService';
import ReviveAdmin from './ReviveAdmin';

// Log the available tables to help debug
async function logTableInfo() {
  try {
    console.log("Checking available tables in Supabase");
    const { data, error } = await supabase.rpc('get_tables');
    if (error) {
      console.error('Error fetching tables:', error);
    } else {
      console.log('Available tables:', data);
    }
  } catch (e) {
    console.error('Cannot check tables:', e);
  }
}

export default function AdminDashboard() {
  const { account } = useWeb3();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(null);
  const [withdrawError, setWithdrawError] = useState(null);
  const [contractBalance, setContractBalance] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchUsername, setSearchUsername] = useState('');
  const [userSearchResults, setUserSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const [gameStats, setGameStats] = useState({
    totalUsers: 0,
    totalJumps: 0,
    totalMints: 0,
    totalRevenue: 0
  });
  
  const [timeStats, setTimeStats] = useState({
    users: {
      hourly: 0,
      daily: 0,
      weekly: 0,
      monthly: 0,
      allTime: 0
    },
    jumps: {
      hourly: 0,
      daily: 0,
      weekly: 0, 
      monthly: 0,
      allTime: 0
    }
  });
  
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  // Add Revive contract states
  const [reviveStats, setReviveStats] = useState({
    totalRevives: 0,
    totalReviveValue: 0,
    reviveContractBalance: 0
  });
  const [isReviveWithdrawing, setIsReviveWithdrawing] = useState(false);
  const [reviveWithdrawSuccess, setReviveWithdrawSuccess] = useState(null);
  const [reviveWithdrawError, setReviveWithdrawError] = useState(null);
  const [reviveAttempts, setReviveAttempts] = useState([]);
  
  // ReviveContract address
  const REVIVE_CONTRACT_ADDRESS = "0xe56a5d27bd9d27fcdf6beaab97a5faa8fcb53cf9";
  console.log("Admin panel using ReviveContract address:", REVIVE_CONTRACT_ADDRESS);
  
  // Log tables on load to help debug
  useEffect(() => {
    logTableInfo();
  }, []);
  
  // Add effect to fetch revive stats
  useEffect(() => {
    fetchReviveStats();
  }, [publicClient]);
  
  // Update the fetchGameStats function to fetch jumps from the jumps table
  useEffect(() => {
    async function fetchGameStats() {
      try {
        setLoading(true);
        
        // First, try to get users data
        const tablesToTry = ['players', 'users', 'player', 'user', 'profiles'];
        
        let userData = [];
        let userError = null;
        let totalUserCount = 0;
        
        // Try each table name until we find user data
        for (const tableName of tablesToTry) {
          // First get the total count
          const { count, error: countError } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
          
          if (!countError && count !== null) {
            console.log(`Total users in ${tableName}: ${count}`);
            totalUserCount = count;
            
            // Now fetch the data (with pagination if needed)
            const { data, error } = await supabase
              .from(tableName)
              .select('*')
              .limit(1000); // We'll just get the first 1000 for display
          
          if (!error && data && data.length > 0) {
            userData = data;
              console.log(`Fetched ${data.length} users out of ${totalUserCount} total in ${tableName}`);
            break;
            }
          } else if (countError) {
            userError = countError;
          }
        }
        
        // Next, fetch jumps data from the jumps table
        let totalJumps = 0;
        try {
          // Fetch all jumps data from the dedicated jumps table
          const { data: jumpsData, error: jumpsError } = await supabase
            .from('jumps')
            .select('count');
          
          if (jumpsError) {
            console.error("Error fetching jumps:", jumpsError);
          } else if (jumpsData && jumpsData.length > 0) {
            console.log(`Found ${jumpsData.length} jump records`);
            // Sum up all jump counts
            totalJumps = jumpsData.reduce((sum, record) => sum + (record.count || 0), 0);
            console.log("Total jumps from jumps table:", totalJumps);
          } else {
            console.log("No jump records found in jumps table");
            
            // Fallback: Try to get jumps from user data as before
            if (userData.length > 0) {
              userData.forEach(player => {
                if (typeof player.jumps === 'number') totalJumps += player.jumps;
                else if (typeof player.jump_count === 'number') totalJumps += player.jump_count;
                else if (typeof player.jumpCount === 'number') totalJumps += player.jumpCount;
                else if (typeof player.score === 'number') totalJumps += player.score;
              });
              console.log("Calculated total jumps from user data:", totalJumps);
            }
          }
        } catch (jumpsError) {
          console.error("Error processing jumps data:", jumpsError);
        }
        
        // Rest of your existing code for fetching NFT data
        let totalMints = 0;
        let totalRevenue = 0;
        
        try {
          const nftAddress = import.meta.env.VITE_CHARACTER_CONTRACT_ADDRESS;
          console.log("NFT contract address:", nftAddress);
          
          if (nftAddress && nftAddress !== "0x0000000000000000000000000000000000000000") {
            // Get token supply
            const totalSupply = await publicClient.readContract({
              address: nftAddress,
              abi: [
                {
                  name: 'totalSupply',
                  type: 'function',
                  stateMutability: 'view',
                  inputs: [],
                  outputs: [{ type: 'uint256' }]
                }
              ],
              functionName: 'totalSupply'
            });
            
            console.log("NFT total supply:", totalSupply);
            totalMints = Number(totalSupply || 0);
            totalRevenue = totalMints; // 1 MON per mint
          } else {
            console.log("NFT address is invalid, skipping contract call");
          }
        } catch (contractError) {
          console.error("Error fetching contract data:", contractError);
          
          // Try with a simplified ABI as fallback
          try {
            const nftAddress = import.meta.env.VITE_CHARACTER_CONTRACT_ADDRESS;
            console.log("Retrying with simplified ABI");
            
            const totalSupply = await publicClient.readContract({
              address: nftAddress,
              abi: [{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}],
              functionName: 'totalSupply'
            });
            
            console.log("NFT total supply (retry):", totalSupply);
            totalMints = Number(totalSupply || 0);
            totalRevenue = totalMints;
          } catch (retryError) {
            console.error("Retry failed:", retryError);
          }
        }
        
        // Also fetch contract balance
        try {
          const nftAddress = import.meta.env.VITE_CHARACTER_CONTRACT_ADDRESS;
          if (nftAddress) {
            const balance = await publicClient.getBalance({
              address: nftAddress,
            });
            
            console.log("Contract balance:", balance);
            // Convert from wei to MON
            setContractBalance(Number(balance) / 1e18);
          }
        } catch (balanceError) {
          console.error("Error fetching contract balance:", balanceError);
        }
        
        // Update statistics with the correct total count
        setGameStats({
          totalUsers: totalUserCount || userData.length,
          totalJumps,
          totalMints,
          totalRevenue
        });
        setPlayers(userData);
        setError(null);
        
        // Fetch time-based statistics
        fetchTimeBasedStats(userData, totalUserCount);
      } catch (error) {
        console.error("Error fetching game stats:", error);
        setError("Error loading data: " + error.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchGameStats();
  }, [publicClient]);
  
  useEffect(() => {
    fetchTransactionStats();
  }, []);

  // Function to fetch time-based statistics
  const fetchTimeBasedStats = async (userData, totalUserCount) => {
    try {
      console.log('Fetching time-based statistics...');
      
      const now = new Date();
      const hourAgo = new Date(now.getTime() - (60 * 60 * 1000));
      const dayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      const weekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      const monthAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      // Format dates for database queries
      const hourAgoStr = hourAgo.toISOString();
      const dayAgoStr = dayAgo.toISOString();
      const weekAgoStr = weekAgo.toISOString();
      const monthAgoStr = monthAgo.toISOString();
      
      // Try to get time-based user counts
      let hourlyUsers = 0, dailyUsers = 0, weeklyUsers = 0, monthlyUsers = 0;
      let userTable = '';
      
      // Find the right table for users
      const tablesToTry = ['users', 'players', 'user', 'player', 'profiles'];
      for (const table of tablesToTry) {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
          
        if (count && count > 0) {
          userTable = table;
          break;
        }
      }
      
      if (userTable) {
        // Try to get users by creation time if the column exists
        const createdFields = ['created_at', 'created', 'join_date', 'joined_at', 'registration_date'];
        let createdField = null;
        
        // Get sample user to check fields
        const { data: sampleUser } = await supabase
          .from(userTable)
          .select('*')
          .limit(1)
          .single();
          
        if (sampleUser) {
          for (const field of createdFields) {
            if (sampleUser[field]) {
              createdField = field;
              break;
            }
          }
        }
        
        if (createdField) {
          // Now we can query by time periods
          const { count: hourCount } = await supabase
            .from(userTable)
            .select('*', { count: 'exact', head: true })
            .gte(createdField, hourAgoStr);
            
          const { count: dayCount } = await supabase
            .from(userTable)
            .select('*', { count: 'exact', head: true })
            .gte(createdField, dayAgoStr);
            
          const { count: weekCount } = await supabase
            .from(userTable)
            .select('*', { count: 'exact', head: true })
            .gte(createdField, weekAgoStr);
            
          const { count: monthCount } = await supabase
            .from(userTable)
            .select('*', { count: 'exact', head: true })
            .gte(createdField, monthAgoStr);
            
          hourlyUsers = hourCount || 0;
          dailyUsers = dayCount || 0;
          weeklyUsers = weekCount || 0;
          monthlyUsers = monthCount || 0;
        } else {
          console.log('No creation timestamp field found in user table');
        }
      }
      
      // Try to get time-based jump counts
      let hourlyJumps = 0, dailyJumps = 0, weeklyJumps = 0, monthlyJumps = 0, allTimeJumps = 0;
      
      // Check if jumps table has timestamp
      const { data: sampleJump } = await supabase
        .from('jumps')
        .select('*')
        .limit(1)
        .single();
        
      if (sampleJump) {
        const timeField = sampleJump.created_at ? 'created_at' : 
                          sampleJump.timestamp ? 'timestamp' : 
                          sampleJump.recorded_at ? 'recorded_at' : null;
        
        if (timeField) {
          // Query jumps by time periods
          const { data: hourJumps } = await supabase
            .from('jumps')
            .select('count')
            .gte(timeField, hourAgoStr);
            
          const { data: dayJumps } = await supabase
            .from('jumps')
            .select('count')
            .gte(timeField, dayAgoStr);
            
          const { data: weekJumps } = await supabase
            .from('jumps')
            .select('count')
            .gte(timeField, weekAgoStr);
            
          const { data: monthJumps } = await supabase
            .from('jumps')
            .select('count')
            .gte(timeField, monthAgoStr);
            
          const { data: allJumps } = await supabase
            .from('jumps')
            .select('count');
          
          // Sum up jump counts for each time period
          hourlyJumps = hourJumps ? hourJumps.reduce((sum, record) => sum + (record.count || 0), 0) : 0;
          dailyJumps = dayJumps ? dayJumps.reduce((sum, record) => sum + (record.count || 0), 0) : 0;
          weeklyJumps = weekJumps ? weekJumps.reduce((sum, record) => sum + (record.count || 0), 0) : 0;
          monthlyJumps = monthJumps ? monthJumps.reduce((sum, record) => sum + (record.count || 0), 0) : 0;
          allTimeJumps = allJumps ? allJumps.reduce((sum, record) => sum + (record.count || 0), 0) : 0;
        }
      }
      
      // Update time stats state
      setTimeStats({
        users: {
          hourly: hourlyUsers,
          daily: dailyUsers,
          weekly: weeklyUsers,
          monthly: monthlyUsers,
          allTime: totalUserCount
        },
        jumps: {
          hourly: hourlyJumps,
          daily: dailyJumps,
          weekly: weeklyJumps,
          monthly: monthlyJumps,
          allTime: allTimeJumps || gameStats.totalJumps
        }
      });
      
    } catch (error) {
      console.error('Error fetching time-based stats:', error);
    }
  };

  const fetchTransactionStats = async () => {
    try {
      console.log('📊 Fetching transaction statistics...');
      
      // Get total jumps across all users
      const { data: jumpData, error: jumpError } = await supabase
        .from('jumps')
        .select('count')
        .not('count', 'eq', 0);

      if (jumpError) throw jumpError;

      // Calculate total transactions
      const totalJumps = jumpData.reduce((sum, record) => sum + record.count, 0);
      console.log('📊 Total jumps found:', totalJumps);
      
      setTotalTransactions(totalJumps);
    } catch (error) {
      console.error('Error fetching transaction stats:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Search user by username
  const handleUserSearch = async () => {
    if (!searchUsername) return;
    
    setSearchLoading(true);
    setUserSearchResults(null);
    
    try {
      console.log(`Searching for user: ${searchUsername}`);
      
      // Try each table name until we find the user
      const tablesToTry = ['users', 'players', 'user', 'player', 'profiles'];
      let userData = null;
      
      for (const tableName of tablesToTry) {
        // Try both username and wallet_address fields
        const { data: nameData, error: nameError } = await supabase
          .from(tableName)
          .select('*')
          .ilike('username', `%${searchUsername}%`)
          .limit(1);
        
        if (!nameError && nameData && nameData.length > 0) {
          userData = nameData[0];
          break;
        }
        
        // Try wallet_address if username search failed
        const { data: addressData, error: addressError } = await supabase
          .from(tableName)
          .select('*')
          .ilike('wallet_address', `%${searchUsername}%`)
          .limit(1);
          
        if (!addressError && addressData && addressData.length > 0) {
          userData = addressData[0];
          break;
        }
      }
      
      if (userData) {
        console.log('User found:', userData);
        
        // Get user's jump history
        const userWallet = userData.wallet_address || userData.address;
        let jumpHistory = [];
        
        if (userWallet) {
          const { data: jumpData } = await supabase
            .from('jumps')
            .select('*')
            .eq('wallet_address', userWallet.toLowerCase())
            .order('created_at', { ascending: false });
            
          if (jumpData) {
            jumpHistory = jumpData;
          }
        }
        
        // Get user's game history if it exists
        let gameHistory = [];
        const { data: games } = await supabase
          .from('games')
          .select('*')
          .eq('wallet_address', userWallet?.toLowerCase())
          .order('played_at', { ascending: false })
          .limit(10);
          
        if (games && games.length > 0) {
          gameHistory = games;
        }

        // Try to fetch data from the encrypted storage
        let encryptedData = null;
        let highScore = 0;
        let gamesPlayed = 0;
        
        try {
          if (publicClient && userWallet) {
            // First, let's check Supabase directly for game-related data
            console.log('Fetching game data from Supabase directly for:', userWallet);
            
            // Get high score from scores table
            const { data: scoreData, error: scoreError } = await supabase
              .from('scores')
              .select('score')
              .eq('wallet_address', userWallet.toLowerCase())
              .order('score', { ascending: false })
              .limit(1)
              .single();
              
            if (!scoreError && scoreData) {
              console.log('High score found in Supabase:', scoreData.score);
              highScore = scoreData.score;
            } else {
              console.log('No high score found in Supabase:', scoreError?.message);
            }
            
            // Get games played count from games table - multiple ways to handle different data structures
            // First check if there's a count field in the games table
            const { data: gamesData, error: gamesError } = await supabase
              .from('games')
              .select('count')
              .eq('wallet_address', userWallet.toLowerCase())
              .single();

            if (!gamesError && gamesData && gamesData.count) {
              console.log('Games played count found in Supabase:', gamesData.count);
              gamesPlayed = parseInt(gamesData.count) || 0;
            } else {
              console.log('No games count record found, checking game history entries');
              
              // Next try to count the records in the games table
              try {
                const { count, error: countError } = await supabase
                  .from('games')
                  .select('*', { count: 'exact', head: true })
                  .eq('wallet_address', userWallet.toLowerCase());
                  
                if (!countError && count > 0) {
                  console.log('Games count using exact count:', count);
                  gamesPlayed = count;
                } else {
                  // Try getting all game records and count them
                  const { data: allGames, error: allGamesError } = await supabase
                    .from('games')
                    .select('id')
                    .eq('wallet_address', userWallet.toLowerCase());
                    
                  if (!allGamesError && allGames && allGames.length > 0) {
                    console.log('Games count by fetching all records:', allGames.length);
                    gamesPlayed = allGames.length;
                  } else {
                    // Check if the user data has a games_played field
                    if (userData.games_played) {
                      console.log('Games played field in user data:', userData.games_played);
                      gamesPlayed = parseInt(userData.games_played) || 0;
                    } else if (userData.game_count) {
                      console.log('Game count field in user data:', userData.game_count);
                      gamesPlayed = parseInt(userData.game_count) || 0;
                    } else {
                      // Check game_sessions if it exists
                      try {
                        const { count: sessionCount, error: sessionError } = await supabase
                          .from('game_sessions')
                          .select('*', { count: 'exact', head: true })
                          .eq('wallet_address', userWallet.toLowerCase());
                          
                        if (!sessionError && sessionCount > 0) {
                          console.log('Games played from game_sessions:', sessionCount);
                          gamesPlayed = sessionCount;
                        } else {
                          console.log('No games played data found in any source');
                          gamesPlayed = 0;
                        }
                      } catch (sessionError) {
                        console.warn('Error checking game_sessions:', sessionError);
                        gamesPlayed = 0;
                      }
                    }
                  }
                }
              } catch (countError) {
                console.error('Error counting games:', countError);
                gamesPlayed = 0;
              }
            }
            
            console.log('Attempting to fetch from encrypted storage for:', userWallet);
            
            // Get the encrypted storage contract address
            const encryptedStorageAddress = import.meta.env.VITE_REACT_APP_ENCRYPTED_STORAGE_ADDRESS;
            console.log('Encrypted storage address:', encryptedStorageAddress);
            
            if (!encryptedStorageAddress) {
              console.warn('No encrypted storage address configured');
            } else {
              // Create a simple provider wrapper for compatibility with the EncryptedStorageService
              const providerWrapper = {
                getSigner: () => ({
                  getAddress: async () => account,
                  signMessage: async (message) => {
                    // This is just a placeholder - we don't need to sign anything
                    // for read-only operations
                    return '';
                  }
                })
              };
              
              // Create an instance of the EncryptedStorageService
              const encryptedStorageService = new EncryptedStorageService(
                providerWrapper,
                encryptedStorageAddress
              );
              
              // Override the contract for read-only operations
              encryptedStorageService.contract = {
                playerHasData: async (address) => {
                  // Use publicClient to call the contract
                  return await publicClient.readContract({
                    address: encryptedStorageAddress,
                    abi: [
                      {
                        name: 'playerHasData',
                        type: 'function',
                        stateMutability: 'view',
                        inputs: [{ type: 'address', name: 'player' }],
                        outputs: [{ type: 'bool' }]
                      }
                    ],
                    functionName: 'playerHasData',
                    args: [address]
                  });
                },
                getPlayerData: async (address) => {
                  // Use publicClient to call the contract
                  const result = await publicClient.readContract({
                    address: encryptedStorageAddress,
                    abi: [
                      {
                        name: 'getPlayerData',
                        type: 'function',
                        stateMutability: 'view',
                        inputs: [{ type: 'address', name: 'player' }],
                        outputs: [
                          { type: 'string', name: 'encryptedData' },
                          { type: 'uint256', name: 'timestamp' },
                          { type: 'uint256', name: 'version' },
                          { type: 'string', name: 'metadata' }
                        ]
                      }
                    ],
                    functionName: 'getPlayerData',
                    args: [address]
                  });
                  
                  return {
                    encryptedData: result[0],
                    timestamp: result[1],
                    version: result[2],
                    metadata: result[3]
                  };
                }
              };
              
              // Get player data from the encrypted storage contract
              console.log('Checking if player has data');
              const hasData = await encryptedStorageService.hasData(userWallet);
              console.log('Player has data:', hasData);
              
              if (hasData) {
                const playerData = await encryptedStorageService.getPlayerData(userWallet);
                console.log('Player data retrieved:', playerData);
                
                if (playerData && playerData.metadata) {
                  try {
                    // The metadata might contain public game stats in JSON format
                    const metadata = JSON.parse(playerData.metadata);
                    console.log('Player metadata:', metadata);
                    
                    // Only use encrypted storage data if it's higher than what we found in Supabase
                    if (metadata.highScore && Number(metadata.highScore) > highScore) {
                      highScore = Number(metadata.highScore);
                    }
                    if (metadata.gamesPlayed && Number(metadata.gamesPlayed) > gamesPlayed) {
                      gamesPlayed = Number(metadata.gamesPlayed);
                    }
                  } catch (parseError) {
                    console.warn('Could not parse player metadata:', parseError);
                  }
                }
              }
            }
          }
        } catch (encryptedStorageError) {
          console.error('Error fetching encrypted storage data:', encryptedStorageError);
        }
        
        // Set the full user data with additional stats
        console.log('Setting user search results with:', {
          userData,
          jumpHistory: jumpHistory.length, 
          gameHistory: gameHistory.length,
          totalJumps: jumpHistory.reduce((sum, record) => sum + (record.count || 0), 0),
          gamesPlayed,
          highScore
        });

        setUserSearchResults({
          ...userData,
          jumpHistory,
          gameHistory,
          totalJumps: jumpHistory.reduce((sum, record) => sum + (record.count || 0), 0),
          totalGames: gameHistory.length || gamesPlayed || 0,
          high_score: highScore || userData.high_score || 0,
          games_played: gamesPlayed || gameHistory.length || 0
        });
      } else {
        console.log('User not found');
        setUserSearchResults({ notFound: true });
      }
    } catch (error) {
      console.error('Error searching for user:', error);
      setUserSearchResults({ error: error.message });
    } finally {
      setSearchLoading(false);
    }
  };
  
  // Function to withdraw funds from the contract
  const handleWithdrawFunds = async () => {
    if (!walletClient) {
      setWithdrawError("Wallet not connected correctly.");
      return;
    }
    
    const nftAddress = import.meta.env.VITE_CHARACTER_CONTRACT_ADDRESS;
    if (!nftAddress) {
      setWithdrawError("Contract address not configured.");
      return;
    }
    
    setWithdrawing(true);
    setWithdrawSuccess(null);
    setWithdrawError(null);
    
    try {
      console.log("Attempting to withdraw funds from contract:", nftAddress);
      
      // Try different common withdraw function names
      const withdrawFunctionOptions = [
        {
          name: 'withdraw',
          inputs: []
        },
        {
          name: 'withdrawFunds',
          inputs: []
        },
        {
          name: 'withdrawAll',
          inputs: []
        }
      ];
      
      let txHash;
      let errorMessages = [];
      
      // Try each function name until one works
      for (const func of withdrawFunctionOptions) {
        try {
          console.log(`Trying withdraw function: ${func.name}`);
          
          txHash = await walletClient.writeContract({
            address: nftAddress,
            abi: [
              {
                name: func.name,
                type: 'function',
                stateMutability: 'nonpayable',
                inputs: func.inputs,
                outputs: []
              }
            ],
            functionName: func.name
          });
          
          console.log(`Withdraw transaction sent: ${txHash}`);
          break; // Exit the loop if successful
        } catch (funcError) {
          console.error(`Error with ${func.name}:`, funcError.message || "Unknown error");
          // Safely convert any BigInt values in the error message
          errorMessages.push(`${func.name}: ${String(funcError.message || "Unknown error")}`);
        }
      }
      
      if (!txHash) {
        throw new Error(`Failed to withdraw funds. Tried multiple methods without success.`);
      }
      
      // Wait for transaction confirmation
      console.log("Waiting for transaction confirmation...");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log("Withdraw transaction confirmed");
      
      // Safely check status
      if (receipt && receipt.status === "success") {
        setWithdrawSuccess("Funds successfully withdrawn!");
        
        // Refresh contract balance
        const newBalance = await publicClient.getBalance({
          address: nftAddress,
        });
        
        // Safely convert BigInt to number
        setContractBalance(Number(newBalance) / 1e18);
      } else {
        throw new Error("Transaction failed or was reverted");
      }
    } catch (error) {
      console.error("Withdraw error:", String(error));
      setWithdrawError(`Failed to withdraw: ${String(error.message || error)}`);
    } finally {
      setWithdrawing(false);
    }
  };
  
  // Format numbers for display
  const formatNumber = (num) => {
    return num?.toLocaleString() || '0';
  };
  
  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch (e) {
      return dateStr;
    }
  };
  
  // Function to fetch statistics about revives
  const fetchReviveStats = async () => {
    try {
      console.log('Fetching revive contract statistics...');
      
      // Fetch revive contract balance
      console.log('Getting balance for contract address:', REVIVE_CONTRACT_ADDRESS);
      let balanceInMON = 0;
      try {
        const balance = await publicClient.getBalance({
          address: REVIVE_CONTRACT_ADDRESS,
        });
        
        console.log('Raw balance result:', balance.toString());
        
        // Convert from wei to MON
        balanceInMON = Number(balance) / 1e18;
        console.log('Revive contract balance:', balanceInMON, 'MON');
      } catch (balanceError) {
        console.error('Error fetching contract balance:', balanceError);
      }
      
      // Fetch revive attempts from database
      let totalRevives = 0;
      let totalReviveValue = 0;
      
      try {
        // Check if revive_attempts table exists
        const { data: reviveAttemptsData, error: reviveError } = await supabase
          .from('revive_attempts')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (reviveError) {
          console.error('Error fetching revive attempts:', reviveError);
        } else if (reviveAttemptsData) {
          console.log(`Found ${reviveAttemptsData.length} revive attempts`);
          
          // Store all revive attempts
          setReviveAttempts(reviveAttemptsData);
          
          totalRevives = reviveAttemptsData.length;
          
          // Calculate total value
          totalReviveValue = reviveAttemptsData.reduce((sum, record) => 
            sum + (record.price_paid || 0.5), 0);
        }
      } catch (dbError) {
        console.error('Error fetching revive attempts from database:', dbError);
      }
      
      // Update stats
      setReviveStats({
        totalRevives,
        totalReviveValue,
        reviveContractBalance: balanceInMON
      });
      
    } catch (error) {
      console.error('Error fetching revive stats:', error);
    }
  };
  
  // Function to withdraw funds from the ReviveContract
  const handleReviveWithdraw = async () => {
    if (!walletClient) {
      setReviveWithdrawError("Wallet not connected correctly.");
      return;
    }
    
    setIsReviveWithdrawing(true);
    setReviveWithdrawSuccess(null);
    setReviveWithdrawError(null);
    
    try {
      console.log("Attempting to withdraw funds from ReviveContract:", REVIVE_CONTRACT_ADDRESS);
      
      // ReviveContract ABI - only need the withdraw function
      const reviveContractABI = [
        {
          "inputs": [],
          "name": "withdraw",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ];
      
      // Create transaction
      const { request } = await publicClient.simulateContract({
        address: REVIVE_CONTRACT_ADDRESS,
        abi: reviveContractABI,
        functionName: 'withdraw',
        account: account
      });
      
      // Send transaction
      const txHash = await walletClient.writeContract(request);
      console.log(`Revive contract withdraw transaction submitted: ${txHash}`);
      
      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      if (receipt.status === "success") {
        setReviveWithdrawSuccess("Funds successfully withdrawn from ReviveContract!");
        
        // Refresh revive contract balance
        const newBalance = await publicClient.getBalance({
          address: REVIVE_CONTRACT_ADDRESS,
        });
        
        // Update state with new balance
        setReviveStats(prev => ({
          ...prev,
          reviveContractBalance: Number(newBalance) / 1e18
        }));
      } else {
        throw new Error("Transaction failed or was reverted");
      }
    } catch (error) {
      console.error("Withdraw error:", String(error));
      setReviveWithdrawError(`Failed to withdraw from ReviveContract: ${String(error.message || error)}`);
    } finally {
      setIsReviveWithdrawing(false);
    }
  };
  
  // Add function to check if contract exists
  const checkContractExists = async () => {
    if (!publicClient) return false;
    
    try {
      console.log('Checking if ReviveContract exists at:', REVIVE_CONTRACT_ADDRESS);
      
      // Try to get the code at the contract address
      const code = await publicClient.getBytecode({
        address: REVIVE_CONTRACT_ADDRESS,
      });
      
      // If code exists (not 0x or null), the contract exists
      const exists = code && code !== '0x';
      console.log('Contract exists:', exists, 'Code length:', code ? code.length : 0);
      
      if (!exists) {
        console.error('⚠️ WARNING: No contract found at the specified address!');
      }
      
      return exists;
    } catch (error) {
      console.error('Error checking contract existence:', error);
      return false;
    }
  };
  
  // Call this function in useEffect
  useEffect(() => {
    fetchReviveStats();
    checkContractExists();
  }, [publicClient]);
  
  if (!account) {
    return (
      <div className="admin-dashboard">
        <h2>Admin Dashboard</h2>
        <p>Please connect your wallet to access the admin dashboard.</p>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="admin-dashboard">
        <h2>Admin Dashboard</h2>
        <div className="admin-loading">Loading statistics...</div>
      </div>
    );
  }
  
  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard</h2>
      
      <AdminLinkGenerator />
      
      {error && (
        <div className="admin-error">
          <p>{error}</p>
          <p>Please check your Supabase database setup.</p>
        </div>
      )}
      
      <div className="admin-tabs">
        <button 
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Detailed Stats
        </button>
        <button 
          className={`tab-button ${activeTab === 'user' ? 'active' : ''}`}
          onClick={() => setActiveTab('user')}
        >
          User Search
        </button>
        <button 
          className={`tab-button ${activeTab === 'contract' ? 'active' : ''}`}
          onClick={() => setActiveTab('contract')}
        >
          NFT Contract
        </button>
        <button 
          className={`tab-button ${activeTab === 'revive' ? 'active' : ''}`}
          onClick={() => setActiveTab('revive')}
        >
          Revive Contract
        </button>
      </div>
      
      {activeTab === 'overview' && (
      <div className="admin-stats-container">
          <h2>Game Overview</h2>
        <div className="stats-row">
          <div className="stat-card">
            <h3>Total Registered Users</h3>
              <div className="stat-value">{formatNumber(gameStats.totalUsers)}</div>
          </div>
          
          <div className="stat-card">
            <h3>Total Jumps (All Users)</h3>
              <div className="stat-value">{formatNumber(gameStats.totalJumps)}</div>
          </div>
          
          <div className="stat-card">
            <h3>Total NFTs Minted</h3>
              <div className="stat-value">{formatNumber(gameStats.totalMints)}</div>
          </div>
          
          <div className="stat-card">
            <h3>Total Revenue (MON)</h3>
              <div className="stat-value">{formatNumber(gameStats.totalRevenue)}</div>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'stats' && (
        <div className="admin-stats-container">
          <div className="stats-section">
            <h3>Registered Players</h3>
            <div className="stats-grid">
              <div className="stat-card sm">
                <div className="stat-label">Last Hour</div>
                <div className="stat-value">{formatNumber(timeStats.users.hourly)}</div>
              </div>
              <div className="stat-card sm">
                <div className="stat-label">Last 24 Hours</div>
                <div className="stat-value">{formatNumber(timeStats.users.daily)}</div>
              </div>
              <div className="stat-card sm">
                <div className="stat-label">Last 7 Days</div>
                <div className="stat-value">{formatNumber(timeStats.users.weekly)}</div>
              </div>
              <div className="stat-card sm">
                <div className="stat-label">Last 30 Days</div>
                <div className="stat-value">{formatNumber(timeStats.users.monthly)}</div>
              </div>
              <div className="stat-card sm">
                <div className="stat-label">All Time</div>
                <div className="stat-value">{formatNumber(timeStats.users.allTime)}</div>
          </div>
        </div>
      </div>
   
          <div className="stats-section">
            <h3>Total Jumps</h3>
            <div className="stats-grid">
              <div className="stat-card sm">
                <div className="stat-label">Last Hour</div>
                <div className="stat-value">{formatNumber(timeStats.jumps.hourly)}</div>
              </div>
              <div className="stat-card sm">
                <div className="stat-label">Last 24 Hours</div>
                <div className="stat-value">{formatNumber(timeStats.jumps.daily)}</div>
              </div>
              <div className="stat-card sm">
                <div className="stat-label">Last 7 Days</div>
                <div className="stat-value">{formatNumber(timeStats.jumps.weekly)}</div>
              </div>
              <div className="stat-card sm">
                <div className="stat-label">Last 30 Days</div>
                <div className="stat-value">{formatNumber(timeStats.jumps.monthly)}</div>
              </div>
              <div className="stat-card sm">
                <div className="stat-label">All Time</div>
                <div className="stat-value">{formatNumber(timeStats.jumps.allTime)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'user' && (
        <div className="admin-user-search">
          <h3>Search User</h3>
          <div className="search-container">
            <input 
              type="text" 
              placeholder="Enter username or wallet address" 
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              onKeyUp={(e) => e.key === 'Enter' && handleUserSearch()}
            />
            <button 
              onClick={handleUserSearch}
              disabled={searchLoading || !searchUsername}
            >
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
          
          {userSearchResults && !userSearchResults.notFound && !userSearchResults.error && (
            <div className="user-results">
              <h3>User Details</h3>
              
              <div className="user-info-grid">
                <div className="user-info-item">
                  <span className="label">Username:</span>
                  <span className="value">{userSearchResults.username || 'N/A'}</span>
                </div>
                <div className="user-info-item">
                  <span className="label">Wallet Address:</span>
                  <span className="value">{userSearchResults.wallet_address || userSearchResults.address || 'N/A'}</span>
                </div>
                <div className="user-info-item">
                  <span className="label">Joined Date:</span>
                  <span className="value">{formatDate(userSearchResults.created_at || userSearchResults.join_date || userSearchResults.joined_at)}</span>
                </div>
                <div className="user-info-item">
                  <span className="label">Total Jumps:</span>
                  <span className="value">{formatNumber(userSearchResults.totalJumps)}</span>
                </div>
                <div className="user-info-item">
                  <span className="label">Games Played:</span>
                  <span className="value">{formatNumber(userSearchResults.games_played || userSearchResults.totalGames || 0)}</span>
                </div>
                <div className="user-info-item">
                  <span className="label">High Score:</span>
                  <span className="value">{formatNumber(userSearchResults.high_score || userSearchResults.score || 0)}</span>
                </div>
              </div>
              
              {userSearchResults.gameHistory && userSearchResults.gameHistory.length > 0 && (
                <div className="user-history">
                  <h4>Game History</h4>
                  <div className="history-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Score</th>
                          <th>Jumps</th>
                          <th>Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userSearchResults.gameHistory.map((game, index) => (
                          <tr key={index}>
                            <td>{formatDate(game.played_at || game.created_at)}</td>
                            <td>{formatNumber(game.score)}</td>
                            <td>{formatNumber(game.jumps)}</td>
                            <td>{game.duration ? `${game.duration}s` : 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {userSearchResults.jumpHistory && userSearchResults.jumpHistory.length > 0 && (
                <div className="user-history">
                  <h4>Jump History</h4>
                  <div className="history-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Jumps</th>
                          <th>Game Session</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userSearchResults.jumpHistory.map((jump, index) => (
                          <tr key={index}>
                            <td>{formatDate(jump.created_at || jump.timestamp)}</td>
                            <td>{formatNumber(jump.count)}</td>
                            <td>{jump.game_session_id || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {userSearchResults && userSearchResults.notFound && (
            <div className="user-not-found">
              <p>No user found with this username or wallet address.</p>
            </div>
          )}
          
          {userSearchResults && userSearchResults.error && (
            <div className="user-search-error">
              <p>Error searching for user: {userSearchResults.error}</p>
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'contract' && (
        <div className="admin-section contract-info">
          <h3>Contract Information</h3>
          
          <div className="contract-stats-grid">
            <div className="stat-card">
              <h4>Contract Address</h4>
              <div className="contract-address">{import.meta.env.VITE_CHARACTER_CONTRACT_ADDRESS || 'Not configured'}</div>
            </div>
            
            <div className="stat-card">
              <h4>Total NFTs Minted</h4>
              <div className="stat-value">{formatNumber(gameStats.totalMints)}</div>
            </div>
            
            <div className="stat-card">
              <h4>Total Transactions</h4>
              <div className="stat-value">{formatNumber(totalTransactions)}</div>
            </div>
            
            <div className="stat-card">
              <h4>Contract Balance</h4>
              <div className="stat-value">{contractBalance.toFixed(4)} MON</div>
            </div>
        </div>
        
          <div className="withdraw-section">
            <h4>Contract Management</h4>
          <button 
            className="admin-button withdraw-button"
            onClick={handleWithdrawFunds}
            disabled={withdrawing || contractBalance <= 0}
          >
            {withdrawing ? 'Withdrawing...' : 'Withdraw Funds to Owner'}
          </button>
          
          {withdrawSuccess && (
            <div className="withdraw-success">
              {withdrawSuccess}
            </div>
          )}
          
          {withdrawError && (
            <div className="withdraw-error">
              {withdrawError}
            </div>
          )}
        </div>
      </div>
      )}
      
      {activeTab === 'revive' && (
        <ReviveAdmin account={account} />
      )}
      
      <div className="admin-actions">
        <button 
          className="admin-button"
          onClick={() => window.location.href = '/'}
        >
          Return to Game
        </button>
      </div>
    </div>
  );
} 