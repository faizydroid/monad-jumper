import React, { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Log to verify the component is mounting
    console.log('App component mounted');
  }, []);

  return (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center',
      background: '#5662EB',
      color: 'white',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <h1>Monad Jumper</h1>
      <p>If you see this, React is working!</p>
      <button 
        style={{
          padding: '10px 20px',
          background: '#FF5252',
          color: 'white',
          border: 'none',
          borderRadius: '50px',
          cursor: 'pointer',
          marginTop: '20px'
        }}
        onClick={() => alert('Button clicked!')}
      >
        Click Me
      </button>
    </div>
  );
}

export default App; 