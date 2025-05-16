import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the file
const appJsxPath = path.join(__dirname, 'App.jsx');
let content = fs.readFileSync(appJsxPath, 'utf8');

// Split content into lines to apply line-specific fix
const lines = content.split('\n');

// Find the line with "const handleIframeMessage = async (event) => {"
let handleIframeLineNum = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const handleIframeMessage = async (event) => {')) {
    handleIframeLineNum = i;
    break;
  }
}

if (handleIframeLineNum !== -1) {
  // Find try block without catch
  let tryLineNum = -1;
  for (let i = handleIframeLineNum; i < lines.length; i++) {
    if (lines[i].trim() === 'try {') {
      tryLineNum = i;
      
      // Now find the end of this try block
      let braceCount = 1;
      let endLineNum = -1;
      
      for (let j = tryLineNum + 1; j < lines.length; j++) {
        if (lines[j].includes('{')) braceCount++;
        if (lines[j].includes('}')) braceCount--;
        
        if (braceCount === 0) {
          endLineNum = j;
          break;
        }
      }
      
      // If we found the end and there's no catch after it
      if (endLineNum !== -1 && (endLineNum + 1 >= lines.length || !lines[endLineNum + 1].trim().startsWith('catch'))) {
        // Insert catch block
        lines.splice(endLineNum + 1, 0, '        catch (error) {', '          console.error("Error handling iframe message:", error);', '        }');
        console.log(`Added catch block after line ${endLineNum}`);
        break;
      }
    }
  }
}

// Join lines back together
const fixedContent = lines.join('\n');

// Write the fixed content back to the file
fs.writeFileSync(appJsxPath, fixedContent, 'utf8');

console.log('Successfully fixed missing catch clause!'); 