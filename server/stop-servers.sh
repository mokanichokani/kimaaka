#!/bin/bash

# stop-servers.sh - Script to stop all Kimaaka server instances
# This script stops all servers started by start-servers.sh

echo "🛑 Stopping Kimaaka Servers..."
echo "=========================================="

# Array of ports that servers might be running on
PORTS=(3000 3001 3002 3003 3004)

# Function to stop a server by PID file
stop_server_by_pid() {
    local port=$1
    local pid_file="logs/server-${port}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo "Stopping server on port ${port} (PID: ${pid})..."
            kill $pid
            sleep 1
            
            # Force kill if still running
            if ps -p $pid > /dev/null 2>&1; then
                echo "Force killing server on port ${port}..."
                kill -9 $pid
            fi
            
            echo "✅ Server on port ${port} stopped"
        else
            echo "⚠️  Server on port ${port} was not running (stale PID file)"
        fi
        
        # Remove PID file
        rm "$pid_file"
    else
        echo "⚠️  No PID file found for port ${port}"
    fi
}

# Function to stop server by port (fallback method)
stop_server_by_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    
    if [ -n "$pid" ]; then
        echo "Found process on port ${port} (PID: ${pid}), stopping..."
        kill $pid
        sleep 1
        
        # Force kill if still running
        if ps -p $pid > /dev/null 2>&1; then
            echo "Force killing process on port ${port}..."
            kill -9 $pid
        fi
        
        echo "✅ Process on port ${port} stopped"
    fi
}

# Stop servers using PID files first
for port in "${PORTS[@]}"; do
    stop_server_by_pid $port
done

echo ""
echo "🔍 Checking for any remaining processes..."

# Check for any remaining processes on these ports and stop them
for port in "${PORTS[@]}"; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null; then
        echo "Found remaining process on port ${port}, stopping..."
        stop_server_by_port $port
    fi
done

# Clean up empty logs directory if no log files remain
if [ -d "logs" ] && [ -z "$(ls -A logs/)" ]; then
    rmdir logs
    echo "📁 Cleaned up empty logs directory"
fi

echo ""
echo "=========================================="
echo "🎉 All servers stopped!"
echo ""
echo "📝 To start servers again, run: ./start-servers.sh"
