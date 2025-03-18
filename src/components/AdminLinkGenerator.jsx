import React, { useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import './AdminDashboard.css';

// Same list of authorized admin wallet addresses
const ADMIN_WALLETS = [
  '0x1234567890123456789012345678901234567890', // Replace with actual admin wallets
  '0x0987654321098765432109876543210987654321'
];

// Secure token (same as in AdminAccess)
const ADMIN_ACCESS_TOKEN = 'a8b72c91d5e6f3g4h5i6j7k8l9m0n1o2';

export default function AdminLinkGenerator() {
  const { account } = useWeb3();
  const [linkGenerated, setLinkGenerated] = useState(false);
  const [adminLink, setAdminLink] = useState('');
  const [expiryTime, setExpiryTime] = useState(60); // minutes
  
  const isAdmin = account && ADMIN_WALLETS.includes(account.toLowerCase());
  
  const generateLink = () => {
    // Create a special link with the token
    const baseUrl = window.location.origin;
    const adminUrl = `${baseUrl}/admin/${ADMIN_ACCESS_TOKEN}`;
    
    setAdminLink(adminUrl);
    setLinkGenerated(true);
    
    // Optional: Create an expiring link by setting a timeout in session storage
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + parseInt(expiryTime));
    sessionStorage.setItem('adminLinkExpiry', expiryDate.toISOString());
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(adminLink);
    alert('Admin link copied to clipboard!');
  };
  
  if (!isAdmin) {
    return null; // Only show to admin users
  }
  
  return (
    <div className="admin-link-generator">
      <h3>Generate Admin Access Link</h3>
      
      {!linkGenerated ? (
        <div className="admin-link-form">
          <div className="form-group">
            <label>Link Expiry (minutes):</label>
            <input 
              type="number" 
              value={expiryTime}
              onChange={(e) => setExpiryTime(e.target.value)}
              min="5"
              max="1440"
            />
          </div>
          <button className="admin-btn" onClick={generateLink}>
            Generate Secure Link
          </button>
        </div>
      ) : (
        <div className="admin-link-result">
          <p>Your secure admin link (valid for {expiryTime} minutes):</p>
          <div className="admin-link">
            <input
              type="text"
              readOnly
              value={adminLink}
              onClick={(e) => e.target.select()}
            />
            <button className="copy-btn" onClick={copyToClipboard}>
              Copy
            </button>
          </div>
          <p className="admin-link-warning">
            This link grants full admin access. Do not share it with unauthorized users.
          </p>
        </div>
      )}
    </div>
  );
} 