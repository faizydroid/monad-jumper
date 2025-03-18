import React from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import '../styles/Leaderboard.css';

const Leaderboard = () => {
  const { leaderboard } = useWeb3();

  return (
    <div className="leaderboard-container">
      <h2 className="leaderboard-title">🏆 TOP JUMPERS 🏆</h2>
      
      <div className="leaderboard-board">
        {leaderboard.length === 0 ? (
          <div className="no-scores">No scores yet! Be the first to jump!</div>
        ) : (
          <div className="leaderboard-scores">
            {leaderboard.map((entry, index) => (
              <div 
                key={`${entry.address}-${entry.score}`} 
                className={`leaderboard-row ${index < 3 ? 'top-three' : ''} ${index === 0 ? 'first-place' : ''}`}
              >
                <div className="rank">
                  {index < 3 ? (
                    <span className="medal">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                  ) : (
                    `#${index + 1}`
                  )}
                </div>
                <div className="player-name">{entry.player}</div>
                <div className="score-bubble">{entry.score}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard; 