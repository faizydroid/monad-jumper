'use client';

import React, { useState } from 'react';

// Create a simplified version of useSearchParams
const useSearchParams = () => {
  return {
    get: (param: string) => null
  };
};

export default function BulletinContent() {
  const searchParams = useSearchParams();
  const [bulletins, setBulletins] = useState([
    { id: 1, title: 'Welcome to Monad Jumper', content: 'Play the game and earn rewards on-chain!', date: '2023-05-15' },
    { id: 2, title: 'New Features Coming Soon', content: 'Stay tuned for exciting updates and features.', date: '2023-05-20' },
    { id: 3, title: 'Community Update', content: 'Join our Discord community for the latest news.', date: '2023-05-25' }
  ]);
  
  const selectedId = searchParams.get('id') ? parseInt(searchParams.get('id') || '0') : null;
  
  // Filter for single bulletin if ID is provided
  const selectedBulletin = selectedId 
    ? bulletins.find(b => b.id === selectedId) 
    : null;

  return (
    <div className="bulletin-container">
      <h1 className="bulletin-header">Bulletin Board</h1>
      
      {selectedBulletin ? (
        // Single bulletin view
        <div className="bulletin-detail">
          <h2>{selectedBulletin.title}</h2>
          <p className="bulletin-date">Posted on: {selectedBulletin.date}</p>
          <div className="bulletin-content">
            {selectedBulletin.content}
          </div>
          <a href="/bulletin" className="back-link">← Back to all bulletins</a>
        </div>
      ) : (
        // List view
        <div className="bulletin-list">
          {bulletins.map(bulletin => (
            <div key={bulletin.id} className="bulletin-item">
              <h3>
                <a href={`/bulletin?id=${bulletin.id}`}>{bulletin.title}</a>
              </h3>
              <p className="bulletin-date">{bulletin.date}</p>
              <p className="bulletin-preview">
                {bulletin.content.substring(0, 100)}
                {bulletin.content.length > 100 ? '...' : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 