#!/bin/bash

# PM2 Deployment Reset Script
# Safely resets deployment managed by PM2

set -e

echo "🔄 PM2 Telemedicine Chatbot - Deployment Reset"
echo "=============================================="
echo ""
echo "⚠️  WARNING: This will delete ALL data in the database!"
echo "⚠️  Make sure you have backups before proceeding!"
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed or not in PATH"
    echo "   Install PM2: npm install -g pm2"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Prompt for confirmation
read -p "Are you sure you want to reset the PM2 deployment? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Reset cancelled."
    exit 1
fi

echo ""
echo "🔄 Starting PM2 deployment reset..."

# Show current PM2 status
echo "📊 Current PM2 status:"
pm2 list

# Stop PM2 processes
echo ""
echo "🛑 Stopping PM2 processes..."
pm2 stop all

# Wait a moment for processes to stop
sleep 2

# Create backup
echo ""
echo "💾 Creating database backup..."
if [ -f "./scripts/backup-database.sh" ]; then
    ./scripts/backup-database.sh
else
    echo "⚠️  Backup script not found, skipping backup"
fi

# Install/update dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Reset database
echo ""
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

# Build application (if needed)
echo "🏗️  Building application..."
if [ -f "vite.config.ts" ] || [ -f "vite.config.js" ]; then
    npm run build
fi

# Restart PM2 processes
echo ""
echo "🚀 Restarting PM2 processes..."
pm2 restart all

# Wait for processes to start
echo "⏳ Waiting for processes to start..."
sleep 5

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Show final status
echo ""
echo "📊 Final PM2 status:"
pm2 list

# Show logs for verification
echo ""
echo "📋 Recent logs (last 10 lines):"
pm2 logs --lines 10 --nostream

echo ""
echo "✅ PM2 deployment reset completed successfully!"
echo ""
echo "📋 Summary:"
echo "   - PM2 processes stopped and restarted"
echo "   - Database reset and re-seeded"
echo "   - PM2 configuration saved"
echo ""
echo "🔧 Useful PM2 commands:"
echo "   pm2 list              - Show process status"
echo "   pm2 logs              - Show logs"
echo "   pm2 monit             - Monitor processes"
echo "   pm2 restart all       - Restart all processes"
echo ""
echo "🔐 Default admin credentials:"
echo "   Email: admin@example.com"
echo "   Password: admin123"
echo ""