#!/bin/bash

# PM2 Deployment Script for Telemedicine Chatbot
# This script handles deployment, monitoring, and management of the application with PM2

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="telemedicine-chatbot"
PROJECT_PATH="/var/www/telemedicine-chatbot"
LOG_PATH="$PROJECT_PATH/logs"
BACKUP_PATH="$PROJECT_PATH/backups"

# Functions
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

# Check if PM2 is installed
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 is not installed. Installing PM2..."
        npm install -g pm2
        print_success "PM2 installed successfully"
    else
        print_status "PM2 is already installed: $(pm2 --version)"
    fi
}

# Create necessary directories
setup_directories() {
    print_status "Setting up directories..."
    
    mkdir -p "$LOG_PATH"
    mkdir -p "$BACKUP_PATH"
    mkdir -p "$PROJECT_PATH/.wwebjs_auth"
    mkdir -p "$PROJECT_PATH/.wwebjs_cache"
    
    # Set correct permissions
    chmod 755 "$LOG_PATH"
    chmod 755 "$BACKUP_PATH"
    chmod 700 "$PROJECT_PATH/.wwebjs_auth"
    chmod 700 "$PROJECT_PATH/.wwebjs_cache"
    
    print_success "Directories created successfully"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    cd "$PROJECT_PATH"
    
    if [ -f "package-lock.json" ]; then
        npm ci --production
    else
        npm install --production
    fi
    
    print_success "Dependencies installed successfully"
}

# Build the application
build_application() {
    print_status "Building application..."
    cd "$PROJECT_PATH"
    
    if npm run build 2>/dev/null; then
        print_success "Application built successfully"
    else
        print_warning "Build script not found or failed, continuing with deployment"
    fi
}

# Backup current deployment
backup_deployment() {
    if pm2 describe "$APP_NAME" &> /dev/null; then
        print_status "Creating backup of current deployment..."
        
        local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_PATH/$backup_name"
        
        # Backup logs
        if [ -d "$LOG_PATH" ]; then
            cp -r "$LOG_PATH" "$BACKUP_PATH/$backup_name/"
        fi
        
        # Backup PM2 process file
        pm2 save
        cp ~/.pm2/dump.pm2 "$BACKUP_PATH/$backup_name/" 2>/dev/null || true
        
        print_success "Backup created: $backup_name"
    fi
}

# Stop existing PM2 process
stop_existing() {
    if pm2 describe "$APP_NAME" &> /dev/null; then
        print_status "Stopping existing PM2 process..."
        pm2 stop "$APP_NAME" || true
        pm2 delete "$APP_NAME" || true
        print_success "Existing process stopped and deleted"
    else
        print_status "No existing PM2 process found"
    fi
}

# Start PM2 process
start_process() {
    print_status "Starting PM2 process..."
    cd "$PROJECT_PATH"
    
    # Start with ecosystem config
    if pm2 start ecosystem.config.cjs --env production; then
        print_success "PM2 process started successfully"
    else
        print_error "Failed to start PM2 process"
        return 1
    fi
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    pm2 startup || true
}

# Health check
health_check() {
    print_status "Performing health check..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3001/health &> /dev/null; then
            print_success "Health check passed"
            return 0
        fi
        
        print_status "Health check attempt $attempt/$max_attempts failed, waiting..."
        sleep 2
        ((attempt++))
    done
    
    print_error "Health check failed after $max_attempts attempts"
    return 1
}

# Monitor application
monitor_app() {
    print_status "Application monitoring information:"
    
    echo -e "\n${BLUE}PM2 Process Status:${NC}"
    pm2 list
    
    echo -e "\n${BLUE}Memory Usage:${NC}"
    pm2 show "$APP_NAME" | grep -E "(memory|cpu|uptime|restarts)" || true
    
    echo -e "\n${BLUE}Recent Logs (last 10 lines):${NC}"
    pm2 logs "$APP_NAME" --lines 10 --nostream || true
    
    echo -e "\n${BLUE}Useful Commands:${NC}"
    echo "  View logs:           pm2 logs $APP_NAME"
    echo "  Monitor in real-time: pm2 monit"
    echo "  Restart:             pm2 restart $APP_NAME"
    echo "  Stop:                pm2 stop $APP_NAME"
    echo "  Reload (zero-downtime): pm2 reload $APP_NAME"
    echo "  View detailed info:  pm2 show $APP_NAME"
}

