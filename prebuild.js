const fs = require('fs');
const path = require('path');

// Create the dist directory if it doesn't exist
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Copy index-real.html to dist
fs.copyFileSync('public/index-real.html', 'dist/index-real.html');

// Copy js directory if it exists
if (fs.existsSync('public/js')) {
  if (!fs.existsSync('dist/js')) {
    fs.mkdirSync('dist/js');
  }
  
  // Copy main.js
  if (fs.existsSync('public/js/main.js')) {
    fs.copyFileSync('public/js/main.js', 'dist/js/main.js');
  }
}

// Copy images directory if it exists
if (fs.existsSync('public/images')) {
  if (!fs.existsSync('dist/images')) {
    fs.mkdirSync('dist/images');
  }
  
  // Copy all images
  const imageFiles = fs.readdirSync('public/images');
  imageFiles.forEach(file => {
    fs.copyFileSync(`public/images/${file}`, `dist/images/${file}`);
  });
}

console.log('Pre-build copy complete'); 