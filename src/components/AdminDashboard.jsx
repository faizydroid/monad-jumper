import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import './AdminDashboard.css';
import AdminLinkGenerator from './AdminLinkGenerator';
import { createClient } from '@supabase/supabase-js';
import { usePublicClient, useWalletClient } from 'wagmi';
import { parseEther } from 'viem';
import { supabase } from '../lib/supabaseClient';

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
  
  const [gameStats, setGameStats] = useState({
    totalUsers: 0,
    totalJumps: 0,
    totalMints: 0,
    totalRevenue: 0
  });
  
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  // Log tables on load to help debug
  useEffect(() => {
    logTableInfo();
  }, []);
  
  // Update the fetchGameStats function to fetch jumps from the jumps table
  useEffect(() => {
    async function fetchGameStats() {
      try {
        setLoading(true);
        
        // First, try to get users data
        const tablesToTry = ['players', 'users', 'player', 'user', 'profiles'];
        
        let userData = [];
        let userError = null;
        
        // Try each table name until we find user data
        for (const tableName of tablesToTry) {
          const { data, error } = await supabase
            .from(tableName)
            .select('*');
          
          if (!error && data && data.length > 0) {
            userData = data;
            console.log(`Found user data in table ${tableName}:`, userData.length);
            break;
          } else {
            userError = error;
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
        
        // Update statistics
        setGameStats({
          totalUsers: userData.length,
          totalJumps,
          totalMints,
          totalRevenue
        });
        setPlayers(userData);
        setError(null);
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
      
      <div className="admin-stats-container">
        <h2>Game Statistics</h2>
        <div className="stats-row">
          <div className="stat-card">
            <h3>Total Registered Users</h3>
            <div className="stat-value">{gameStats.totalUsers}</div>
          </div>
          
          <div className="stat-card">
            <h3>Total Jumps (All Users)</h3>
            <div className="stat-value">{gameStats.totalJumps}</div>
          </div>
          
          <div className="stat-card">
            <h3>Total NFTs Minted</h3>
            <div className="stat-value">{gameStats.totalMints}</div>
          </div>
          
          <div className="stat-card">
            <h3>Total Revenue (MON)</h3>
            <div className="stat-value">{gameStats.totalRevenue}</div>
          </div>
        </div>
      </div>
   
      
      <div className="admin-section contract-actions">
        <h2>Contract Management</h2>
        <div className="contract-balance">
          <h3>Current Contract Balance: {contractBalance.toFixed(4)} MON</h3>
        </div>
        
        <div className="withdraw-controls">
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
      
      <div className="admin-actions">
        <h2>Admin Actions</h2>
        <button 
          className="admin-button"
          onClick={() => window.location.href = '/'}
        >
          Return to Game
        </button>
      </div>
      
      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Transaction Statistics</h2>
          {isLoading ? (
            <div className="animate-pulse">Loading statistics...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800">Total Micro-Transactions</h3>
                <p className="text-3xl font-bold text-blue-600">{totalTransactions}</p>
                <p className="text-sm text-blue-500">Total jumps recorded on blockchain</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 