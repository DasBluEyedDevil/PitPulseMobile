#!/bin/bash
set -e

echo "Building PitPulse backend..."
cd backend
npm ci --production=false
npm run build
echo "Build complete!"
