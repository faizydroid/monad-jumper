import React, { useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useAccount } from 'wagmi';
import './PlayerStats.css';

export default function PlayerStats() {
  const { playerHighScore, totalJumps, username, refreshJumps } = useWeb3();
  const { isConnected, address } = useAccount();

  console.log("PlayerStats render - Connected:", isConnected, "Address:", address, "Score:", playerHighScore);

  useEffect(() => {
    if (isConnected && address && refreshJumps) {
      console.log('PlayerStats: Refreshing jump count');
      refreshJumps();
    }
  }, [isConnected, address, refreshJumps]);

  if (!isConnected || !address) {
    return (
      <div className="player-stats card">
        <div className="card-badge">STATS</div>
        <div className="greeting-section">
          <h2 className="greeting-title">Ready to break the monad?</h2>
          <p className="greeting-message">Connect your wallet to start jumping! 🚀</p>
        </div>
        <p>Connect wallet to see your stats</p>
      </div>
    );
  }

  // Get username or use address for greeting
  const displayName = username || address.substring(0, 6) + '...';

  return (
    <div className="player-stats card">
      <div className="card-badge">STATSx</div>
      
      {/* Greeting Section */}
      <div className="greeting-section">
        <h2 className="greeting-title"><br></br>Hi there, {displayName}!</h2>
        <p className="greeting-message">Ready to break the monad? 🚀<br></br></p>
      </div>
      <br></br>
      
      
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-info">
            <div className="stat-value">{playerHighScore || '0'}</div>
            <div className="stat-label">High Score</div>
          </div>
        </div>
        
        <div className="stat-item">
          <div className="stat-info">
            <div className="stat-value">{totalJumps || 0}</div>
            <div className="stat-label">Total Jumps</div>
          </div>
        </div>
        
        <div className="stat-item">
          <div className="stat-info">
            <div className="stat-value">{Math.max(1, Math.floor((playerHighScore || 0) / 100))}</div>
            <div className="stat-label">Level</div>
          </div>
        </div>
        
        <div className="stat-item">
          <div className="stat-info">
            <div className="stat-value">{getRank(playerHighScore || 0)}</div>
            <div className="stat-label">Rank</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to determine player rank based on score
function getRank(score) {
  if (score === 0) return 'Newbie';
  if (score < 300) return 'Beginner';
  if (score < 800) return 'Jumper';
  if (score < 2000) return 'Pro Jumper';
  if (score < 5000) return 'Master';
  return 'Legend';
} 