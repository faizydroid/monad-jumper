const handleError = (error) => {
  console.error('React Root Error:', error);
  // Display fallback UI when React fails to render
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif; text-align: center;">
      <h2>Something went wrong</h2>
      <p>We couldn't initialize the application. This might be due to a browser extension conflict.</p>
      <p>Error: ${error.message}</p>
      <button onclick="window.location.reload()" style="padding: 8px 16px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Reload Application
      </button>
    </div>
  `;
};

// Then update your React rendering with error handling
try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <YourAppComponent />
    </React.StrictMode>
  );
} catch (error) {
  handleError(error);
} 