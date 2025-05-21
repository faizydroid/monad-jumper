import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config
const sourceImagesDir = path.join(__dirname, '../public/images');
const outputDir = path.join(__dirname, '../public/farcaster');
const frameThumbnailSize = { width: 1200, height: 800 }; // 3:2 ratio as recommended
const splashIconSize = { width: 200, height: 200 }; // Square as required

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Function to resize and save an image
async function processImage(inputPath, outputPath, width, height) {
  try {
    // Load the image
    const image = await loadImage(inputPath);
    
    // Create canvas with desired dimensions
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Fill with background color in case image doesn't cover the whole canvas
    ctx.fillStyle = '#f7f7f7';
    ctx.fillRect(0, 0, width, height);
    
    // Calculate scaling factors
    const scaleX = width / image.width;
    const scaleY = height / image.height;
    const scale = Math.max(scaleX, scaleY); // Cover the canvas
    
    // Calculate new dimensions
    const newWidth = image.width * scale;
    const newHeight = image.height * scale;
    
    // Calculate centering
    const x = (width - newWidth) / 2;
    const y = (height - newHeight) / 2;
    
    // Draw the image centered and scaled
    ctx.drawImage(image, x, y, newWidth, newHeight);
    
    // Write to file
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    
    console.log(`Created ${outputPath}`);
    
    // Check file size
    const stats = fs.statSync(outputPath);
    const fileSizeMB = stats.size / (1024 * 1024);
    console.log(`File size: ${fileSizeMB.toFixed(2)} MB`);
    
    if ((width === frameThumbnailSize.width && fileSizeMB > 10) || 
        (width === splashIconSize.width && fileSizeMB > 1)) {
      console.warn(`WARNING: File size exceeds Farcaster limits for ${outputPath}`);
    }
    
    return { success: true, path: outputPath, size: fileSizeMB };
  } catch (error) {
    console.error(`Error processing image ${inputPath}:`, error);
    return { success: false, error };
  }
}

// Main function to process required images
async function prepareFrameImages() {
  console.log('Preparing Farcaster frame images...');
  
  // Process thumbnail image (3:2 ratio)
  const thumbnailSource = path.join(sourceImagesDir, 'monad0.png');
  const thumbnailOutput = path.join(outputDir, 'frame-thumbnail.png');
  await processImage(thumbnailSource, thumbnailOutput, frameThumbnailSize.width, frameThumbnailSize.height);
  
  // Process splash icon (square 200x200)
  const iconSource = path.join(sourceImagesDir, 'monad1.png');
  const iconOutput = path.join(outputDir, 'splash-icon.png');
  await processImage(iconSource, iconOutput, splashIconSize.width, splashIconSize.height);
  
  console.log('Done preparing Farcaster frame images!');
}

// Run the script
prepareFrameImages().catch(err => {
  console.error('Error in script execution:', err);
  process.exit(1);
}); 