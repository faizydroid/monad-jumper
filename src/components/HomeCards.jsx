import React from 'react';
import PlayerStats from './PlayerStats';
import Leaderboard from './Leaderboard';
import '../styles/HomeCards.css';

const HomeCards = () => {
  return (
    <div className="game-stats-container">
      <PlayerStats />
      <Leaderboard />
    </div>
  );
};

export default HomeCards; 