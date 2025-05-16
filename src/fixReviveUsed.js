// Fix script for REVIVE_USED handler
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the file
const appJsxPath = path.join(__dirname, 'App.jsx');
let content = fs.readFileSync(appJsxPath, 'utf8');

// Find the REVIVE_USED handler
const pattern = /if \(event\.data\.type === 'REVIVE_USED'\) {[\s\S]*?window\.__reviveUsedForGameId = String\(gameId\);[\s\S]*?console\.log\(`⭐ REVIVE FLAG SET: Game \${gameId} marked as having used revive`\);/;

// Replace with the fixed version that handles the session ID consistently
const replacement = `if (event.data.type === 'REVIVE_USED') {
          // get the current game session ID, which should be the original session from when game started
          const currentSessionId = window.__currentGameSessionId;
          
          // Get the game ID from the event
          const gameId = event.data.gameId || 
                        (event.data.data && event.data.data.gameId) || 
                        window.__LATEST_GAME_SESSION || 
                        "unknown";
          
          // CRITICAL FIX: Use the original session ID that was stored during PURCHASE_REVIVE
          window.__reviveUsedForGameId = currentSessionId;
          
          // Also store the event ID for debugging
          window.__reviveEventGameId = String(gameId);
          
          console.log(\`⭐ REVIVE FLAG SET: Game \${currentSessionId} marked as having used revive (event ID: \${gameId})\`);`;

// Make the replacement
content = content.replace(pattern, replacement);

// Write the modified content back to the file
fs.writeFileSync(appJsxPath, content, 'utf8');

console.log('Successfully fixed the REVIVE_USED handler in App.jsx'); 