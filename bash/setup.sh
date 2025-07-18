# Server setup for telemedicine chatbot deployment
#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install PostgreSQL (if not already installed)
sudo apt install postgresql postgresql-contrib -y

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user for the application
sudo -u postgres psql <<EOF
CREATE DATABASE telemedicine_chatbot;
CREATE USER chatbot_user WITH ENCRYPTED PASSWORD 'chatbotadmin';
GRANT ALL PRIVILEGES ON DATABASE telemedicine_chatbot TO chatbot_user;
\q
EOF

# Create application directory
sudo mkdir -p /var/www/telemedicine-chatbot
sudo chown -R $USER:$USER /var/www/telemedicine-chatbot

echo "Server setup completed!"
echo "Next: Upload your application files to /var/www/telemedicine-chatbot"