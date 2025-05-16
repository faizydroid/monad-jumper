// Fix script to add global tracking of scores and jumps
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the file
const appJsxPath = path.join(__dirname, 'App.jsx');
let content = fs.readFileSync(appJsxPath, 'utf8');

// Find the SCORE handler to track scores globally
const scorePattern = /if \(event\.data\.type === 'SCORE'\) {\s*const score = event\.data\.score \|\| 0;/;
const scoreReplacement = `if (event.data.type === 'SCORE') {
          const score = event.data.score || 0;
          
          // TRACK SCORE GLOBALLY: Store the current score for revive handling
          window.__LATEST_SCORE = score;`;

// Apply the score tracking change
content = content.replace(scorePattern, scoreReplacement);

// Find the JUMP handler to track jumps globally
const jumpPattern = /if \(event\.data\.type === 'JUMP'\) {\s*const jumpCount = event\.data\.jumps \|\| 0;/;
const jumpReplacement = `if (event.data.type === 'JUMP') {
          const jumpCount = event.data.jumps || 0;
          
          // TRACK JUMPS GLOBALLY: Store the current jumps for revive handling
          window.__LATEST_JUMPS = jumpCount;`;

// Apply the jump tracking change
content = content.replace(jumpPattern, jumpReplacement);

// Add initialization of these variables at the start of the file
// Find a good spot to initialize global variables
const initPattern = /if \(typeof window !== 'undefined'\) {/;
const initReplacement = `if (typeof window !== 'undefined') {
  // Initialize tracking variables for scores and jumps
  window.__LATEST_SCORE = 0;
  window.__LATEST_JUMPS = 0;
  window.__LATEST_GAME_SESSION = null;`;

// Apply the initialization change
content = content.replace(initPattern, initReplacement);

// Write the modified content back to the file
fs.writeFileSync(appJsxPath, content, 'utf8');

console.log('Successfully added global tracking of scores and jumps!'); 