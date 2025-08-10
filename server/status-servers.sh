#!/bin/bash

# status-servers.sh - Script to check status of Kimaaka server instances
# This script shows which servers are running and their health

echo "📊 Kimaaka Servers Status"
echo "=========================================="

# Array of ports to check
PORTS=(3000 3001 3002 3003 3004)

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to get PID from port
get_pid_from_port() {
    local port=$1
    lsof -ti:$port
}

# Function to check server health
check_health() {
    local port=$1
    local response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${port}/api/health" 2>/dev/null)
    if [ "$response" = "200" ]; then
        return 0  # Healthy
    else
        return 1  # Unhealthy
    fi
}

# Function to get server uptime from health endpoint
get_server_info() {
    local port=$1
    curl -s "http://localhost:${port}/api/health" 2>/dev/null | jq -r '.uptime // "Unknown"' 2>/dev/null || echo "Unknown"
}

echo "Port | Status    | PID    | Health | Uptime"
echo "-----|-----------|--------|--------|----------------"

running_count=0
total_count=${#PORTS[@]}

for port in "${PORTS[@]}"; do
    if check_port $port; then
        pid=$(get_pid_from_port $port)
        if check_health $port; then
            health="✅ OK"
            uptime=$(get_server_info $port)
            ((running_count++))
        else
            health="❌ ERROR"
            uptime="N/A"
        fi
        echo "$port | 🟢 Running | $pid | $health | $uptime"
    else
        echo "$port | 🔴 Stopped | N/A    | N/A    | N/A"
    fi
done

echo ""
echo "Summary: $running_count/$total_count servers running"

if [ $running_count -gt 0 ]; then
    echo ""
    echo "📊 Admin Dashboard URLs:"
    for port in "${PORTS[@]}"; do
        if check_port $port && check_health $port; then
            echo "   http://localhost:${port}/admin/admin.html"
        fi
    done

    echo ""
    echo "🔑 API Endpoints:"
    for port in "${PORTS[@]}"; do
        if check_port $port && check_health $port; then
            echo "   http://localhost:${port}/api/gemini-key"
        fi
    done
fi

echo ""
echo "📝 Commands:"
echo "   Start servers: ./start-servers.sh"
echo "   Stop servers:  ./stop-servers.sh"
echo "   View logs:     tail -f logs/server-XXXX.log"
