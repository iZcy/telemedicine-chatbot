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
      max_memory_restart: '2G', // Increased from 1G to handle WhatsApp + AI services
      
      // Logs with rotation
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      log_type: 'json',
      merge_logs: true,
      
      // Advanced settings for better stability
      kill_timeout: 10000, // Increased to allow graceful shutdown
      wait_ready: true,
      listen_timeout: 15000, // Increased for slower startups
      
      // Health monitoring - more lenient
      min_uptime: '30s', // Require 30s uptime before considering healthy
      max_restarts: 5, // Reduced to prevent restart loops
      restart_delay: 5000, // Wait 5s between restarts
      
      // Memory and CPU limits
      max_memory_restart: '2G',
      node_args: '--enable-source-maps --max-old-space-size=2048',
      
      // Graceful shutdown
      shutdown_with_message: true,
      kill_retry_time: 5000,
      
      // Process monitoring
      pmx: true,
      
      // Error handling
      panic: false,
      automation: false,
      
      // TypeScript support - skip compilation
      interpreter: 'none',
      
      // Environment-specific overrides
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        // Add production-specific env vars here
      },
      
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
        watch: true,
        ignore_watch: [
          'node_modules',
          'logs',
          '.git',
          '*.log',
          'dist',
          'build'
        ]
      }
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
      'pre-deploy-local': 'echo "Starting deployment..."',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.cjs --env production && pm2 save',
      'pre-setup': 'mkdir -p /var/www/telemedicine-chatbot/logs'
    }
  }
};