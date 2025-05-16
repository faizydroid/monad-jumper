import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the file
const appJsxPath = path.join(__dirname, 'App.jsx');
let content = fs.readFileSync(appJsxPath, 'utf8');

// Find the problematic code pattern: else block followed by catch
const pattern = /}\s*else\s*{\s*console\.log\(`Score \${scoreValue} not saved - lower than existing high score \${existingScore\.score}`\);\s*}\s*catch\s*\(dbError\)\s*{/;

// Correct syntax: ensure catch is associated with a try block
const replacement = `} else {
                console.log(\`Score \${scoreValue} not saved - lower than existing high score \${existingScore.score}\`);
              }
            } catch (dbError) {`;

// Apply the fix
content = content.replace(pattern, replacement);

// Write the fixed content back to the file
fs.writeFileSync(appJsxPath, content, 'utf8');

console.log('Successfully fixed syntax error at line 1734 in App.jsx!'); 