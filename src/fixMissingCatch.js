import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the file
const appJsxPath = path.join(__dirname, 'App.jsx');
let content = fs.readFileSync(appJsxPath, 'utf8');

// Find the problematic pattern - a try block without catch at line 2888
// We're looking for the handleIframeMessage function with a try without catch
const pattern = /const handleIframeMessage = async \(event\) => {[\s\S]*?if \(!event.data\) return;\s*\s*try {[\s\S]*?}[\s\S]*?};/;

// Examine the matched content to confirm we have the right spot
const matches = content.match(pattern);
if (matches && matches.length > 0) {
  const matchedContent = matches[0];
  
  // Check if there's no catch clause
  if (!matchedContent.includes('catch (')) {
    // Find the end of the try block
    const lastBraceIndex = matchedContent.lastIndexOf('}');
    
    // Add a catch clause before the final closing brace
    const fixedContent = matchedContent.substring(0, lastBraceIndex + 1) + 
      `
        catch (error) {
          console.error('Error handling iframe message:', error);
        }` + 
      matchedContent.substring(lastBraceIndex + 1);
    
    // Replace the broken code with the fixed version
    content = content.replace(pattern, fixedContent);
  }
}

// Write the fixed content back to the file
fs.writeFileSync(appJsxPath, content, 'utf8');

console.log('Successfully fixed missing catch clause at line 2888!'); 