import React, { useState, useEffect } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import { supabase } from '../lib/supabaseClient';
import { parseEther, formatEther } from 'viem';

const ReviveAdminPanel = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviveStats, setReviveStats] = useState({
    totalRevives: 0,
    uniqueUsers: 0,
    totalRevenue: 0,
    revivePrice: 0.5,
    contractBalance: 0
  });
  const [withdrawing, setWithdrawing] = useState(false);
  const [priceChanging, setPriceChanging] = useState(false);
  const [newPrice, setNewPrice] = useState('0.5');
  const [withdrawSuccess, setWithdrawSuccess] = useState(null);
  const [withdrawError, setWithdrawError] = useState(null);
  const [priceChangeSuccess, setPriceChangeSuccess] = useState(null);
  const [priceChangeError, setPriceChangeError] = useState(null);
  
  const REVIVE_CONTRACT_ADDRESS = '0xf8e81D47203A594245E36C48e151709F0C19fBe8';
  
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  useEffect(() => {
    fetchReviveStats();
  }, [publicClient]);
  
  const fetchReviveStats = async () => {
    try {
      setLoading(true);
      
      // Fetch data from the database
      const { data, error } = await supabase
        .from('revive_contract_view')
        .select('*')
        .maybeSingle();
      
      if (error) throw error;
      
      // Also fetch contract balance from the blockchain
      const balance = await publicClient.getBalance({
        address: REVIVE_CONTRACT_ADDRESS
      });
      
      // Try to get the revive price from the contract
      let revivePrice = 0.5;
      try {
        const price = await publicClient.readContract({
          address: REVIVE_CONTRACT_ADDRESS,
          abi: [
            {
              name: 'revivePrice',
              type: 'function',
              stateMutability: 'view',
              inputs: [],
              outputs: [{ type: 'uint256' }]
            }
          ],
          functionName: 'revivePrice'
        });
        
        revivePrice = Number(formatEther(price));
      } catch (e) {
        console.error("Error fetching revive price from contract:", e);
      }
      
      // Combine data from database and blockchain
      setReviveStats({
        totalRevives: data?.total_revives || 0,
        uniqueUsers: data?.unique_users || 0,
        totalRevenue: data?.total_revenue || 0,
        revivePrice: data?.revive_price || revivePrice,
        contractBalance: Number(formatEther(balance)) || 0
      });
      
      setError(null);
    } catch (err) {
      console.error("Error fetching revive stats:", err);
      setError("Error loading revive data: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleWithdraw = async () => {
    if (!walletClient || withdrawing) return;
    
    try {
      setWithdrawing(true);
      setWithdrawSuccess(null);
      setWithdrawError(null);
      
      const hash = await walletClient.writeContract({
        address: REVIVE_CONTRACT_ADDRESS,
        abi: [
          {
            name: 'withdraw',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [],
            outputs: []
          }
        ],
        functionName: 'withdraw'
      });
      
      console.log("Withdraw transaction sent:", hash);
      
      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      console.log("Withdraw transaction confirmed:", receipt);
      setWithdrawSuccess("Funds successfully withdrawn!");
      
      // Record withdrawal in database
      await supabase.rpc('record_contract_withdraw', {
        contract_addr: REVIVE_CONTRACT_ADDRESS,
        admin_addr: walletClient.account.address,
        amount: reviveStats.contractBalance,
        tx_hash: hash
      });
      
      // Refresh stats
      fetchReviveStats();
    } catch (error) {
      console.error("Error withdrawing funds:", error);
      setWithdrawError(error.message || "Failed to withdraw funds");
    } finally {
      setWithdrawing(false);
    }
  };
  
  const handlePriceChange = async () => {
    if (!walletClient || priceChanging || !newPrice) return;
    
    try {
      setPriceChanging(true);
      setPriceChangeSuccess(null);
      setPriceChangeError(null);
      
      const priceInWei = parseEther(newPrice);
      
      const hash = await walletClient.writeContract({
        address: REVIVE_CONTRACT_ADDRESS,
        abi: [
          {
            name: 'setRevivePrice',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [{ type: 'uint256', name: 'newPrice' }],
            outputs: []
          }
        ],
        functionName: 'setRevivePrice',
        args: [priceInWei]
      });
      
      console.log("Price change transaction sent:", hash);
      
      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      console.log("Price change transaction confirmed:", receipt);
      setPriceChangeSuccess(`Revive price changed to ${newPrice} MON!`);
      
      // Update price in database
      await supabase.rpc('update_revive_price', {
        contract_addr: REVIVE_CONTRACT_ADDRESS,
        new_price: parseFloat(newPrice)
      });
      
      // Refresh stats
      fetchReviveStats();
    } catch (error) {
      console.error("Error changing price:", error);
      setPriceChangeError(error.message || "Failed to change revive price");
    } finally {
      setPriceChanging(false);
    }
  };
  
  const resetPlayerReviveStatus = async (playerAddress) => {
    if (!walletClient) return;
    
    try {
      const hash = await walletClient.writeContract({
        address: REVIVE_CONTRACT_ADDRESS,
        abi: [
          {
            name: 'resetReviveStatus',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [{ type: 'address', name: 'player' }],
            outputs: []
          }
        ],
        functionName: 'resetReviveStatus',
        args: [playerAddress]
      });
      
      console.log("Reset revive status transaction sent:", hash);
      
      // Wait for transaction receipt
      await publicClient.waitForTransactionReceipt({ hash });
      
      console.log("Reset revive status confirmed for player", playerAddress);
      alert(`Successfully reset revive status for ${playerAddress}`);
    } catch (error) {
      console.error("Error resetting revive status:", error);
      alert("Failed to reset revive status: " + (error.message || "Unknown error"));
    }
  };
  
  if (loading) {
    return <div className="admin-loading">Loading revive data...</div>;
  }
  
  if (error) {
    return <div className="admin-error">{error}</div>;
  }
  
  return (
    <div className="admin-section">
      <h3 className="section-title">Revive Contract Management</h3>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h4>Total Revives</h4>
          <div className="stat-value">{reviveStats.totalRevives.toLocaleString()}</div>
        </div>
        
        <div className="stat-card">
          <h4>Unique Users</h4>
          <div className="stat-value">{reviveStats.uniqueUsers.toLocaleString()}</div>
        </div>
        
        <div className="stat-card">
          <h4>Total Revenue</h4>
          <div className="stat-value">{reviveStats.totalRevenue.toLocaleString()} MON</div>
        </div>
        
        <div className="stat-card">
          <h4>Current Price</h4>
          <div className="stat-value">{reviveStats.revivePrice} MON</div>
        </div>
        
        <div className="stat-card">
          <h4>Contract Balance</h4>
          <div className="stat-value">{reviveStats.contractBalance.toLocaleString()} MON</div>
        </div>
      </div>
      
      <div className="admin-actions" style={{ marginTop: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div className="admin-action">
          <h4>Withdraw Funds</h4>
          <button 
            onClick={handleWithdraw}
            disabled={withdrawing || reviveStats.contractBalance <= 0}
            className="admin-button"
          >
            {withdrawing ? 'Withdrawing...' : `Withdraw ${reviveStats.contractBalance.toLocaleString()} MON`}
          </button>
          {withdrawSuccess && <div className="success-message">{withdrawSuccess}</div>}
          {withdrawError && <div className="error-message">{withdrawError}</div>}
        </div>
        
        <div className="admin-action">
          <h4>Change Revive Price</h4>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              style={{ padding: '8px', width: '100px' }}
            />
            <span>MON</span>
            <button 
              onClick={handlePriceChange}
              disabled={priceChanging}
              className="admin-button"
            >
              {priceChanging ? 'Updating...' : 'Update Price'}
            </button>
          </div>
          {priceChangeSuccess && <div className="success-message">{priceChangeSuccess}</div>}
          {priceChangeError && <div className="error-message">{priceChangeError}</div>}
        </div>
      </div>
      
      <div className="reset-revive-section" style={{ marginTop: '30px' }}>
        <h4>Reset Player Revive Status</h4>
        <p className="info-text">Use this to allow a specific player to use a revive again (for testing)</p>
        
        <div className="reset-form" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <input
            type="text"
            id="player-address"
            placeholder="Player wallet address"
            style={{ flex: 1, padding: '8px' }}
          />
          <button 
            onClick={() => {
              const address = document.getElementById('player-address').value;
              if (address && address.startsWith('0x')) {
                resetPlayerReviveStatus(address);
              } else {
                alert('Please enter a valid wallet address starting with 0x');
              }
            }}
            className="admin-button"
          >
            Reset Revive
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviveAdminPanel; 