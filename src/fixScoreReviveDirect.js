// Fix script for direct score saving after revive
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
const pattern = /if \(event\.data\.type === 'REVIVE_USED'\) {[\s\S]*?console\.log\(`⭐ REVIVE FLAG SET: Game \${[\s\S]*?} marked as having used revive[\s\S]*?`\);/;

// Replace with enhanced version that directly saves scores
const replacement = `if (event.data.type === 'REVIVE_USED') {
          // get the current game session ID, which should be the original session from when game started
          const currentSessionId = window.__currentGameSessionId;
          
          // Get the game ID from the event
          const gameId = event.data.gameId || 
                        (event.data.data && event.data.data.gameId) || 
                        window.__LATEST_GAME_SESSION || 
                        "unknown";
          
          // Get the current score
          const currentScore = event.data.score || 
                              (event.data.data && event.data.data.score) || 
                              window.__LATEST_SCORE || 
                              0;
                              
          // CRITICAL FIX: Use the original session ID that was stored during PURCHASE_REVIVE
          window.__reviveUsedForGameId = currentSessionId;
          
          // Also store the event ID for debugging
          window.__reviveEventGameId = String(gameId);
          
          console.log(\`⭐ REVIVE FLAG SET: Game \${currentSessionId} marked as having used revive (event ID: \${gameId})\`);
          
          // DIRECT SAVE: If we have a valid score and address, save it now to ensure it's captured
          if (address && currentScore > 0 && supabase) {
            try {
              console.log(\`🔔 DIRECT SAVE: Saving post-revive score \${currentScore} immediately to ensure it's captured\`);
              
              // Create score object
              const scoreObject = {
                wallet_address: address.toLowerCase(),
                score: currentScore,
                created_at: new Date().toISOString(),
                game_id: currentSessionId || gameId,
                source: 'revive_used_direct_save'
              };
              
              // Use upsert to ensure we don't get duplicate records
              // This will update the score if it exists, or insert if it doesn't
              supabase
                .from('scores')
                .upsert(scoreObject, { onConflict: 'wallet_address,game_id' })
                .then((result) => {
                  const { error } = result;
                  if (error) {
                    console.error(\`❌ Error directly saving revive score: \${error.message}\`);
                  } else {
                    console.log(\`✅ Revive score \${currentScore} saved successfully via direct method\`);
                    
                    // Update high score in UI
                    if (currentScore > window.playerHighScore) {
                      window.playerHighScore = currentScore;
                      console.log(\`📊 New high score set during revive: \${currentScore}\`);
                    }
                  }
                })
                .catch(err => {
                  console.error(\`❌ Exception during direct revive score save: \${err.message}\`);
                });
            } catch (err) {
              console.error(\`❌ Error in direct revive score saving: \${err.message}\`);
            }
          }`;

// Apply the change to REVIVE_USED handler
content = content.replace(pattern, replacement);

// Now update the processGameOverAfterRevive function to also do direct score saving
// First look for the right pattern to replace
const helperPattern = /\/\/ Process the queue and wait for result[\s\S]*?const success = await window\.__GAME_TX_QUEUE\.processQueue\(walletClient, publicClient, address, supabase\);/;

// Replace with a version that doesn't rely on the queue
const helperReplacement = `// IMPROVED: Do direct score save first to ensure it's captured, then process queue
      console.log(\`⚡ CRITICAL: Direct score save for \${finalScore} during post-revive game over\`);
      
      // Direct score save that doesn't depend on the transaction queue
      let directSaveSuccess = false;
      try {
        const scoreObject = {
          wallet_address: address.toLowerCase(),
          score: finalScore,
          created_at: new Date().toISOString(),
          game_id: gameId,
          source: 'post_revive_direct'
        };
        
        const { error } = await supabase
          .from('scores')
          .upsert(scoreObject, { onConflict: 'wallet_address,game_id' });
          
        if (error) {
          console.error(\`❌ Error in direct post-revive score save: \${error.message}\`);
        } else {
          console.log(\`✅ Post-revive score \${finalScore} saved directly to database\`);
          directSaveSuccess = true;
        }
      } catch (err) {
        console.error(\`❌ Exception in direct post-revive score save: \${err.message}\`);
      }
      
      // Still use the queue for jumps tracking
      const success = await window.__GAME_TX_QUEUE.processQueue(walletClient, publicClient, address, supabase);
      
      // Consider it a success if either direct save or queue processing worked
      const overallSuccess = directSaveSuccess || success;`;

// Apply the change to the helper function
content = content.replace(helperPattern, helperReplacement);

// Write the modified content back to the file
fs.writeFileSync(appJsxPath, content, 'utf8');

console.log('Successfully added direct score saving for post-revive scores!'); 