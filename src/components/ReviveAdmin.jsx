import React, { useState, useEffect } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import { supabase } from '../utils/supabaseClient';
import './ReviveAdmin.css';

// Revive contract address
const REVIVE_CONTRACT_ADDRESS = "0xe56a5d27bd9d27fcdf6beaab97a5faa8fcb53cf9";

export default function ReviveAdmin({ account }) {
  const [reviveStats, setReviveStats] = useState({
    totalRevives: 0,
    totalReviveValue: 0,
    reviveContractBalance: 0
  });
  const [reviveAttempts, setReviveAttempts] = useState([]);
  const [isReviveWithdrawing, setIsReviveWithdrawing] = useState(false);
  const [reviveWithdrawSuccess, setReviveWithdrawSuccess] = useState(null);
  const [reviveWithdrawError, setReviveWithdrawError] = useState(null);
  const [isContractOwner, setIsContractOwner] = useState(false);
  const [lastTxHash, setLastTxHash] = useState(null);
  
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  // Fetch revive stats on load
  useEffect(() => {
    fetchReviveStats();
    checkContractOwner();
  }, [publicClient, account]);
  
  // Function to fetch statistics about revives
  const fetchReviveStats = async () => {
    try {
      console.log('Fetching revive contract statistics...');
      
      // Fetch revive contract balance
      const balance = await publicClient.getBalance({
        address: REVIVE_CONTRACT_ADDRESS,
      });
      
      // Convert from wei to MON
      const balanceInMON = Number(balance) / 1e18;
      console.log('Revive contract balance:', balanceInMON, 'MON');
      
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
  
  // Check if current account is contract owner
  const checkContractOwner = async () => {
    if (!publicClient || !account) return;
    
    try {
      const ownerABI = [
        {
          "inputs": [],
          "name": "owner",
          "outputs": [{"type": "address"}],
          "stateMutability": "view",
          "type": "function"
        }
      ];
      
      // Get contract owner
      const contractOwner = await publicClient.readContract({
        address: REVIVE_CONTRACT_ADDRESS,
        abi: ownerABI,
        functionName: 'owner'
      });
      
      console.log("Contract owner:", contractOwner);
      console.log("Current account:", account);
      
      // Check if current account is owner
      setIsContractOwner(contractOwner.toLowerCase() === account.toLowerCase());
    } catch (error) {
      console.error("Error checking contract owner:", error);
      setIsContractOwner(false);
    }
  };
  
  // Function to withdraw funds from the ReviveContract
  const handleReviveWithdraw = async () => {
    if (!walletClient) {
      setReviveWithdrawError("Wallet not connected correctly.");
      return;
    }
    
    // Don't allow non-owners to even try
    if (!isContractOwner) {
      setReviveWithdrawError("Only the contract owner can withdraw funds");
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
      
      // Store transaction hash
      setLastTxHash(txHash);
      
      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log("Transaction receipt:", receipt);
      
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
  
  return (
    <div className="admin-section contract-info">
      <h3>Revive Contract Information</h3>
      
      <div className="contract-stats-grid">
        <div className="stat-card">
          <h4>Total Revives</h4>
          <div className="stat-value">{formatNumber(reviveStats.totalRevives)}</div>
        </div>
        
        <div className="stat-card">
          <h4>Total Revive Value</h4>
          <div className="stat-value">{formatNumber(reviveStats.totalReviveValue)} MON</div>
        </div>
        
        <div className="stat-card">
          <h4>Revive Contract Balance</h4>
          <div className="stat-value">{formatNumber(reviveStats.reviveContractBalance)} MON</div>
        </div>

        <div className="stat-card">
          <h4>Contract Address</h4>
          <div className="contract-address">{REVIVE_CONTRACT_ADDRESS}</div>
        </div>
      </div>
    
      <div className="withdraw-section">
        <h4>Revive Contract Management</h4>
        
        <div className="ownership-status">
          {isContractOwner ? 
            <span className="owner-badge">✓ You are the contract owner</span> : 
            <span className="not-owner-badge">⚠️ You are not the contract owner</span>
          }
        </div>
        
        <button 
          className="admin-button withdraw-button"
          onClick={handleReviveWithdraw}
          disabled={isReviveWithdrawing || reviveStats.reviveContractBalance <= 0 || !isContractOwner}
        >
          {isReviveWithdrawing ? 'Withdrawing...' : 'Withdraw Funds from Revive Contract'}
        </button>
        
        {!isContractOwner && reviveStats.reviveContractBalance > 0 && (
          <div className="owner-warning">
            Only the contract owner can withdraw these funds
          </div>
        )}
        
        {reviveWithdrawSuccess && (
          <div className="withdraw-success">
            {reviveWithdrawSuccess}
          </div>
        )}
        
        {reviveWithdrawError && (
          <div className="withdraw-error">
            {reviveWithdrawError}
          </div>
        )}
        
        {lastTxHash && (
          <div className="tx-hash">
            <span>Transaction: </span>
            <a 
              href={`https://explorer.monad.xyz/tx/${lastTxHash}`} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              {lastTxHash.substring(0, 8)}...{lastTxHash.substring(58)}
            </a>
          </div>
        )}
      </div>

      <div className="revive-attempts-section">
        <h4>Revive Attempts</h4>
        {reviveAttempts.length > 0 ? (
          <div className="history-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Wallet Address</th>
                  <th>Amount Paid</th>
                  <th>Score</th>
                  <th>Jumps</th>
                </tr>
              </thead>
              <tbody>
                {reviveAttempts.map((attempt, index) => (
                  <tr key={index}>
                    <td>{formatDate(attempt.created_at || attempt.timestamp)}</td>
                    <td>{attempt.wallet_address?.substring(0, 6)}...{attempt.wallet_address?.substring(38)}</td>
                    <td>{attempt.price_paid || 0.5} MON</td>
                    <td>{attempt.score_at_revive || 'N/A'}</td>
                    <td>{attempt.jumps_at_revive || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No revive attempts recorded yet.</p>
        )}
      </div>
    </div>
  );
} 