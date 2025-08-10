// config.js - Chrome Extension Server Configuration
// This file contains the server URLs used by the Chrome extension
// Modify this file to change server ports or add/remove servers

const SERVER_CONFIG = {
    // Environment: 'development' or 'production'
    ENVIRONMENT: 'development', // Change to 'production' when deploying
    
    // Development Configuration (localhost)
    DEVELOPMENT: {
        PORTS: [3000, 3001, 3002, 3003, 3004],
        HOSTNAME: 'localhost',
        PROTOCOL: 'http'
    },
    
    // Production Configuration (Render URLs)
    PRODUCTION: {
        // Replace these with your actual Render service URLs
        URLS: [
            'https://your-app-1.onrender.com',
            'https://your-app-2.onrender.com',
            'https://your-app-3.onrender.com',
            'https://your-app-4.onrender.com',
            'https://your-app-5.onrender.com',
            'https://your-app-6.onrender.com'
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

// Generate the SERVER_URLS array for backward compatibility
const SERVER_URLS = SERVER_CONFIG.getServerUrls();
