const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./api/index.js');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS with specific origin to match Vite dev server
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Enable JSON parsing
app.use(express.json());

// Serve static files from the dist directory (after build)
app.use(express.static(path.join(__dirname, '../dist')));

// Use API routes
app.use('/api', apiRoutes);

// Add a test endpoint
app.get('/api/ping', (req, res) => {
  res.json({ message: 'API server is running' });
});

// For any other route, serve the index.html file (client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API routes available at http://localhost:${PORT}/api`);
});

module.exports = app; 