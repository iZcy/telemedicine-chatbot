#!/bin/bash

# Reset Deployment Script
# WARNING: This will delete ALL data in the database!

set -e  # Exit on any error

echo "🔄 Telemedicine Chatbot - Deployment Reset Script"
echo "=================================================="
echo ""
echo "⚠️  WARNING: This will delete ALL data in the database!"
echo "⚠️  Make sure you have backups before proceeding!"
echo ""

# Prompt for confirmation
read -p "Are you sure you want to reset the deployment? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Reset cancelled."
    exit 1
fi

echo ""
echo "🔄 Starting deployment reset..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found. Please create it first."
    exit 1
fi

# Stop any running processes
echo "🛑 Stopping any running processes..."
pkill -f "npm run dev" || true
pkill -f "node.*server" || true

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Reset database
echo "🗄️  Resetting database..."
echo "   - Dropping all tables..."
echo "   - Recreating schema..."
npx prisma db push --force-reset

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Seed database
echo "🌱 Seeding database with initial data..."
npm run db:seed

# Build application
echo "🏗️  Building application..."
npm run build

echo ""
echo "✅ Deployment reset completed successfully!"
echo ""
echo "📋 Summary:"
echo "   - Database reset and re-seeded"
echo "   - Prisma client regenerated"
echo "   - Application built"
echo ""
echo "🚀 You can now start the application:"
echo "   Development: npm run dev"
echo "   Production:  npm run server"
echo ""
echo "🔐 Default admin credentials:"
echo "   Email: admin@example.com"
echo "   Password: admin123"
echo ""