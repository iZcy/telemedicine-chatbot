#!/bin/bash

# Telemedicine Chatbot Deployment Script
# Run this script in your project directory

set -e  # Exit on any error

PROJECT_DIR="/var/www/telemedicine-chatbot"
BACKUP_DIR="/var/backups/telemedicine-chatbot"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🚀 Starting deployment of Telemedicine Chatbot..."

# Create backup directory
sudo mkdir -p $BACKUP_DIR

# Backup existing deployment if it exists
if [ -d "$PROJECT_DIR" ]; then
    echo "📦 Creating backup of existing deployment..."
    sudo cp -r $PROJECT_DIR $BACKUP_DIR/backup_$DATE
fi

# Create project directory
sudo mkdir -p $PROJECT_DIR
sudo chown -R $USER:$USER $PROJECT_DIR

# Copy application files
echo "📁 Copying application files..."
cp -r . $PROJECT_DIR/
cd $PROJECT_DIR

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Build the frontend
echo "🏗️ Building frontend..."
npm run build

# Set up environment
echo "⚙️ Setting up environment..."
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.production .env
    echo "⚠️ IMPORTANT: Edit .env file with your actual configuration values!"
    echo "Run: nano $PROJECT_DIR/.env"
fi

# Set up database
echo "🗄️ Setting up database..."
npx prisma generate
npx prisma db push
npx prisma db seed

# Create PM2 ecosystem file
echo "📝 Creating PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'telemedicine-chatbot',
    script: 'server/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Set proper permissions
sudo chown -R $USER:$USER $PROJECT_DIR
sudo chmod -R 755 $PROJECT_DIR

# Stop existing PM2 process if running
pm2 stop telemedicine-chatbot 2>/dev/null || true
pm2 delete telemedicine-chatbot 2>/dev/null || true

# Start the application with PM2
echo "🔄 Starting application with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Verify deployment
echo "✅ Verifying deployment..."
sleep 5

# Check if the server is running
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend server is running successfully!"
else
    echo "❌ Backend server failed to start. Check logs with: pm2 logs telemedicine-chatbot"
    exit 1
fi

# Test AI service
echo "🤖 Testing AI service..."
if curl -f http://localhost:3001/health/ai > /dev/null 2>&1; then
    echo "✅ AI service is configured correctly!"
else
    echo "⚠️ AI service test failed. Check your DEEPSEEK_API_KEY configuration."
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update nginx configuration if needed"
echo "2. Restart nginx: sudo systemctl reload nginx"
echo "3. Check SSL certificate for telemedicine.kecamatanbayan.id"
echo "4. Configure firewall to allow ports 80, 443, and 3001"
echo "5. Set up log rotation for application logs"
echo ""
echo "📊 Management commands:"
echo "- View logs: pm2 logs telemedicine-chatbot"
echo "- Restart app: pm2 restart telemedicine-chatbot"
echo "- Stop app: pm2 stop telemedicine-chatbot"
echo "- Monitor: pm2 monit"
echo ""
echo "🌐 Application URLs:"
echo "- Frontend: https://telemedicine.kecamatanbayan.id"
echo "- Backend API: https://telemedicine.kecamatanbayan.id/api"
echo "- Health Check: https://telemedicine.kecamatanbayan.id/health"
echo "- Admin Panel: https://telemedicine.kecamatanbayan.id/admin"