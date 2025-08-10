// config.js - Backend Server Configuration
// This file contains the server configuration used by the Node.js server
// Modify this file to change server ports

const SERVER_CONFIG = {
    // Environment: 'development' or 'production'
    ENVIRONMENT: 'development', // Change to 'production' when deploying
    
    // Development Configuration (localhost)
    DEVELOPMENT: {
        DEFAULT_PORT: 3000,
        FALLBACK_PORTS: [3001, 3002, 3003, 3004],
        HOSTNAME: 'localhost',
        PROTOCOL: 'http'
    },
    
    // Production Configuration (Render deployment)
    PRODUCTION: {
        DEFAULT_PORT: process.env.PORT || 10000, // Render assigns port via environment
        HOSTNAME: '0.0.0.0', // Bind to all interfaces for Render
        PROTOCOL: 'https'
    },
    
    // Get current environment config
    getCurrentConfig() {
        return this.ENVIRONMENT === 'production' ? this.PRODUCTION : this.DEVELOPMENT;
    },
    
    // Get the default port for this server instance
    getDefaultPort() {
        const config = this.getCurrentConfig();
        return config.DEFAULT_PORT;
    },
    
    // Get fallback ports (development only)
    getFallbackPorts() {
        if (this.ENVIRONMENT === 'production') {
            return []; // No fallback ports in production
        }
        return this.DEVELOPMENT.FALLBACK_PORTS;
    },
    
    // Get all possible ports (for development server discovery)
    getAllPorts() {
        if (this.ENVIRONMENT === 'production') {
            return [this.getDefaultPort()];
        }
        return [this.getDefaultPort(), ...this.getFallbackPorts()];
    }
};

module.exports = SERVER_CONFIG;
