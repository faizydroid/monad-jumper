import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          color: 'white' 
        }}>
          <h2>Something went wrong</h2>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              padding: '10px 20px',
              margin: '10px',
              borderRadius: '5px',
              background: '#4CAF50',
              color: 'white',
              border: 'none'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 