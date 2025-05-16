// Fix script for high score display after revive
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the file
const appJsxPath = path.join(__dirname, 'App.jsx');
let content = fs.readFileSync(appJsxPath, 'utf8');

// Update the setDirectHighScore function in the injectHighScoreOverride method
const injectPattern = /window\.setDirectHighScore = function\(score\) {[\s\S]*?currentHighScore = score;[\s\S]*?lastHighScoreUpdate = now;[\s\S]*?};/g;

// Improved version with revive handling
const injectReplacement = `window.setDirectHighScore = function(score) {
              // Don't update if it's the same score within 5 seconds
              const now = Date.now();
              if (now - lastHighScoreUpdate < 5000 && currentHighScore === score) {
                return;
              }
              
              console.log("🎯 DIRECT HIGH SCORE UPDATE:", score);
              
              // CRITICAL FIX: Track revive status for improved high score handling
              const wasReviveUsed = window.__reviveUsedForGameId ? "YES" : "NO";
              console.log("🎯 REVIVE STATUS FOR HIGH SCORE:", wasReviveUsed);
              
              window.playerHighScore = score;
              window.highScoreSet = true;
              currentHighScore = score;
              lastHighScoreUpdate = now;
              
              // Store this in sessionStorage too, as a backup
              try {
                sessionStorage.setItem('latestHighScore', score);
                sessionStorage.setItem('wasReviveUsed', wasReviveUsed);
              } catch (err) {
                // Ignore storage errors
              }
            };`;

// Apply the change
content = content.replace(injectPattern, injectReplacement);

// Update the injectScript code that sets up getHighScore
const getHighScorePattern = /window\.getHighScore = function\(\) {[\s\S]*?return window\.playerHighScore \|\| 0;[\s\S]*?}/g;

// Improved version that checks both regular and revive high scores
const getHighScoreReplacement = `window.getHighScore = function() {
                // IMPROVED: Check all possible sources for high score
                // 1. Direct window property
                const directHighScore = window.playerHighScore || 0;
                
                // 2. Session storage backup
                let sessionHighScore = 0;
                try {
                  sessionHighScore = parseInt(sessionStorage.getItem('latestHighScore')) || 0;
                } catch (err) {
                  // Ignore storage errors
                }
                
                // 3. Flag that identifies if revive was used for this high score
                const wasReviveUsed = window.__reviveUsedForGameId || 
                                    (sessionStorage.getItem('wasReviveUsed') === 'YES');
                
                if (wasReviveUsed) {
                  console.log("🎮 Using high score with revive context:", {
                    directHighScore,
                    sessionHighScore,
                    wasReviveUsed
                  });
                }
                
                // Return the highest value
                return Math.max(directHighScore, sessionHighScore);
              }`;

// Apply the change
content = content.replace(getHighScorePattern, getHighScoreReplacement);

// Write the modified content back to the file
fs.writeFileSync(appJsxPath, content, 'utf8');

console.log('Successfully fixed high score display to properly show scores after revive!'); 