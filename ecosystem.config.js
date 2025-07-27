// PM2 Ecosystem Configuration
// Use this file to manage your PM2 deployment

module.exports = {
  apps: [
    {
      name: 'telemedicine-chatbot',
      script: 'tsx',
      args: 'server/index.ts',
      cwd: '/var/www/telemedicine-chatbot',
      instances: 1,
      exec_mode: 'fork',
      
      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      
      // Auto-restart settings
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      
      // Logs
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Advanced settings
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
      
      // Source maps support for TypeScript
      node_args: '--enable-source-maps'
    }
  ],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'ubuntu', // Change to your user
      host: 'your-server.com', // Change to your server
      ref: 'origin/main',
      repo: 'git@github.com:your-username/telemedicine-chatbot.git', // Change to your repo
      path: '/var/www/telemedicine-chatbot',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
};