#!/bin/bash

# Simple deployment script - build and run directly on server
# Much simpler approach for development/small production environments

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

# If this is first time, clone or copy your project
# git clone your-repo-url . 
# OR copy your files here

echo "📦 Installing dependencies..."
npm install

echo "🗄️ Setting up database..."
# Make sure PostgreSQL is running
sudo systemctl start postgresql

# Create database if it doesn't exist
sudo -u postgres psql -c "CREATE DATABASE IF NOT EXISTS telemedicine_chatbot;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE USER IF NOT EXISTS chatbot_user WITH ENCRYPTED PASSWORD 'your_password';" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE telemedicine_chatbot TO chatbot_user;" 2>/dev/null || true

# Set up environment file
echo "⚙️ Setting up environment..."
cat > .env << 'EOF'
# Database
DATABASE_URL="postgresql://chatbot_user:your_password@localhost:5432/telemedicine_chatbot"

# DeepSeek AI
DEEPSEEK_API_KEY="your-deepseek-api-key"

# JWT & Auth
JWT_SECRET="your-jwt-secret-key"
ADMIN_EMAIL="admin@kecamatanbayan.id"
ADMIN_PASSWORD="admin123"

# App Config
NODE_ENV="development"
PORT=3001
CLIENT_URL="https://telemedicine.kecamatanbayan.id"

# WhatsApp
ENABLE_WHATSAPP="true"
EOF

echo "🔧 Setting up database schema..."
npx prisma generate
npx prisma db push
npx prisma db seed

echo "🏗️ Building frontend..."
npm run build

echo "⚡ Starting servers with PM2..."

# Create PM2 ecosystem for both frontend and backend
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'telemedicine-frontend',
      script: 'npm',
      args: 'run dev:client',
      cwd: '/var/www/telemedicine-chatbot',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      error_file: './logs/frontend-err.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true
    },
    {
      name: 'telemedicine-backend',
      script: 'npm',
      args: 'run dev:server',
      cwd: '/var/www/telemedicine-chatbot',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      error_file: './logs/backend-err.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true
    }
  ]
};
EOF

# Create logs directory
mkdir -p logs

# Stop any existing processes
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Start both frontend and backend
pm2 start ecosystem.config.js
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