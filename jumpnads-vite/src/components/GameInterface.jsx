import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';

const GameInterface = ({ onReturn }) => {
  const { user } = useUser();
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  
  // Start game
  const startGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    
    // Setup game loop here
    const gameInterval = setInterval(() => {
      // In a real game, this would be more complex
      // This is just a simple example that increases the score
      setScore(prevScore => prevScore + 10);
    }, 1000);
    
    // End game after 15 seconds (for demo purposes)
    setTimeout(() => {
      clearInterval(gameInterval);
      setGameOver(true);
    }, 15000);
  };

  // Mock gameplay implementation
  useEffect(() => {
    // Handle any keyboard events or game logic
    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        // Spacebar or Up arrow - could trigger jump in a real game
        console.log('Jump action triggered');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="game-interface w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-purple-900 to-indigo-900">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-lg p-6 flex flex-col items-center">
        {!gameStarted ? (
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-4">Ready to Jump?</h1>
            <p className="text-lg text-white/70 mb-6">
              Auto-jumping game on Monad testnet
            </p>
            <button 
              onClick={startGame}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-md transition-colors text-lg"
            >
              START GAME
            </button>
          </div>
        ) : gameOver ? (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Game Over!</h2>
            <p className="text-5xl font-bold text-yellow-400 mb-6">{score} pts</p>
            <div className="space-y-4">
              <button 
                onClick={startGame}
                className="block w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-md shadow-md transition-colors"
              >
                PLAY AGAIN
              </button>
              <button 
                onClick={onReturn} 
                className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-md shadow-md transition-colors"
              >
                BACK TO HOME
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center w-full">
            <h2 className="text-2xl font-bold text-white mb-4">Score: {score}</h2>
            <div className="w-full h-64 bg-indigo-800/50 rounded-lg flex items-center justify-center">
              <p className="text-white text-lg">Game in progress...</p>
              <div className="absolute character-container">
                <div className="animate-bounce">
                  <img 
                    src="/images/monad0.png" 
                    alt="Game Character" 
                    className="w-12 h-12 object-contain drop-shadow-lg"
                    onError={(e) => {
                      e.target.src = 'https://placehold.co/128x128?text=Character';
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameInterface; 