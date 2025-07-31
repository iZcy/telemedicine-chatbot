#!/bin/bash

# Server Setup Script for Telemedicine Chatbot
# This script sets up the server environment for PM2 deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Update system packages
update_system() {
    print_status "Updating system packages..."
    sudo apt update && sudo apt upgrade -y
    print_success "System packages updated"
}

# Install Node.js and npm
install_nodejs() {
    if command -v node &> /dev/null; then
        print_status "Node.js is already installed: $(node --version)"
        return
    fi
    
    print_status "Installing Node.js..."
    
    # Install NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    print_success "Node.js installed: $(node --version)"
    print_success "npm installed: $(npm --version)"
}

# Install PM2
install_pm2() {
    if command -v pm2 &> /dev/null; then
        print_status "PM2 is already installed: $(pm2 --version)"
        return
    fi
    
    print_status "Installing PM2..."
    sudo npm install -g pm2
    print_success "PM2 installed: $(pm2 --version)"
}

# Install system dependencies
install_dependencies() {
    print_status "Installing system dependencies..."
    
    sudo apt-get install -y \
        curl \
        wget \
        git \
        build-essential \
        python3 \
        python3-pip \
        nginx \
        postgresql \
        postgresql-contrib \
        redis-server \
        htop \
        unzip \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release
    
    print_success "System dependencies installed"
}

# Setup PostgreSQL
setup_postgresql() {
    print_status "Setting up PostgreSQL..."
    
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    # Create database and user (you'll need to set these up manually)
    print_warning "Please create your PostgreSQL database and user manually:"
    echo "  sudo -u postgres psql"
    echo "  CREATE DATABASE telemedicine_chatbot;"
    echo "  CREATE USER your_user WITH ENCRYPTED PASSWORD 'your_password';"
    echo "  GRANT ALL PRIVILEGES ON DATABASE telemedicine_chatbot TO your_user;"
    echo "  \\q"
}

# Setup Redis
setup_redis() {
    print_status "Setting up Redis..."
    
    sudo systemctl start redis-server
    sudo systemctl enable redis-server
    
    print_success "Redis is running"
}

# Setup Nginx (basic configuration)
setup_nginx() {
    print_status "Setting up Nginx..."
    
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    # Create basic nginx config for the app
    sudo tee /etc/nginx/sites-available/telemedicine-chatbot > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Frontend (if serving static files)
    location / {
        root /var/www/telemedicine-chatbot/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF

    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/telemedicine-chatbot /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx config
    sudo nginx -t
    sudo systemctl reload nginx
    
    print_success "Nginx configured"
    print_warning "Remember to update server_name in /etc/nginx/sites-available/telemedicine-chatbot"
}

# Setup firewall
setup_firewall() {
    print_status "Setting up firewall..."
    
    sudo ufw allow ssh
    sudo ufw allow 'Nginx Full'
    sudo ufw allow 3001  # For development/testing
    
    # Enable UFW
    echo "y" | sudo ufw enable
    
    print_success "Firewall configured"
}

# Create project directory and set permissions
setup_project_directory() {
    print_status "Setting up project directory..."
    
    sudo mkdir -p /var/www/telemedicine-chatbot
    sudo chown -R $USER:$USER /var/www/telemedicine-chatbot
    sudo chmod -R 755 /var/www/telemedicine-chatbot
    
    # Create subdirectories
    mkdir -p /var/www/telemedicine-chatbot/logs
    mkdir -p /var/www/telemedicine-chatbot/backups
    
    print_success "Project directory created: /var/www/telemedicine-chatbot"
}

# Setup PM2 startup
setup_pm2_startup() {
    print_status "Setting up PM2 startup..."
    
    # Generate startup script
    PM2_STARTUP=$(pm2 startup | tail -n 1)
    if [[ $PM2_STARTUP == sudo* ]]; then
        eval $PM2_STARTUP
        print_success "PM2 startup script configured"
    fi
}

# Install Puppeteer dependencies
install_puppeteer_deps() {
    print_status "Installing Puppeteer dependencies..."
    
    sudo apt-get install -y \
        gconf-service \
        libasound2 \
        libatk1.0-0 \
        libc6 \
        libcairo2 \
        libcups2 \
        libdbus-1-3 \
        libexpat1 \
        libfontconfig1 \
        libgcc1 \
        libgconf-2-4 \
        libgdk-pixbuf2.0-0 \
        libglib2.0-0 \
        libgtk-3-0 \
        libnspr4 \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libstdc++6 \
        libx11-6 \
        libx11-xcb1 \
        libxcb1 \
        libxcomposite1 \
        libxcursor1 \
        libxdamage1 \
        libxext6 \
        libxfixes3 \
        libxi6 \
        libxrandr2 \
        libxrender1 \
        libxss1 \
        libxtst6 \
        ca-certificates \
        fonts-liberation \
        libappindicator1 \
        libnss3 \
        lsb-release \
        xdg-utils \
        wget \
        libgbm-dev
    
    print_success "Puppeteer dependencies installed"
}

# Main setup function
main() {
    print_status "Starting server setup for Telemedicine Chatbot..."
    
    update_system
    install_dependencies
    install_nodejs
    install_pm2
    install_puppeteer_deps
    setup_postgresql
    setup_redis
    setup_nginx
    setup_firewall
    setup_project_directory
    setup_pm2_startup
    
    print_success "Server setup completed!"
    
    echo -e "\n${GREEN}Next Steps:${NC}"
    echo "1. Clone your repository to /var/www/telemedicine-chatbot"
    echo "2. Create and configure your .env file"
    echo "3. Set up your PostgreSQL database"
    echo "4. Update Nginx server_name in /etc/nginx/sites-available/telemedicine-chatbot"
    echo "5. Run the deployment script: ./scripts/pm2-deploy.sh deploy"
    echo -e "\n${BLUE}Useful Commands:${NC}"
    echo "  Check PM2: pm2 list"
    echo "  Check Nginx: sudo systemctl status nginx"
    echo "  Check PostgreSQL: sudo systemctl status postgresql"
    echo "  Check Redis: sudo systemctl status redis-server"
}

# Run main function
main