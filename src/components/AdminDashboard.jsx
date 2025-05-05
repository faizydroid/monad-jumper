import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import './AdminDashboard.css';
import AdminLinkGenerator from './AdminLinkGenerator';
import { createClient } from '@supabase/supabase-js';
import { usePublicClient, useWalletClient } from 'wagmi';
import { parseEther } from 'viem';
import { supabase } from '../lib/supabaseClient';
import { EncryptedStorageService } from '../services/EncryptedStorageService';
import { ethers } from 'ethers';

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
  
  // Add revive contract state
  const [reviveContractData, setReviveContractData] = useState({
    balance: 0,
    revivePrice: 0.5,
    totalRevives: 0,
    uniqueUsers: 0,
    totalRevenue: 0,
    lastUpdated: null
  });
  const [reviveWithdrawing, setReviveWithdrawing] = useState(false);
  const [reviveWithdrawSuccess, setReviveWithdrawSuccess] = useState(null);
  const [reviveWithdrawError, setReviveWithdrawError] = useState(null);
  const [revivePriceInput, setRevivePriceInput] = useState(0.5);
  
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
  
  // Log tables on load to help debug
  useEffect(() => {
    logTableInfo();
  }, []);
  
  // Update the fetchGameStats function to fetch jumps from the jumps table
  useEffect(() => {
    async function fetchGameStats() {
      try {
        setLoading(true);
        
        // Rest of the function...
      } catch (error) {
        console.error("Error fetching game stats:", error);
        setError("Error loading data: " + error.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchGameStats();
  }, [publicClient]);
  
  // Rest of component functions...
  
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
  
  // Rest of functions...
  
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
          Contract Info
        </button>
        <button 
          className={`tab-button ${activeTab === 'revive' ? 'active' : ''}`}
          onClick={() => setActiveTab('revive')}
        >
          Revive Management
        </button>
      </div>
      
      {/* Tabs content */}
      
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
      
      {/* Other tabs content */}
      
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