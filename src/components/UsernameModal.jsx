import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';

export function UsernameModal() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const { setUserUsername, isLoading, supabaseError, account } = useWeb3();

  useEffect(() => {
    console.log('Username modal rendered', { account, isLoading, supabaseError });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim()) {
      setError('Username cannot be empty');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    
    try {
      console.log('Submitting username:', username);
      await setUserUsername(username);
    } catch (error) {
      console.error('Error setting username:', error);
      setError(error.message || 'Failed to set username');
    }
  };

  return (
    <div className="username-modal">
      <div className="modal-content">
        <h2>Set Your Username</h2>
        <p>Choose a username to continue</p>
        {supabaseError && (
          <div className="error">
            <p>Database error: {supabaseError}</p>
            <p>Please try again later or contact support.</p>
          </div>
        )}
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            required
            disabled={isLoading}
            autoFocus
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Setting...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
} 