import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the file
const appJsxPath = path.join(__dirname, 'App.jsx');
let content = fs.readFileSync(appJsxPath, 'utf8');

// 1. COMPLETELY REPLACE the REVIVE_USED handler with a robust implementation
const reviveUsedPattern = /if \(event\.data\.type === 'REVIVE_USED'\) {[\s\S]*?}\s*}/;

const reviveUsedReplacement = `if (event.data.type === 'REVIVE_USED') {
          console.log("🔴 REVIVE_USED EVENT RECEIVED - IMPLEMENTING CRITICAL FIX");
          // Get current score from all possible sources
          const currentScore = event.data.score || 
                              (event.data.data && event.data.data.score) || 
                              window.__LATEST_SCORE || 
                              0;
          
          // Get the game ID from all possible sources
          const gameSessionId = window.__currentGameSessionId || "unknown";
          const eventGameId = event.data.gameId || 
                             (event.data.data && event.data.data.gameId) || 
                             "unknown";
          
          // IMPORTANT: Store ALL game IDs for tracking
          window.__reviveUsedForGameId = gameSessionId;
          window.__reviveEventGameId = eventGameId;
          window.__LATEST_GAME_SESSION = gameSessionId;
          
          console.log(\`🔴 REVIVE_USED: Current score: \${currentScore}, Session ID: \${gameSessionId}, Event ID: \${eventGameId}\`);
          
          // DIRECT DATABASE SAVE: This is a critical fallback
          if (address && currentScore > 0 && supabase) {
            console.log(\`🔴 DIRECT SAVE: Attempting direct DB save of score \${currentScore}\`);
            
            // First check if this score is worth saving (compare with existing high score)
            const checkExistingScore = async () => {
              try {
                const { data: existingHighScore } = await supabase
                  .from('scores')
                  .select('score')
                  .eq('wallet_address', address.toLowerCase())
                  .order('score', { ascending: false })
                  .limit(1)
                  .maybeSingle();
                
                const highestSavedScore = existingHighScore?.score || 0;
                
                if (currentScore > highestSavedScore) {
                  console.log(\`🔴 Score \${currentScore} is higher than existing high score \${highestSavedScore}, saving\`);
                  
                  // Create score object with all necessary data
                  const scoreObject = {
                    wallet_address: address.toLowerCase(),
                    score: currentScore,
                    created_at: new Date().toISOString(),
                    game_id: gameSessionId,
                    source: 'revive_used_direct_v2',
                    revive_event_id: eventGameId
                  };
                  
                  // First attempt to see if a record with this game_id exists
                  const { data: existingRecord } = await supabase
                    .from('scores')
                    .select('id, score')
                    .eq('wallet_address', address.toLowerCase())
                    .eq('game_id', gameSessionId)
                    .maybeSingle();
                  
                  if (existingRecord) {
                    // Update existing record if new score is higher
                    if (currentScore > existingRecord.score) {
                      const { error } = await supabase
                        .from('scores')
                        .update({ score: currentScore, source: 'revive_used_update_v2' })
                        .eq('id', existingRecord.id);
                      
                      if (error) {
                        throw new Error(\`Error updating score: \${error.message}\`);
                      }
                      
                      console.log(\`🔴 ✅ Updated existing score record to \${currentScore}\`);
                    } else {
                      console.log(\`🔴 Existing score \${existingRecord.score} is higher, not updating\`);
                    }
                  } else {
                    // Insert new record
                    const { error } = await supabase
                      .from('scores')
                      .insert(scoreObject);
                    
                    if (error) {
                      throw new Error(\`Error inserting score: \${error.message}\`);
                    }
                    
                    console.log(\`🔴 ✅ Inserted new score record of \${currentScore}\`);
                  }
                  
                  // Force update UI
                  window.playerHighScore = Math.max(window.playerHighScore || 0, currentScore);
                  
                  // Force store for redundancy
                  try {
                    localStorage.setItem('latestHighScore', currentScore.toString());
                    localStorage.setItem('lastSavedScore', currentScore.toString());
                  } catch (e) {
                    // Ignore storage errors
                  }
                  
                  return true;
                } else {
                  console.log(\`🔴 Score \${currentScore} is not higher than existing high score \${highestSavedScore}, skipping save\`);
                  return false;
                }
              } catch (error) {
                console.error(\`🔴 ❌ Error in checking/saving score: \${error.message}\`);
                return false;
              }
            };
            
            // Execute the async function
            checkExistingScore()
              .then(saved => {
                console.log(\`🔴 Direct save during REVIVE_USED completed, success: \${saved}\`);
              })
              .catch(err => {
                console.error(\`🔴 ❌ Error in checkExistingScore: \${err.message}\`);
              });
          }
          
          // Reset processing flags
          if (window.__GAME_OVER_PROCESSED) {
            if (window.__GAME_OVER_PROCESSED.resetSession) {
              window.__GAME_OVER_PROCESSED.resetSession(gameSessionId);
              if (gameSessionId !== eventGameId) {
                window.__GAME_OVER_PROCESSED.resetSession(eventGameId);
              }
            }
            window.__GAME_OVER_PROCESSED.resetProcessing();
            console.log("🔴 Reset game over processing state");
          }
          
          // Also reset transaction flags
          window.__gameOverTransactionSent = null;
          window.__GLOBAL_TRANSACTION_IN_PROGRESS = false;
          console.log("🔴 Reset transaction flags");
        }`;

