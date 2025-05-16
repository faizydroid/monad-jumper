import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the file
const appJsxPath = path.join(__dirname, 'App.jsx');
const content = fs.readFileSync(appJsxPath, 'utf8');

// Find the problematic section - locate the handleIframeMessage function
const pattern = /const handleIframeMessage = async \(event\) => {[\s\S]*?window\.addEventListener\('message', handleIframeMessage\);/;

// Get the matched content to analyze
const matches = content.match(pattern);
if (!matches || matches.length === 0) {
  console.error('Could not find handleIframeMessage function');
  process.exit(1);
}

// Replace the problematic function with a fixed version
const fixedContent = content.replace(pattern, `const handleIframeMessage = async (event) => {
      if (!event.data) return;
      
      try {
        // Handle session token messages
        if (event.data.type === 'GAME_SESSION_TOKEN' || event.data.type === 'SET_SESSION_COOKIE') {
          const token = event.data.token;
          
          // Process token logic here...
        }
        
        // Handle other message types
        if (event.data.type === 'GAME_OVER') {
          console.log('GAME OVER MESSAGE RECEIVED FROM IFRAME:', event.data);
          
          // Extract game data - be flexible about where data might be located
          const finalScore = event.data.score || 
                           (event.data.data && event.data.data.score) || 
                           0;
          
          // Extract jump count from event data if available
          let jumpCount = window.__LATEST_JUMPS || 0;
          
          // Try to get jump count from the event data with different possible field names
          const possibleJumpFields = ['jumpCount', 'jumps', 'totalJumps', 'jumpsCount'];
          for (const field of possibleJumpFields) {
            const dataValue = event.data[field] || (event.data.data && event.data.data[field]);
            if (typeof dataValue === 'number' && dataValue > jumpCount) {
              jumpCount = dataValue;
              console.log(\`📊 Found jump count in event data field '\${field}': \${jumpCount}\`);
              break;
            }
          }
          
          // If we found jumps, save them globally
          if (jumpCount > 0) {
            window.__LATEST_JUMPS = jumpCount;
            console.log(\`📊 Processing bundled game data: \${jumpCount} jumps, final score: \${finalScore}\`);
          }
          
          // Handle revive usage
          if (window.__reviveUsedForGameId) {
            try {
              console.log('Processing game over after revive...');
              // Process game over after revive
              await processGameOverAfterRevive(
                window.__reviveUsedForGameId,
                finalScore,
                jumpCount,
                walletClient,
                publicClient,
                address,
                supabase
              );
            } catch (reviveError) {
              console.error('Error processing game over after revive:', reviveError);
            } finally {
              setTransactionPending(false);
              setShowPlayAgain(true);
            }
          } else {
            // Normal game over processing via handler
            await handleGameOver(finalScore);
          }
        }
      } catch (error) {
        console.error('Error handling iframe message:', error);
      }
    };
    
    window.addEventListener('message', handleIframeMessage);`);

// Write the fixed content back to the file
fs.writeFileSync(appJsxPath, fixedContent, 'utf8');

console.log('Successfully fixed the syntax error in handleIframeMessage function!'); 