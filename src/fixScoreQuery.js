// Fix script for score querying after revive
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the file
const appJsxPath = path.join(__dirname, 'App.jsx');
let content = fs.readFileSync(appJsxPath, 'utf8');

// Find the processQueue method where scores are inserted into the database
const pattern = /\/\/ Add the score to the database\s*try\s*{[\s\S]*?const\s*{\s*error\s*}\s*=\s*await\s*supabase[\s\S]*?\.from\(\s*['"]scores['"]\s*\)[\s\S]*?\.insert\(\s*scoreObject\s*\);/g;

// Replace with the modified version that includes debugging
const replacement = `// Add the score to the database
      try {
        console.log('SUBMITTING SCORE TO DATABASE:', scoreObject);
        console.log('CURRENT REVIVE STATUS:', {
          reviveUsedForGameId: window.__reviveUsedForGameId,
          reviveEventGameId: window.__reviveEventGameId,
          currentSessionId: window.__currentGameSessionId,
          isAfterRevive: Boolean(window.__reviveUsedForGameId)
        });

        // First check if this specific game ID already has a score
        const { data: existingData } = await supabase
          .from('scores')
          .select('id, score')
          .eq('wallet_address', address.toLowerCase())
          .eq('game_id', scoreObject.game_id)
          .maybeSingle();

        if (existingData) {
          console.log('IMPORTANT: Score already exists for this game ID, updating instead of inserting');
          
          // Only update if new score is higher
          if (scoreObject.score > existingData.score) {
            const { error } = await supabase
              .from('scores')
              .update({ score: scoreObject.score })
              .eq('id', existingData.id);
              
            if (error) {
              throw error;
            }
            console.log('UPDATED existing score record with higher score');
          } else {
            console.log('KEEPING existing score as it was higher or the same');
          }
        } else {
          // Insert a new record as normal
          console.log('INSERTING NEW score record');
          const { error } = await supabase
            .from('scores')
            .insert(scoreObject);`;

// Make the replacement
content = content.replace(pattern, replacement);

// Now update the code that fetches scores to handle the game_id field properly
// Find the fetchScoreRank method
const fetchPattern = /async function fetchScoreRank\(\) {[\s\S]*?const { data, error } = await supabase[\s\S]*?\.from\(\s*['"]scores['"]\s*\)[\s\S]*?\.select\(['"]([\s\S]*?)['"][\s\S]*?\.order\(\s*['"]score['"], { ascending: false }\)/g;

// Replace with the improved version that accounts for game_id
const fetchReplacement = 
`async function fetchScoreRank() {
      if (!address || !supabase || !playerHighScore) return;
      
      try {
        console.log("Fetching accurate score rank from Supabase with game_id awareness");
        
        // Get all scores sorted by score descending, including game_id
        const { data, error } = await supabase
          .from('scores')
          .select('wallet_address, score, game_id')
          .order('score', { ascending: false })`;

// Apply the fetch replacement
content = content.replace(fetchPattern, fetchReplacement);

// Write the modified content back to the file
fs.writeFileSync(appJsxPath, content, 'utf8');

console.log('Successfully fixed score querying to handle revived games correctly!'); 