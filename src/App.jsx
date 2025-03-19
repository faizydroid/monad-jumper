import React from 'react'

function App() {
  return (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#5662EB', marginBottom: '20px' }}>Monad Jumper</h1>
      <p style={{ fontSize: '18px', marginBottom: '20px' }}>
        This is the React application successfully loaded!
      </p>
      <button 
        style={{
          padding: '10px 20px',
          backgroundColor: '#7C3AED',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
        onClick={() => alert('React is working correctly!')}
      >
        Click Me
      </button>
    </div>
  )
}

export default App 