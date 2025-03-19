// ES Module syntax
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function copyPublicFiles() {
  try {
    console.log('Running prebuild script...');
    
    // Create dist directory if it doesn't exist
    await fs.mkdir('dist', { recursive: true }).catch(() => {});
    
    // Copy public directory to dist if it exists
    try {
      await fs.access('public');
      await copyDir('public', 'dist');
      console.log('Public directory copied to dist');
    } catch (err) {
      console.log('No public directory found, skipping copy');
    }
    
    console.log('Prebuild completed successfully');
  } catch (error) {
    console.error('Prebuild error:', error);
    // Don't exit with error code to allow build to continue
    console.log('Continuing with build despite prebuild issues');
  }
}

async function copyDir(src, dest) {
  try {
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await fs.mkdir(destPath, { recursive: true }).catch(() => {});
        await copyDir(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath).catch((err) => {
          console.log(`Warning: Could not copy ${srcPath}: ${err.message}`);
        });
      }
    }
  } catch (err) {
    console.error(`Error copying directory ${src} to ${dest}:`, err);
  }
}

// Run the script
copyPublicFiles(); 