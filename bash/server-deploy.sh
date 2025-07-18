#!/bin/bash

# Simple deployment script without PM2 config file
# Directly start processes with PM2 commands

set -e

echo "🚀 Simple deployment of Telemedicine Chatbot..."

# Project setup
PROJECT_DIR="/var/www/telemedicine-chatbot"
echo "📁 Setting up project directory..."

# Create project directory
sudo mkdir -p $PROJECT_DIR
sudo chown -R $USER:$USER $PROJECT_DIR

# Navigate to project directory
cd $PROJECT_DIR

echo "📦 Installing dependencies..."
npm install

echo "🗄️ Setting up database..."
# Make sure PostgreSQL is running
sudo systemctl start postgresql

# Create database if it doesn't exist
sudo -u postgres psql -c "CREATE DATABASE IF NOT EXISTS telemedicine_chatbot;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE USER IF NOT EXISTS chatbot_user WITH ENCRYPTED PASSWORD 'chatbot_user';" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE telemedicine_chatbot TO chatbot_user;" 2>/dev/null || true

echo "🔧 Setting up database schema..."
npx prisma generate
npx prisma db push
npx prisma db seed

echo "🏗️ Building frontend..."
npm run build

echo "⚡ Starting servers with PM2..."

# Create logs directory
mkdir -p logs

# Stop any existing processes
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Start backend server (simplified command)
pm2 start npm --name "telemedicine-backend" -- run dev:server

# Start frontend server (simplified command) 
pm2 start npm --name "telemedicine-frontend" -- run dev:client

# Save PM2 configuration
pm2 save
pm2 startup

echo "✅ Applications started!"
echo ""
echo "📊 Check status:"
echo "pm2 status"
echo "pm2 logs telemedicine-frontend"
echo "pm2 logs telemedicine-backend"
echo ""
echo "🌐 Application should be running on:"
echo "Frontend dev server: http://localhost:3000"
echo "Backend API: http://localhost:3001"
echo ""
echo "⚠️ Don't forget to:"
echo "1. Edit .env with your actual API keys"
echo "2. Update nginx configuration"
echo "3. Test the application"
echo ""
echo "🧪 Test the deployment:"
echo "curl http://localhost:3001/health"
echo "curl -I http://localhost:3000"
echo "curl -I https://telemedicine.kecamatanbayan.id"