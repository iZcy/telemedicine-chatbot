#!/bin/bash

# Docker Deployment Reset Script
# For containerized deployments

set -e

echo "🐳 Docker Deployment Reset"
echo "=========================="

# Stop and remove containers
echo "🛑 Stopping containers..."
docker-compose down --volumes --remove-orphans

# Remove images (optional - uncomment if you want to rebuild from scratch)
# echo "🗑️  Removing images..."
# docker-compose down --rmi all

# Remove volumes (this deletes all data!)
echo "🗄️  Removing volumes (all data will be lost)..."
docker volume prune -f

# Rebuild and start
echo "🏗️  Rebuilding containers..."
docker-compose build --no-cache

echo "🚀 Starting containers..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database setup
echo "🗄️  Setting up database..."
docker-compose exec app npm run db:push
docker-compose exec app npm run db:seed

echo "✅ Docker deployment reset completed!"
echo ""
echo "🔗 Application should be available at: http://localhost:3000"
echo "🔗 API should be available at: http://localhost:3001"