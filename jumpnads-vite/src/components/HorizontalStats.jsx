import React from 'react';

const HorizontalStats = ({ playerHighScore, totalJumps, jumpRank, scoreRank, totalGames }) => {
  return (
    <div className="stats-bar w-full flex overflow-x-auto py-4 px-2 gap-4">
      <div className="stat-item flex-shrink-0 bg-white/20 rounded-lg p-4 flex flex-col items-center min-w-[100px]">
        <span className="text-xs text-white/70 mb-1">Hi-Score</span>
        <span className="text-lg font-bold text-white">{playerHighScore !== undefined ? Number(playerHighScore).toLocaleString() : '0'}</span>
      </div>
      
      <div className="stat-item flex-shrink-0 bg-white/20 rounded-lg p-4 flex flex-col items-center min-w-[100px]">
        <span className="text-xs text-white/70 mb-1">Total Jumps</span>
        <span className="text-lg font-bold text-white">{totalJumps !== undefined ? Number(totalJumps).toLocaleString() : '0'}</span>
      </div>
      
      <div className="stat-item flex-shrink-0 bg-white/20 rounded-lg p-4 flex flex-col items-center min-w-[100px]">
        <span className="text-xs text-white/70 mb-1">Jump Rank</span>
        <span className="text-lg font-bold text-white">{jumpRank || 'N/A'}</span>
      </div>
      
      <div className="stat-item flex-shrink-0 bg-white/20 rounded-lg p-4 flex flex-col items-center min-w-[100px]">
        <span className="text-xs text-white/70 mb-1">Score Rank</span>
        <span className="text-lg font-bold text-white">{scoreRank || 'N/A'}</span>
      </div>
      
      <div className="stat-item flex-shrink-0 bg-white/20 rounded-lg p-4 flex flex-col items-center min-w-[100px]">
        <span className="text-xs text-white/70 mb-1">Total Games</span>
        <span className="text-lg font-bold text-white">{totalGames || '0'}</span>
      </div>
    </div>
  );
};

export default HorizontalStats; 