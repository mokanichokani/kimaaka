# Kimaaka Server Management Scripts

This directory contains scripts to manage multiple Kimaaka server instances for development.

## Scripts

### `start-servers.sh`
Starts multiple server instances on ports 3000-3004.

```bash
./start-servers.sh
```

**Features:**
- Starts servers on ports 3000, 3001, 3002, 3003, 3004
- Checks if ports are already in use
- Creates log files for each server instance
- Stores process IDs for easy management
- Shows admin dashboard and API endpoint URLs

**Output:**
- Log files: `logs/server-XXXX.log`
- PID files: `logs/server-XXXX.pid`

### `stop-servers.sh`
Stops all running server instances.

```bash
./stop-servers.sh
```

**Features:**
- Stops servers using PID files
- Force kills if normal termination fails
- Checks for remaining processes on ports
- Cleans up PID files and empty logs directory

### `status-servers.sh`
Shows status of all server instances.

```bash
./status-servers.sh
```

**Features:**
- Shows which ports are running servers
- Displays process IDs
- Checks server health via `/api/health` endpoint
- Shows server uptime
- Lists available admin dashboard and API URLs

## Usage Examples

```bash
# Start all servers
./start-servers.sh

# Check status
./status-servers.sh

# View logs of specific server
tail -f logs/server-3001.log

# Stop all servers
./stop-servers.sh
```

## Development Workflow

1. **Start Development:** `./start-servers.sh`
2. **Check Status:** `./status-servers.sh`
3. **Monitor Logs:** `tail -f logs/server-3001.log`
4. **Stop Development:** `./stop-servers.sh`

## Server URLs

Once started, servers will be available at:

- **Admin Dashboard:** `http://localhost:3000/admin/admin.html` (and 3001, 3002, 3003, 3004)
- **API Endpoints:** `http://localhost:3000/api/gemini-key` (and 3001, 3002, 3003, 3004)
- **Health Check:** `http://localhost:3000/api/health` (and 3001, 3002, 3003, 3004)

## Configuration

Servers use the configuration from `config.js`:
- Development environment uses ports 3000-3004
- Each server instance runs independently
- Logs are stored in the `logs/` directory
- Process IDs are tracked for clean shutdown
