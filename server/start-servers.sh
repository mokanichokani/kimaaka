#!/bin/bash

# start-servers.sh - Script to start multiple Kimaaka server instances
# This script starts servers on ports 3000-3004 for development

echo "🚀 Starting Kimaaka Servers on ports 3000-3004..."
echo "=========================================="

# Array of ports to start servers on
PORTS=(3000 3001 3002 3003 3004)

# Function to start a server on a specific port
start_server() {
    local port=$1
    local log_file="logs/server-${port}.log"
    
    echo "Starting server on port ${port}..."
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    # Set the port environment variable and start the server
    CURRENT_SERVER_PORT=$port node server.js > "$log_file" 2>&1 &
    
    # Store the process ID
    local pid=$!
    echo $pid > "logs/server-${port}.pid"
    
    echo "✅ Server started on port ${port} (PID: ${pid})"
    echo "   Log file: ${log_file}"
}

# Function to check if a port is already in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Create logs directory
mkdir -p logs

# Start servers on each port
for port in "${PORTS[@]}"; do
    if check_port $port; then
        echo "⚠️  Port ${port} is already in use, skipping..."
    else
        start_server $port
        sleep 2  # Wait a bit between starts
    fi
done

echo ""
echo "=========================================="
echo "🎉 Server startup complete!"
echo ""
echo "📊 Admin Dashboard URLs:"
for port in "${PORTS[@]}"; do
    if check_port $port; then
        echo "   http://localhost:${port}/admin/admin.html"
    fi
done

echo ""
echo "🔑 API Endpoints:"
for port in "${PORTS[@]}"; do
    if check_port $port; then
        echo "   http://localhost:${port}/api/gemini-key"
    fi
done

echo ""
echo "📋 Health Checks:"
for port in "${PORTS[@]}"; do
    if check_port $port; then
        echo "   http://localhost:${port}/api/health"
    fi
done

echo ""
echo "📝 To stop all servers, run: ./stop-servers.sh"
echo "📝 To view logs: tail -f logs/server-XXXX.log"
echo "📝 Server PIDs are stored in: logs/server-XXXX.pid"