// Apply the REVIVE_USED handler replacement
content = content.replace(reviveUsedPattern, reviveUsedReplacement);

// 2. Replace the GAME_OVER handler to ensure it saves scores after revive
const gameOverPattern = /if \(event\.data\.type === 'gameOver' \|\| event\.data\.type === 'GAME_OVER'\) {[\s\S]*?const hasUsedRevive[\s\S]*?window\.__reviveUsedForGameId === gameId;/;

const gameOverReplacement = `if (event.data.type === 'gameOver' || event.data.type === 'GAME_OVER') {
          console.log("🔵 GAME_OVER EVENT RECEIVED - IMPLEMENTING FIX");
          // Get the final score
          const finalScore = event.data.score || 
                            (event.data.data && event.data.data.score) || 
                            0;
          
          // Always check multiple game ID possibilities
          const gameId = event.data.gameId || 
                        (event.data.data && event.data.data.gameId) || 
                        window.__LATEST_GAME_SESSION || 
                        String(Date.now());
                        
          console.log(\`🔵 GAME_OVER: Score: \${finalScore}, Game ID: \${gameId}\`);
          
          // RETRIEVE ALL POSSIBLE SESSION IDs
          const currentSession = window.__currentGameSessionId;
          const reviveSession = window.__reviveUsedForGameId;
          const reviveEventId = window.__reviveEventGameId;
          
          console.log(\`🔵 SESSION IDS: Current: \${currentSession}, Revive: \${reviveSession}, Event: \${reviveEventId}\`);
          
          // Determine if this is after a revive
          const hasUsedRevive = event.data.hasUsedRevive || 
                              (event.data.data && event.data.data.hasUsedRevive) || 
                              Boolean(window.__reviveUsedForGameId) ||
                              gameId === window.__reviveEventGameId ||
                              gameId === window.__reviveUsedForGameId;`;

// Apply the GAME_OVER handler replacement
content = content.replace(gameOverPattern, gameOverReplacement);

// 3. Update the processQueue method in the tx system to handle scores properly
const processQueuePattern = /\/\/ Add the score to the database[\s\S]*?try\s*{[\s\S]*?const\s*{\s*error\s*}\s*=\s*await\s*supabase[\s\S]*?\.from\(\s*['"]scores['"]\s*\)[\s\S]*?\.insert\(\s*scoreObject\s*\);/;

const processQueueReplacement = `// Add the score to the database
      try {
        console.log('⭐ SUBMITTING SCORE TO DATABASE:', scoreObject);
        console.log('⭐ REVIVE STATUS:', {
          reviveUsedForGameId: window.__reviveUsedForGameId,
          reviveEventGameId: window.__reviveEventGameId,
          currentSessionId: window.__currentGameSessionId,
          isAfterRevive: Boolean(window.__reviveUsedForGameId)
        });

        // IMPROVED: First get highest existing score for comparison
        const { data: highestExistingScore } = await supabase
          .from('scores')
          .select('score')
          .eq('wallet_address', address.toLowerCase())
          .order('score', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        const currentHighScore = highestExistingScore?.score || 0;
        console.log(\`⭐ Current high score in database: \${currentHighScore}\`);
        
        // Always save in case of revive
        const forceInsert = window.__reviveUsedForGameId || window.__FORCE_SCORE_SAVE;
        
        if (forceInsert || scoreValue > currentHighScore) {
          console.log(\`⭐ Saving score \${scoreValue} because \${forceInsert ? 'FORCE_INSERT was set' : 'it is higher than current high score'}\`);
          
          // Check if this specific game session already has a score
          const { data: existingGameRecord } = await supabase
            .from('scores')
            .select('id, score')
            .eq('wallet_address', address.toLowerCase())
            .eq('game_id', scoreObject.game_id)
            .maybeSingle();
            
            if (existingGameRecord) {
              console.log(\`⭐ Found existing record for this game session with score \${existingGameRecord.score}\`);
              
              // Only update if the new score is higher
              if (scoreValue > existingGameRecord.score) {
                console.log(\`⭐ Updating existing record because new score is higher\`);
                const { error } = await supabase
                  .from('scores')
                  .update({ 
                    score: scoreValue,
                    updated_at: new Date().toISOString(),
                    source: 'update_higher_score'
                  })
                  .eq('id', existingGameRecord.id);
                
                if (error) {
                  throw new Error(\`Error updating score: \${error.message}\`);
                }
                
                console.log(\`⭐ ✅ Successfully updated score to \${scoreValue}\`);
              } else {
                console.log(\`⭐ Not updating because existing score \${existingGameRecord.score} is higher\`);
              }
            } else {
              console.log(\`⭐ No existing record for this game session, inserting new score\`);
              
              // Add revive info to the score object
              if (window.__reviveUsedForGameId) {
                scoreObject.revive_used = true;
                scoreObject.revive_session_id = window.__reviveUsedForGameId;
                if (window.__reviveEventGameId) {
                  scoreObject.revive_event_id = window.__reviveEventGameId;
                }
              }
              
              // Add source for tracking
              scoreObject.source = window.__reviveUsedForGameId ? 'post_revive_insert' : 'regular_insert';
              
              // Insert the new score
              const { error } = await supabase
                .from('scores')
                .insert(scoreObject);
            }
          }
        }`;

// Apply the processQueue method replacement
content = content.replace(processQueuePattern, processQueueReplacement);

// 4. Add a final success message with additional score validation
const scoreRecordedPattern = /console\.log\(`✅ Score recorded successfully in database`\);/;

const scoreRecordedReplacement = `console.log(\`✅ Score recorded successfully in database\`);
                
                // VERIFY SCORE WAS ACTUALLY SAVED
                setTimeout(async () => {
                  try {
                    const { data: verifyData } = await supabase
                      .from('scores')
                      .select('score')
                      .eq('wallet_address', address.toLowerCase())
                      .eq('game_id', scoreObject.game_id)
                      .maybeSingle();
                      
                    if (verifyData) {
                      console.log(\`✅ VERIFIED: Score \${verifyData.score} is in database for game \${scoreObject.game_id}\`);
                      
                      // Update high score if needed
                      window.playerHighScore = Math.max(window.playerHighScore || 0, verifyData.score);
                      
                      // Global flag for verified save
                      window.__SCORE_VERIFIED = true;
                    } else {
                      console.error(\`❌ VERIFICATION FAILED: Score not found in database after save!\`);
                      
                      // Retry save as a last resort
                      window.__FORCE_SCORE_SAVE = true;
                      const retryScoreObject = {...scoreObject, source: 'verification_retry'};
                      const { error: retryError } = await supabase
                        .from('scores')
                        .insert(retryScoreObject);
                        
                      if (retryError) {
                        console.error(\`❌ RETRY FAILED: \${retryError.message}\`);
                      } else {
                        console.log(\`✅ RETRY SUCCEEDED: Score saved in second attempt\`);
                      }
                    }
                  } catch (verifyError) {
                    console.error(\`❌ Error verifying score: \${verifyError.message}\`);
                  }
                }, 2000); // Check after 2 seconds`;

// Apply the success message replacement
content = content.replace(scoreRecordedPattern, scoreRecordedReplacement);

// 5. Update the fallback direct insert to include retry mechanism
const lastResortPattern = /console\.log\('Attempting direct score insert as last resort\.\.\.'\);[\s\S]*?const { data, error } = await supabase[\s\S]*?\.from\('scores'\)[\s\S]*?\.insert\({[\s\S]*?}\);/;

const lastResortReplacement = `console.log('⚠️ Attempting direct score insert as last resort...');
                    const lastResortObject = {
                      wallet_address: address.toLowerCase(),
                      score: scoreValue,
                      created_at: new Date().toISOString(),
                      game_id: sessionId || window.__currentGameSessionId || String(Date.now()),
                      source: 'last_resort_direct_insert',
                      revive_used: Boolean(window.__reviveUsedForGameId)
                    };
                    
                    // First check if this is a new high score
                    const { data: highScoreCheck } = await supabase
                      .from('scores')
                      .select('score')
                      .eq('wallet_address', address.toLowerCase())
                      .order('score', { ascending: false })
                      .limit(1)
                      .maybeSingle();
                      
                    const currentHighScore = highScoreCheck?.score || 0;
                    
                    // Always save if it's a revive score
                    if (window.__reviveUsedForGameId || scoreValue > currentHighScore) {
                      console.log(\`⚠️ Last resort save for score \${scoreValue} (current high: \${currentHighScore})\`);
                      const { data, error } = await supabase
                        .from('scores')
                        .insert(lastResortObject);`;

// Apply the last resort insert replacement
content = content.replace(lastResortPattern, lastResortReplacement);

// 6. Initialize forced save flags on startup
const startupPattern = /\/\/ Initialize tracking variables for scores and jumps/;

const startupReplacement = `// Initialize tracking variables for scores and jumps
  window.__FORCE_SCORE_SAVE = false;
  window.__SCORE_VERIFIED = false;`;

// Apply the startup pattern replacement
content = content.replace(startupPattern, startupReplacement);

// Write the fixed content back to the file
fs.writeFileSync(appJsxPath, content, 'utf8');

console.log('Successfully implemented FINAL comprehensive fix for score saving after revive!'); 