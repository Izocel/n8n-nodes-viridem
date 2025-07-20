#!/bin/bash
set -e

echo "🚀 Building n8n Viridem node..."
rm -rf dist

echo "📦 Compiling TypeScript..."
npx tsc

echo "📦 Moving assets..."
mkdir -p dist/assets
cp -R src/assets dist

echo "📋 Moving environments..."
cp .env* dist/ 2>/dev/null || echo "No .env files found..."

echo "📋 Moving package.json..."
cp package.json dist/package.json

echo "✅ Build complete! Files are in dist/"
