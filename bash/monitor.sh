#!/bin/bash

# Maintenance and monitoring scripts for telemedicine chatbot

# Health check script
health_check() {
    echo "🔍 Performing health check..."
    
    # Check if PM2 process is running
    if pm2 list | grep -q "telemedicine-chatbot.*online"; then
        echo "✅ PM2 process is running"
    else
        echo "❌ PM2 process is not running"
        return 1
    fi
    
    # Check if backend responds
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Backend health check passed"
    else
        echo "❌ Backend health check failed"
        return 1
    fi
    
    # Check nginx status
    if systemctl is-active --quiet nginx; then
        echo "✅ Nginx is running"
    else
        echo "❌ Nginx is not running"
        return 1
    fi
    
    # Check if website is accessible
    if curl -f https://telemedicine.kecamatanbayan.id > /dev/null 2>&1; then
        echo "✅ Website is accessible"
    else
        echo "❌ Website is not accessible"
        return 1
    fi
    
    echo "🎉 All health checks passed!"
}

# Log rotation script
rotate_logs() {
    echo "🔄 Rotating application logs..."
    
    LOG_DIR="/var/www/telemedicine-chatbot/logs"
    BACKUP_DIR="/var/backups/telemedicine-logs"
    DATE=$(date +%Y%m%d_%H%M%S)
    
    mkdir -p $BACKUP_DIR
    
    # Archive current logs
    if [ -f "$LOG_DIR/combined.log" ]; then
        gzip -c "$LOG_DIR/combined.log" > "$BACKUP_DIR/combined_$DATE.log.gz"
        echo "" > "$LOG_DIR/combined.log"
    fi
    
    if [ -f "$LOG_DIR/err.log" ]; then
        gzip -c "$LOG_DIR/err.log" > "$BACKUP_DIR/error_$DATE.log.gz"
        echo "" > "$LOG_DIR/err.log"
    fi
    
    # Remove logs older than 30 days
    find $BACKUP_DIR -name "*.log.gz" -mtime +30 -delete
    
    # Restart PM2 to refresh log files
    pm2 restart telemedicine-chatbot
    
    echo "✅ Log rotation completed"
}

# Database backup script
backup_database() {
    echo "💾 Creating database backup..."
    
    BACKUP_DIR="/var/backups/telemedicine-db"
    DATE=$(date +%Y%m%d_%H%M%S)
    
    mkdir -p $BACKUP_DIR
    
    # Create database dump
    sudo -u postgres pg_dump telemedicine_chatbot | gzip > "$BACKUP_DIR/telemedicine_db_$DATE.sql.gz"
    
    # Remove backups older than 7 days
    find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
    
    echo "✅ Database backup completed: telemedicine_db_$DATE.sql.gz"
}

# Update SSL certificates
update_ssl() {
    echo "🔒 Updating SSL certificates..."
    
    # Renew Let's Encrypt certificates
    sudo certbot renew --quiet
    
    # Reload nginx if certificates were renewed
    if sudo certbot renew --dry-run; then
        sudo systemctl reload nginx
        echo "✅ SSL certificates updated and nginx reloaded"
    else
        echo "⚠️ SSL certificate renewal failed"
        return 1
    fi
}

# Monitor system resources
monitor_resources() {
    echo "📊 System resource monitoring..."
    
    # CPU usage
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    echo "CPU Usage: ${CPU_USAGE}%"
    
    # Memory usage
    MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100.0)}')
    echo "Memory Usage: ${MEMORY_USAGE}%"
    
    # Disk usage
    DISK_USAGE=$(df -h / | awk 'NR==2{printf "%s", $5}')
    echo "Disk Usage: $DISK_USAGE"
    
    # Check if resources are too high
    if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
        echo "⚠️ High CPU usage detected!"
    fi
    
    if (( $(echo "$MEMORY_USAGE > 80" | bc -l) )); then
        echo "⚠️ High memory usage detected!"
    fi
}

# Main menu
case "$1" in
    "health")
        health_check
        ;;
    "logs")
        rotate_logs
        ;;
    "backup")
        backup_database
        ;;
    "ssl")
        update_ssl
        ;;
    "monitor")
        monitor_resources
        ;;
    "full")
        echo "🔧 Running full maintenance..."
        health_check
        rotate_logs
        backup_database
        update_ssl
        monitor_resources
        echo "✅ Full maintenance completed!"
        ;;
    *)
        echo "Telemedicine Chatbot Maintenance Tool"
        echo ""
        echo "Usage: $0 {health|logs|backup|ssl|monitor|full}"
        echo ""
        echo "Commands:"
        echo "  health  - Perform health check"
        echo "  logs    - Rotate application logs"
        echo "  backup  - Backup database"
        echo "  ssl     - Update SSL certificates"
        echo "  monitor - Monitor system resources"
        echo "  full    - Run all maintenance tasks"
        exit 1
        ;;
esac