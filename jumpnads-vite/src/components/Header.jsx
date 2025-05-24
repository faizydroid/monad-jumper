import { Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';

const Header = () => {
  const { user, isAuthenticated, logout } = useUser();

  return (
    <header className="bg-indigo-900/80 backdrop-blur-md shadow-md fixed top-0 left-0 right-0 z-10">
      <div className="container mx-auto flex justify-between items-center py-3 px-4">
        <Link to="/" className="text-white text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">🚀</span>
          JumpNads
        </Link>
        
        <div>
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <img 
                  src={user?.avatar} 
                  alt={user?.username || 'User'}
                  className="w-8 h-8 rounded-full border border-white/20" 
                />
                <span className="text-white hidden md:inline">{user?.username}</span>
              </div>
              <button 
                onClick={logout}
                className="text-white/70 hover:text-white text-sm"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link 
              to="/login"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 