# Cleanup old logs and backups
cleanup() {
    print_status "Cleaning up old files..."
    
    # Clean old logs (keep last 7 days)
    find "$LOG_PATH" -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    # Clean old backups (keep last 5)
    if [ -d "$BACKUP_PATH" ]; then
        ls -t "$BACKUP_PATH" | tail -n +6 | xargs -I {} rm -rf "$BACKUP_PATH/{}" 2>/dev/null || true
    fi
    
    print_success "Cleanup completed"
}

# Setup log rotation
setup_log_rotation() {
    print_status "Setting up log rotation..."
    
    # Install PM2 logrotate module
    pm2 install pm2-logrotate || print_warning "PM2 logrotate installation failed"
    
    # Configure logrotate
    pm2 set pm2-logrotate:max_size 50M
    pm2 set pm2-logrotate:retain 7
    pm2 set pm2-logrotate:compress true
    pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
    
    print_success "Log rotation configured"
}

# Deploy function
deploy() {
    print_status "Starting deployment of $APP_NAME..."
    
    check_pm2
    setup_directories
    backup_deployment
    stop_existing
    install_dependencies
    build_application
    start_process
    
    if health_check; then
        setup_log_rotation
        cleanup
        monitor_app
        print_success "Deployment completed successfully!"
        
        echo -e "\n${GREEN}Application is running at:${NC}"
        echo "  - API: http://localhost:3001"
        echo "  - Health: http://localhost:3001/health"
    else
        print_error "Deployment failed - health check not passing"
        print_status "Check logs with: pm2 logs $APP_NAME"
        return 1
    fi
}

# Restart function
restart() {
    print_status "Restarting $APP_NAME..."
    
    if pm2 describe "$APP_NAME" &> /dev/null; then
        pm2 restart "$APP_NAME"
        
        if health_check; then
            print_success "Application restarted successfully"
            monitor_app
        else
            print_error "Restart failed - health check not passing"
            return 1
        fi
    else
        print_error "Application not found. Use 'deploy' command first."
        return 1
    fi
}

# Stop function
stop() {
    print_status "Stopping $APP_NAME..."
    
    if pm2 describe "$APP_NAME" &> /dev/null; then
        pm2 stop "$APP_NAME"
        print_success "Application stopped successfully"
    else
        print_warning "Application is not running"
    fi
}

# Status function
status() {
    print_status "Application status:"
    
    if pm2 describe "$APP_NAME" &> /dev/null; then
        monitor_app
    else
        print_warning "Application is not running"
        echo "Use './pm2-deploy.sh deploy' to start the application"
    fi
}

# Logs function
logs() {
    if pm2 describe "$APP_NAME" &> /dev/null; then
        print_status "Following logs for $APP_NAME (Ctrl+C to exit)..."
        pm2 logs "$APP_NAME" --follow
    else
        print_error "Application is not running"
    fi
}

# Main script logic
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "restart")
        restart
        ;;
    "stop")
        stop
        ;;
    "status")
        status
        ;;
    "logs")
        logs
        ;;
    "monitor")
        pm2 monit
        ;;
    "help"|"--help"|"-h")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  deploy   - Deploy the application (default)"
        echo "  restart  - Restart the application"
        echo "  stop     - Stop the application"
        echo "  status   - Show application status"
        echo "  logs     - Follow application logs"
        echo "  monitor  - Open PM2 monitoring dashboard"
        echo "  help     - Show this help message"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for available commands"
        exit 1
        ;;
esac