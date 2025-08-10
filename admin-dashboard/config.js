// config.js - Admin Dashboard Server Configuration
// This file contains the server URLs used by the admin dashboard
// Modify this file to change server configuration or add/remove servers

const SERVER_CONFIG = {
    // Environment: 'development' or 'production'
    ENVIRONMENT: 'production', // Changed to production for deployment
    
    // Development Configuration (localhost)
    DEVELOPMENT: {
        PORTS: [3000, 3001, 3002, 3003, 3004],
        HOSTNAME: 'localhost',
        PROTOCOL: 'http'
    },
    
    // Production Configuration (Example servers)
    PRODUCTION: {
        // Example production servers
        URLS: [
            'https://moonlight-api.onrender.com',
            'https://stardust-server.onrender.com',
            'https://aurora-backend.onrender.com',
            'https://nebula-service.onrender.com',
            'https://comet-gateway.onrender.com'
        ]
    },
    
    // Get current environment config
    getCurrentConfig() {
        return this.ENVIRONMENT === 'production' ? this.PRODUCTION : this.DEVELOPMENT;
    },
    
    // Generate full server URLs with /api endpoint
    getServerUrls() {
        const config = this.getCurrentConfig();
        
        if (this.ENVIRONMENT === 'production') {
            return config.URLS.map(url => `${url}/api`);
        } else {
            return config.PORTS.map(port => 
                `${config.PROTOCOL}://${config.HOSTNAME}:${port}/api`
            );
        }
    },
    
    // Generate base server URLs without /api
    getBaseUrls() {
        const config = this.getCurrentConfig();
        
        if (this.ENVIRONMENT === 'production') {
            return config.URLS;
        } else {
            return config.PORTS.map(port => 
                `${config.PROTOCOL}://${config.HOSTNAME}:${port}`
            );
        }
    },
    
    // Get primary server URL (first in the list)
    getPrimaryServerUrl() {
        const baseUrls = this.getBaseUrls();
        return baseUrls[0];
    },
    
    // Get primary server API URL
    getPrimaryApiUrl() {
        const serverUrls = this.getServerUrls();
        return serverUrls[0];
    }
};

// Make SERVER_CONFIG available globally for admin dashboard
window.SERVER_CONFIG = SERVER_CONFIG;
