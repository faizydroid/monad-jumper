import React, { memo } from 'react';
import './HorizontalStats.css';

// Simplified component that only handles rendering, receiving all data as props
const HorizontalStats = memo(function HorizontalStats({ 
  isMobile = false,
  isConnected,
  address,
  playerHighScore,
  totalJumps,
  jumpRank,
  scoreRank,
  totalGames,
  leaderboard,
  gameSessionsCount,
  gamesPlayed,
  isLoading = {},
  getPlayerRank
}) {
  // If not connected, render a placeholder or nothing based on mobile vs desktop
  if (!isConnected || !address) {
    if (isMobile) {
      return null; // Don't show anything in mobile mode when not connected
    }
    
    // Desktop disconnected view
    return (
      <div className="stats-card-horizontal">
        <div className="card-badge">STATS</div>
        <div className="stats-info">
          <h3 className="greeting-title">Ready to break the monad?</h3>
          <p className="greeting-message">Connect your wallet to start jumping! 🚀</p>
        </div>
        <p>Connect wallet to see your stats</p>
      </div>
    );
  }

  // Only render mobile stats - desktop stats are handled in App.jsx
  if (isMobile) {
    return (
      <div className="stats-card" style={{
        background: 'rgba(255, 255, 255, 0.8)',
        borderRadius: '15px',
        width: '90%',
        maxWidth: '360px',
        padding: '15px',
        marginBottom: '30px',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
        border: '2px solid rgba(255, 255, 255, 0.7)'
      }}>
        <div className="card-badge">STATS</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gridTemplateRows: 'repeat(3, auto)',
          gap: '12px'
        }}>
          {/* Hi-Score */}
          <div style={{
            gridColumn: '1 / span 2',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '15px',
            background: 'rgba(255, 255, 255, 0.46)',
            borderRadius: '12px',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '50%',
              transform: 'translateX(-50%)'
            }}>
              <img src="/icon/score_ico.png" alt="High Score" width="28" height="28" />
            </div>
            <div style={{
              fontSize: '14px',
              color: '#333',
              marginBottom: '5px',
              marginTop: '20px'
            }}>
              Hi-Score
            </div>
            <div className="bangers-font" style={{
              fontSize: '36px',
              color: '#333',
              fontWeight: 'bold'
            }}>
              {playerHighScore !== undefined ? Number(playerHighScore).toLocaleString() : '0'}
            </div>
          </div>
          
          {/* Jump Rank */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '15px',
            background: 'rgba(255, 255, 255, 0.4)',
            borderRadius: '12px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '8px'
            }}>
              <img src="/icon/jump_rank_ico.png" alt="Jump Rank" width="28" height="28" />
            </div>
            <div style={{
              fontSize: '14px',
              color: '#333',
              marginBottom: '5px'
            }}>
              Jump Rank
            </div>
            <div className="bangers-font" style={{
              fontSize: '28px',
              color: '#333',
              fontWeight: 'bold'
            }}>
              {leaderboard && Array.isArray(leaderboard) && address ? 
                (() => {
                  // Always prefer the calculated jumpRank from fetchJumpRank function
                  if (jumpRank && jumpRank !== "Calculating") {
                    return jumpRank;
                  }
                  
                  // Otherwise show loading state
                  return <span style={{
                    display: 'inline-block',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: '3px solid rgba(0,0,0,0.1)',
                    borderTopColor: '#333',
                    animation: 'spin 1s linear infinite',
                    marginRight: '5px',
                    verticalAlign: 'middle'
                  }}></span>;
                })() : 
                <span style={{
                  display: 'inline-block',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '3px solid rgba(0,0,0,0.1)',
                  borderTopColor: '#333',
                  animation: 'spin 1s linear infinite',
                  marginRight: '5px',
                  verticalAlign: 'middle'
                }}></span>
              }
            </div>
          </div>
          
          {/* Score Rank */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '15px',
            background: 'rgba(255, 255, 255, 0.4)',
            borderRadius: '12px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '8px'
            }}>
              <img src="/icon/score_rank_ico.png" alt="Score Rank" width="28" height="28" />
            </div>
            <div style={{
              fontSize: '14px',
              color: '#333',
              marginBottom: '5px'
            }}>
              ScoreRank
            </div>
            <div className="bangers-font" style={{
              fontSize: '28px',
              color: '#333',
              fontWeight: 'bold'
            }}>
              {getPlayerRank && getPlayerRank() === "..." ? 
                <span style={{
                  display: 'inline-block',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '3px solid rgba(0,0,0,0.1)',
                  borderTopColor: '#333',
                  animation: 'spin 1s linear infinite',
                  marginRight: '5px',
                  verticalAlign: 'middle'
                }}></span> : 
                getPlayerRank ? getPlayerRank() : scoreRank}
            </div>
          </div>
          
          {/* Total Jumps */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '15px',
            background: 'rgba(255, 255, 255, 0.4)',
            borderRadius: '12px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '8px'
            }}>
              <img src="/icon/jump_ico.png" alt="Total Jumps" width="28" height="28" />
            </div>
            <div style={{
              fontSize: '14px',
              color: '#333',
              marginBottom: '5px'
            }}>
              Total Jumps
            </div>
            <div className="bangers-font" style={{
              fontSize: '28px',
              color: '#333',
              fontWeight: 'bold'
            }}>
              {totalJumps !== undefined ? Number(totalJumps).toLocaleString() : '0'}
            </div>
          </div>
          
          {/* Total Games */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '15px',
            background: 'rgba(255, 255, 255, 0.4)',
            borderRadius: '12px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '8px'
            }}>
              <img src="/icon/game_ico.png" alt="Total Games" width="28" height="28" />
            </div>
            <div style={{
              fontSize: '14px',
              color: '#333',
              marginBottom: '5px'
            }}>
              Total Gamesx
            </div>
            <div className="bangers-font" style={{
              fontSize: '28px',
              color: '#333',
              fontWeight: 'bold'
            }}>
              {gameSessionsCount > gamesPlayed ? gameSessionsCount : gamesPlayed || 0}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Return null for desktop as it's handled in App.jsx
  return null;
});

export default HorizontalStats; 