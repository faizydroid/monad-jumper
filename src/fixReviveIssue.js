// Fix script for revive issue
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the file
const appJsxPath = path.join(__dirname, 'App.jsx');
let content = fs.readFileSync(appJsxPath, 'utf8');

// Find the line we want to replace
const pattern = /window\.__reviveUsedForGameId = formattedGameId;[\s\S]*?console\.log\(`⭐ REVIVE PURCHASE: Setting revive used flag for game ID: \${formattedGameId}`\);/;

// Replace with the fixed version
const replacement = 'window.__reviveUsedForGameId = window.__currentGameSessionId || formattedGameId;\n              console.log(`⭐ REVIVE PURCHASE: Setting revive used flag for session ID: ${window.__currentGameSessionId} (event ID: ${formattedGameId})`);';

// Make the replacement
content = content.replace(pattern, replacement);

// Write the modified content back to the file
fs.writeFileSync(appJsxPath, content, 'utf8');

console.log('Successfully fixed the revive issue in App.jsx'); 