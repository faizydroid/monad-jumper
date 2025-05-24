import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import GameInterface from '../components/GameInterface';

const GamePage = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  // Handle return to home page
  const handleReturnToHome = () => {
    navigate('/home');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-purple-900 to-indigo-900">
      {/* Header with user info */}
      <header className="p-4 bg-black/30">
        <div className="container mx-auto flex justify-between items-center">
          <button 
            onClick={handleReturnToHome}
            className="text-white hover:text-gray-300"
          >
            ← Back
          </button>
          {user && (
            <div className="flex items-center">
              <img 
                src={user.avatar} 
                alt={user.username} 
                className="w-8 h-8 rounded-full mr-2"
              />
              <span className="text-white">{user.username}</span>
            </div>
          )}
        </div>
      </header>
      
      {/* Game content - using the shared GameInterface component */}
      <div className="flex-1">
        <GameInterface onReturn={handleReturnToHome} />
      </div>
    </div>
  );
};

export default GamePage; 