import React from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';

const Navbar = ({ onClose, mobileView = false }) => {
  const { user, isAuthenticated, logout } = useUser();

  const handleLogout = () => {
    logout();
    if (onClose) onClose();
  };

  return (
    <div className={`navbar-container ${mobileView ? 'p-4' : 'p-6'} bg-indigo-900/80 backdrop-blur-md h-full`}>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white">Menu</h2>
        {mobileView && (
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>
      
      {isAuthenticated && user && (
        <div className="user-profile bg-white/10 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <img 
              src={user.avatar} 
              alt={user.username} 
              className="w-12 h-12 rounded-full"
            />
            <div>
              <h3 className="text-white font-medium">{user.username}</h3>
              <p className="text-white/60 text-sm">Connected Player</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-md text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      )}
      
      <div className="menu-links flex flex-col gap-2">
        <Link 
          to="/home" 
          className="menu-item flex items-center gap-3 text-white p-3 rounded-lg hover:bg-white/10"
          onClick={onClose}
        >
          <span className="icon">🏠</span>
          <span>Home</span>
        </Link>
        
        <Link 
          to="/game" 
          className="menu-item flex items-center gap-3 text-white p-3 rounded-lg hover:bg-white/10"
          onClick={onClose}
        >
          <span className="icon">🎮</span>
          <span>Play Game</span>
        </Link>
        
        {!isAuthenticated && (
          <Link 
            to="/login" 
            className="menu-item flex items-center gap-3 text-white p-3 rounded-lg hover:bg-white/10"
            onClick={onClose}
          >
            <span className="icon">🔑</span>
            <span>Login</span>
          </Link>
        )}
      </div>
      
      <div className="footer mt-auto pt-6 text-center text-white/40 text-sm">
        <p>JumpNads v1.0</p>
        <p className="mt-1">© 2023 JumpNads Team</p>
      </div>
    </div>
  );
};

export default Navbar; 