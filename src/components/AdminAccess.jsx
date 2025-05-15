import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import AdminDashboard from './AdminDashboard';
import Navbar from './Navbar';
import '../App.css';

export default function AdminAccess() {
  const { account } = useWeb3();
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD;
  
  useEffect(() => {
    // Check if user already has a stored session
    const storedAuth = sessionStorage.getItem('adminAuthorized');
    if (storedAuth === 'true') {
      setAuthorized(true);
    }
  }, []);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === correctPassword) {
      setAuthorized(true);
      sessionStorage.setItem('adminAuthorized', 'true');
    } else {
      alert("Incorrect password");
    }
  };
  
  if (authorized) {
    return (
      <>
        <AdminDashboard />
      </>
    );
  }
  
  return (
    <>
      <div className="admin-container">
        <h2>Admin Access</h2>
        <div className="admin-login-form">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input 
                id="password"
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="admin-password-input"
              />
            </div>
            <button type="submit" className="admin-login-button">Access Dashboard</button>
          </form>
        </div>
      </div>
    </>
  );
} 