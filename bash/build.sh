#!/bin/bash

# Production build script for telemedicine chatbot
# Run this in your development environment before uploading

echo "🏗️ Building Telemedicine Chatbot for Production..."

# Clean previous builds
rm -rf dist/
rm -rf node_modules/

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Generate Prisma client
echo "🗄️ Generating Prisma client..."
npx prisma generate

# Build TypeScript files for server
echo "⚙️ Building server..."
npx tsc --project tsconfig.json --outDir dist/server

# Copy server files that aren't TypeScript
cp -r server/lib/*.js dist/server/lib/ 2>/dev/null || true
cp server/package.json dist/server/ 2>/dev/null || true

# Build React frontend
echo "🎨 Building frontend..."
npm run build

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf telemedicine-chatbot-production.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='*.log' \
  --exclude='.env*' \
  --exclude='coverage' \
  --exclude='*.test.*' \
  --exclude='*.spec.*' \
  package.json \
  package-lock.json \
  dist/ \
  server/ \
  prisma/ \
  public/ \
  ecosystem.config.js \
  README.md

echo "✅ Build completed!"
echo "📁 Deployment package: telemedicine-chatbot-production.tar.gz"
echo ""
echo "📋 Upload instructions:"
echo "1. Upload the tar.gz file to your server"
echo "2. Extract: tar -xzf telemedicine-chatbot-production.tar.gz"
echo "3. Run the deployment script"
echo "4. Configure environment variables"
echo "5. Start with PM2"