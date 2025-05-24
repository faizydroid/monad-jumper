import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import usePlayerStats from '../hooks/usePlayerStats';
import GameInterface from '../components/GameInterface';

// Mock stats (replace with real hook later)
const useMockStats = () => {
  return {
    playerHighScore: 1065,
    totalJumps: 18248,
    gamesPlayed: 495,
    gameSessionsCount: 495,
    jumpRank: '#11',
    scoreRank: '1000+',
  };
};

const HomePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useUser();
  const [showGame, setShowGame] = useState(false);
  
  // Get player stats from the hook
  const {
    playerHighScore,
    totalJumps,
    gamesPlayed,
    gameSessionsCount,
    jumpRank,
    scoreRank
  } = usePlayerStats();
  
  // Use the higher value between gamesPlayed and gameSessionsCount
  const totalGames = Math.max(gamesPlayed || 0, gameSessionsCount || 0);

  // Function to handle Play button click, matches MobileHomePage
  const handlePlay = () => {
    setShowGame(true);
  };

  // Function to return from game to home screen
  const handleReturnFromGame = () => {
    setShowGame(false);
  };

  // If game is being shown, render the GameInterface
  if (showGame) {
    return <GameInterface onReturn={handleReturnFromGame} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-indigo-900 to-purple-900 px-4 py-8">
      {/* Game logo and title section */}
      <div className="text-center mb-8">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-2 drop-shadow-lg tracking-wider animate-pulse">
          JumpNads
        </h1>
        <p className="text-lg md:text-xl text-white/80 mb-2">
          A Web3 auto-jumping game on Monad testnet
        </p>
      </div>

      {/* Character image with jumping animation */}
      <div className="relative w-32 h-32 mb-8">
        <div className="animate-bounce">
          <img 
            src="/images/monad0.png" 
            alt="Game Character" 
            className="w-full h-full object-contain drop-shadow-lg"
            onError={(e) => {
              const target = e.target;
              target.src = 'https://placehold.co/128x128?text=Character';
            }}
          />
        </div>
        {/* Shadow that shrinks as character jumps */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-2 bg-black/20 rounded-full animate-shadow-pulse"></div>
      </div>

      {/* User info and stats */}
      {isAuthenticated && user && (
        <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-lg mb-8">
          <div className="flex items-center justify-center gap-4 mb-6">
            <img 
              src={user.avatar} 
              alt={user.username || 'User'} 
              className="w-12 h-12 rounded-full border-2 border-white/20"
            />
            <div className="text-left">
              <h3 className="text-white font-medium">{user.username}</h3>
              <p className="text-white/60 text-sm">Connected via Discord</p>
            </div>
          </div>
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/20 rounded-lg p-4 flex flex-col items-center">
              <span className="text-xs text-white/70 mb-1">Hi-Score</span>
              <span className="text-lg font-bold text-white">
                {playerHighScore !== undefined ? Number(playerHighScore).toLocaleString() : '0'}
              </span>
            </div>
            <div className="bg-white/20 rounded-lg p-4 flex flex-col items-center">
              <span className="text-xs text-white/70 mb-1">Total Jumps</span>
              <span className="text-lg font-bold text-white">
                {totalJumps !== undefined ? Number(totalJumps).toLocaleString() : '0'}
              </span>
            </div>
            <div className="bg-white/20 rounded-lg p-4 flex flex-col items-center">
              <span className="text-xs text-white/70 mb-1">Jump Rank</span>
              <span className="text-lg font-bold text-white">{jumpRank || 'N/A'}</span>
            </div>
            <div className="bg-white/20 rounded-lg p-4 flex flex-col items-center">
              <span className="text-xs text-white/70 mb-1">Score Rank</span>
              <span className="text-lg font-bold text-white">{scoreRank || 'N/A'}</span>
            </div>
            <div className="bg-white/20 rounded-lg p-4 flex flex-col items-center col-span-2">
              <span className="text-xs text-white/70 mb-1">Total Games</span>
              <span className="text-lg font-bold text-white">{totalGames || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Play button - Clicking this now opens the game interface directly */}
      <button 
        onClick={handlePlay}
        className="block w-full max-w-xs text-center bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-full shadow-md transition-all transform hover:scale-105 active:scale-95 mb-4"
      >
        PLAY NOW
      </button>
      
      {/* Add styles for shadow pulse animation */}
      <style jsx>{`
        @keyframes shadow-pulse {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.2; }
          50% { transform: translateX(-50%) scale(0.6); opacity: 0.1; }
        }
      `}</style>
    </div>
  );
};

export default HomePage; 