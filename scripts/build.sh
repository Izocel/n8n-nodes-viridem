#!/bin/bash
set -e

echo "🚀 Building n8n Viridem node..."

# Run TypeScript compilation
echo "📦 Compiling TypeScript..."
npx tsc

# move assets to dist
echo "📦 Moving assets..."
mkdir -p dist/assets
cp -R src/assets dist

# Copy .env file
echo "📋 Copying .env file..."
cp .env dist/.env

# Copy package.json file
echo "📋 Copying package.json file..."
cp package.json dist/package.json

echo "✅ Build complete! Files are in dist/"
