#!/bin/bash

echo "Starting custom build script..."

# Set environment variables
export NODE_OPTIONS="--max-old-space-size=4096"
export SKIP_CANVAS=true

# Install dependencies without optional packages
echo "Installing dependencies..."
npm ci --no-optional --prefer-offline --no-audit

# Build the application
echo "Building application..."
npm run build

echo "Build completed successfully!" 