// admin.js - Admin Dashboard JavaScript with Authentication

// Use admin dashboard's own server configuration
const SERVER_URLS = window.SERVER_CONFIG ? window.SERVER_CONFIG.getServerUrls() : [];

// Ensure configuration is loaded
if (!window.SERVER_CONFIG || SERVER_URLS.length === 0) {
    console.error('❌ SERVER_CONFIG not loaded! Make sure admin.html includes config.js');
    alert('Configuration error: Admin dashboard configuration not loaded. Please check that config.js is properly included.');
}

let currentServerIndex = 0;
let currentUser = null;
let authToken = null;
let workingServerUrl = null; // Cache the working server URL

// Authentication functions
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showLoginError('Please enter both username and password');
        return;
    }
    
    try {
        // Find a working server
        showLoginError('Finding available server...', false); // Show loading message
        const serverUrl = await getWorkingServerUrl();
        
        showLoginError('Authenticating...', false); // Show loading message
        const response = await fetch(`${serverUrl}/api/admin/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Store authentication data
            currentUser = result.user;
            authToken = result.token;
            
            // Store in localStorage for session persistence
            localStorage.setItem('adminAuthToken', authToken);
            localStorage.setItem('adminUser', JSON.stringify(currentUser));
            localStorage.setItem('workingServerUrl', serverUrl); // Cache working server
            
            showDashboard();
            loadOverview();
        } else {
            showLoginError(result.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showLoginError(error.message || 'Connection error. Please check if any server is running on ports 3000-3004.');
    }
}

// Check if user is already authenticated
async function checkAuthentication() {
    const token = localStorage.getItem('adminAuthToken');
    const storedUser = localStorage.getItem('adminUser');
    const cachedServerUrl = localStorage.getItem('workingServerUrl');
    
    if (!token || !storedUser) {
        return false;
    }
    
    // Restore cached working server URL
    if (cachedServerUrl) {
        workingServerUrl = cachedServerUrl;
    }
    
    try {
        const serverUrl = await getWorkingServerUrl();
        const response = await fetch(`${serverUrl}/api/admin/auth/verify`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                authToken = token;
                currentUser = result.user;
                return true;
            }
        }
        
        // Token is invalid, clear storage
        localStorage.removeItem('adminAuthToken');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('workingServerUrl');
        workingServerUrl = null;
        return false;
        
    } catch (error) {
        console.error('Auth verification error:', error);
        return false;
    }
}

// Get authentication headers for API requests
function getAuthHeaders() {
    return {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    };
}

function showDashboard() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('dashboardContainer').classList.add('authenticated');
    document.getElementById('dashboardContainer').style.display = 'block';
}

function showLoginError(message, isError = true) {
    const errorElement = document.getElementById('loginError');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
    
    // If it's an error message, hide after 5 seconds
    // If it's a loading message, don't auto-hide
    if (isError) {
        setTimeout(() => {
            errorElement.classList.add('hidden');
        }, 5000);
    }
}

function logout() {
    currentUser = null;
    authToken = null;
    workingServerUrl = null;
    
    // Clear storage
    localStorage.removeItem('adminAuthToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('workingServerUrl');
    
    // Show login screen
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('dashboardContainer').style.display = 'none';
    document.getElementById('dashboardContainer').classList.remove('authenticated');
    
    // Clear form
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// Tab management
function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked nav tab
    event.target.classList.add('active');
    
    // Load data for the selected tab
    loadTabData(tabName);
}

function loadTabData(tabName) {
    switch(tabName) {
        case 'overview':
            loadOverview();
            break;
        case 'api-keys':
            loadApiKeys();
            break;
        case 'servers':
            checkAllServers();
            break;
        case 'server-usage':
            refreshServerUsage();
            loadServerAnalytics();
            break;
        case 'users':
            loadUsers();
            break;
    }
}

// Overview functions
async function loadOverview() {
    try {
        const serverUrl = getRandomServerUrl();
        const response = await fetch(`${serverUrl}/api/admin/stats`, {
            headers: getAuthHeaders()
        });
        const stats = await response.json();
        
        document.getElementById('totalApiKeys').textContent = stats.totalApiKeys || 0;
        document.getElementById('activeApiKeys').textContent = stats.activeApiKeys || 0;
        document.getElementById('donatedApiKeys').textContent = stats.donatedApiKeys || 0;
        document.getElementById('onlineServers').textContent = await getOnlineServerCount();
        
        loadRecentActivity();
    } catch (error) {
        console.error('Error loading overview:', error);
        showAlert('Failed to load overview data', 'error');
    }
}

async function loadRecentActivity() {
    try {
        const serverUrl = getRandomServerUrl();
        const response = await fetch(`${serverUrl}/api/admin/recent-activity`, {
            headers: getAuthHeaders()
        });
        const activities = await response.json();
        
        const container = document.getElementById('recentActivity');
        if (activities.length === 0) {
            container.innerHTML = '<p>No recent activity</p>';
            return;
        }
        
        container.innerHTML = activities.map(activity => `
            <div class="api-key-item">
                <div class="api-key-info">
                    <div class="api-key-value">${activity.action}</div>
                    <div class="api-key-meta">${new Date(activity.timestamp).toLocaleString()}</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        document.getElementById('recentActivity').innerHTML = '<p>Failed to load recent activity</p>';
    }
}

// API Keys functions
async function loadApiKeys() {
    try {
        const serverUrl = await getWorkingServerUrl();
        const response = await fetch(`${serverUrl}/api/admin/api-keys`, {
            headers: getAuthHeaders()
        });
        const apiKeys = await response.json();
        
        const container = document.getElementById('apiKeysList');
        
        if (apiKeys.length === 0) {
            container.innerHTML = '<p>No API keys found. Add your first API key above.</p>';
            return;
        }
        
        container.innerHTML = `
            <div class="api-key-list">
                ${apiKeys.map(key => `
                    <div class="api-key-item">
                        <div class="api-key-info">
                            <div class="api-key-value">${maskApiKey(key.apiKey)}</div>
                            <div class="api-key-meta">
                                Added: ${new Date(key.createdAt).toLocaleDateString()} | 
                                Used: ${key.usageCount || 0} times | 
                                Last used: ${key.lastUsed ? new Date(key.lastUsed).toLocaleString() : 'Never'}
                                ${key.description ? ` | ${key.description}` : ''}
                            </div>
                        </div>
                        <div>
                            <span class="status-badge ${getStatusClass(key.status)}">${key.status}</span>
                            <button class="btn btn-warning btn-sm" onclick="validateApiKey('${key._id}')">Validate</button>
                            <button class="btn btn-success btn-sm" onclick="reactivateApiKey('${key._id}')" ${key.status === 'active' ? 'disabled' : ''}>Reactivate</button>
                            <button class="btn btn-danger btn-sm" onclick="deleteApiKey('${key._id}')">Delete</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading API keys:', error);
        document.getElementById('apiKeysList').innerHTML = '<p>Failed to load API keys</p>';
    }
}

async function addApiKey() {
    const apiKey = document.getElementById('newApiKey').value.trim();
    const description = document.getElementById('keyDescription').value.trim();
    
    if (!apiKey) {
        showAlert('Please enter an API key', 'error');
        return;
    }
    
    try {
        const serverUrl = getRandomServerUrl();
        const response = await fetch(`${serverUrl}/api/admin/api-keys`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ apiKey, description, source: 'admin' })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert(`API key added successfully! Status: ${result.isValid ? 'Valid' : 'Invalid'}`, 'success');
            document.getElementById('newApiKey').value = '';
            document.getElementById('keyDescription').value = '';
            loadApiKeys();
        } else {
            showAlert(result.error || 'Failed to add API key', 'error');
        }
    } catch (error) {
        console.error('Error adding API key:', error);
        showAlert('Failed to add API key', 'error');
    }
}

async function validateApiKey(keyId) {
    try {
        const serverUrl = getRandomServerUrl();
        const response = await fetch(`${serverUrl}/api/admin/api-keys/${keyId}/validate`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert(`Validation complete. Status: ${result.isValid ? 'Valid' : 'Invalid'}`, 'success');
            loadApiKeys();
        } else {
            showAlert(result.error || 'Failed to validate API key', 'error');
        }
    } catch (error) {
        console.error('Error validating API key:', error);
        showAlert('Failed to validate API key', 'error');
    }
}

async function validateAllKeys() {
    try {
        const serverUrl = getRandomServerUrl();
        const response = await fetch(`${serverUrl}/api/admin/api-keys/validate-all`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert(`Validated ${result.validated} keys. ${result.active} active, ${result.deactivated} deactivated.`, 'success');
            loadApiKeys();
        } else {
            showAlert(result.error || 'Failed to validate keys', 'error');
        }
    } catch (error) {
        console.error('Error validating all keys:', error);
        showAlert('Failed to validate all keys', 'error');
    }
}

async function reactivateApiKey(keyId) {
    try {
        const serverUrl = getRandomServerUrl();
        const response = await fetch(`${serverUrl}/api/admin/api-keys/${keyId}/reactivate`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert('API key reactivated successfully', 'success');
            loadApiKeys();
        } else {
            showAlert(result.error || 'Failed to reactivate API key', 'error');
        }
    } catch (error) {
        console.error('Error reactivating API key:', error);
        showAlert('Failed to reactivate API key', 'error');
    }
}

async function deleteApiKey(keyId) {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
        return;
    }
    
    try {
        const serverUrl = getRandomServerUrl();
        const response = await fetch(`${serverUrl}/api/admin/api-keys/${keyId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            showAlert('API key deleted successfully', 'success');
            loadApiKeys();
        } else {
            const result = await response.json();
            showAlert(result.error || 'Failed to delete API key', 'error');
        }
    } catch (error) {
        console.error('Error deleting API key:', error);
        showAlert('Failed to delete API key', 'error');
    }
}

// Server functions
async function checkAllServers() {
    const container = document.getElementById('serversList');
    container.innerHTML = '<div class="loading">Checking server status...</div>';
    
    const serverPromises = SERVER_URLS.map(async (url, index) => {
        const serverPort = url.split(':')[2].split('/')[0];
        try {
            const response = await fetch(`${url}/health`, {
                method: 'GET',
                timeout: 5000
            });
            
            const isOnline = response.ok;
            const data = isOnline ? await response.json() : null;
            
            return {
                index: index + 1,
                url,
                port: serverPort,
                status: isOnline ? 'online' : 'offline',
                data: data
            };
        } catch (error) {
            return {
                index: index + 1,
                url,
                port: serverPort,
                status: 'offline',
                error: error.message
            };
        }
    });
    
    try {
        const serverStatuses = await Promise.all(serverPromises);
        
        container.innerHTML = serverStatuses.map(server => `
            <div class="server-card">
                <div class="server-status">
                    <div class="status-indicator ${server.status === 'online' ? 'status-online' : 'status-offline'}"></div>
                    <strong>Server ${server.index} (Port ${server.port})</strong>
                </div>
                <p><strong>Status:</strong> ${server.status.toUpperCase()}</p>
                <p><strong>URL:</strong> ${server.url}</p>
                ${server.data ? `
                    <p><strong>Uptime:</strong> ${server.data.uptime || 'Unknown'}</p>
                    <p><strong>Memory:</strong> ${server.data.memory || 'Unknown'}</p>
                    <p><strong>API Keys:</strong> ${server.data.apiKeysCount || 0}</p>
                ` : ''}
                ${server.error ? `<p><strong>Error:</strong> ${server.error}</p>` : ''}
                <button class="btn btn-primary btn-sm" onclick="restartServer('${server.url}')">Restart</button>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<p>Failed to check server status</p>';
    }
}

async function getOnlineServerCount() {
    let onlineCount = 0;
    
    const promises = SERVER_URLS.map(async (url) => {
        try {
            const response = await fetch(`${url}/health`, {
                method: 'GET',
                timeout: 3000
            });
            return response.ok;
        } catch {
            return false;
        }
    });
    
    const results = await Promise.all(promises);
    return results.filter(Boolean).length;
}

async function restartServer(serverUrl) {
    try {
        const response = await fetch(`${serverUrl}/api/admin/restart`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            showAlert('Server restart initiated', 'success');
            setTimeout(checkAllServers, 3000); // Check again after 3 seconds
        } else {
            showAlert('Failed to restart server', 'error');
        }
    } catch (error) {
        showAlert('Failed to restart server', 'error');
    }
}

// User Management functions
async function loadUsers() {
    try {
        const serverUrl = getRandomServerUrl();
        const response = await fetch(`${serverUrl}/api/admin/auth/users`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const adminUsers = await response.json();
        const container = document.getElementById('usersList');
        
        if (adminUsers.length === 0) {
            container.innerHTML = '<p>No users found.</p>';
            return;
        }
        
        container.innerHTML = `
            <div class="user-list">
                ${adminUsers.map(user => `
                    <div class="user-item">
                        <div class="user-info">
                            <div class="user-username">${user.username}</div>
                            <div class="user-meta">
                                Role: ${user.role} | 
                                Created: ${new Date(user.createdAt).toLocaleDateString()}
                                ${user.isDefault ? ' | Default User' : ''}
                                ${user.lastLogin ? ` | Last login: ${new Date(user.lastLogin).toLocaleDateString()}` : ' | Never logged in'}
                            </div>
                        </div>
                        <div class="user-actions">
                            ${!user.isDefault ? `
                                <button class="btn btn-warning btn-sm" onclick="editUser('${user._id}', '${user.username}')">Edit Password</button>
                                <button class="btn btn-danger btn-sm" onclick="deleteUser('${user._id}', '${user.username}')">Delete</button>
                            ` : `
                                <span style="color: #6b7280; font-size: 12px;">System User</span>
                            `}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('usersList').innerHTML = '<p>Failed to load users. Please check server connection.</p>';
    }
}

async function addUser() {
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const role = document.getElementById('userRole').value;
    
    if (!username || !password) {
        showAlert('Please enter both username and password', 'error');
        return;
    }
    
    if (password.length < 4) {
        showAlert('Password must be at least 4 characters long', 'error');
        return;
    }
    
    try {
        const serverUrl = getRandomServerUrl();
        const response = await fetch(`${serverUrl}/api/admin/auth/users`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ username, password, role })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showAlert('User added successfully', 'success');
            
            // Clear form
            document.getElementById('newUsername').value = '';
            document.getElementById('newUserPassword').value = '';
            document.getElementById('userRole').value = 'admin';
            
            loadUsers();
        } else {
            showAlert(result.error || 'Failed to add user', 'error');
        }
    } catch (error) {
        console.error('Error adding user:', error);
        showAlert('Failed to add user. Please check server connection.', 'error');
    }
}

async function editUser(userId, username) {
    const newPassword = prompt(`Enter new password for ${username}:`);
    if (!newPassword) return;
    
    if (newPassword.length < 4) {
        showAlert('Password must be at least 4 characters long', 'error');
        return;
    }
    
    try {
        const serverUrl = getRandomServerUrl();
        const response = await fetch(`${serverUrl}/api/admin/auth/users/${userId}/password`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ newPassword })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showAlert('User password updated successfully', 'success');
            loadUsers();
        } else {
            showAlert(result.error || 'Failed to update password', 'error');
        }
    } catch (error) {
        console.error('Error editing user:', error);
        showAlert('Failed to update user. Please check server connection.', 'error');
    }
}

async function deleteUser(userId, username) {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const serverUrl = getRandomServerUrl();
        const response = await fetch(`${serverUrl}/api/admin/auth/users/${userId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showAlert('User deleted successfully', 'success');
            loadUsers();
        } else {
            showAlert(result.error || 'Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showAlert('Failed to delete user. Please check server connection.', 'error');
    }
}

// Settings functions
async function saveSettings() {
    const keyRotationInterval = document.getElementById('keyRotationInterval').value;
    const serverTimeout = document.getElementById('serverTimeout').value;
    
    try {
        const serverUrl = getRandomServerUrl();
        const response = await fetch(`${serverUrl}/api/admin/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({
                keyRotationInterval: parseInt(keyRotationInterval),
                serverTimeout: parseInt(serverTimeout)
            })
        });
        
        if (response.ok) {
            showAlert('Settings saved successfully', 'success');
        } else {
            showAlert('Failed to save settings', 'error');
        }
    } catch (error) {
        showAlert('Failed to save settings', 'error');
    }
}

async function resetAllocationCounts() {
    if (!confirm('Are you sure you want to reset all allocation counts? This will restart the round-robin allocation.')) {
        return;
    }
    
    try {
        const serverUrl = getRandomServerUrl();
        const response = await fetch(`${serverUrl}/api/admin/reset-allocation`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            showAlert('Allocation counts reset successfully', 'success');
        } else {
            showAlert('Failed to reset allocation counts', 'error');
        }
    } catch (error) {
        showAlert('Failed to reset allocation counts', 'error');
    }
}

async function clearInactiveKeys() {
    if (!confirm('Are you sure you want to remove all deactivated API keys? This action cannot be undone.')) {
        return;
    }
    
    try {
        const serverUrl = getRandomServerUrl();
        const response = await fetch(`${serverUrl}/api/admin/clear-inactive`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert(`Removed ${result.deletedCount} inactive keys`, 'success');
            loadApiKeys();
        } else {
            showAlert('Failed to clear inactive keys', 'error');
        }
    } catch (error) {
        showAlert('Failed to clear inactive keys', 'error');
    }
}

async function exportData() {
    try {
        const serverUrl = getRandomServerUrl();
        const response = await fetch(`${serverUrl}/api/admin/export`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kimaaka-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showAlert('Data exported successfully', 'success');
    } catch (error) {
        showAlert('Failed to export data', 'error');
    }
}

// Utility functions
// Try servers sequentially from 1 to 5 until one responds
async function findWorkingServer() {
    // If we already found a working server, use it
    if (workingServerUrl) {
        try {
            const response = await fetch(`${workingServerUrl}/api/health`, { 
                method: 'GET',
                timeout: 3000 
            });
            if (response.ok) {
                return workingServerUrl;
            }
        } catch (error) {
            // Server is no longer working, clear cache
            workingServerUrl = null;
        }
    }
    
    // Try servers sequentially from 1 to 5
    for (let i = 0; i < SERVER_URLS.length; i++) {
        const serverUrl = SERVER_URLS[i];
        try {
            console.log(`Trying server ${i + 1}: ${serverUrl}`);
            const response = await fetch(`${serverUrl.replace('/api', '')}/api/health`, { 
                method: 'GET',
                signal: AbortSignal.timeout(3000) // 3 second timeout
            });
            
            if (response.ok) {
                console.log(`✅ Server ${i + 1} is working: ${serverUrl}`);
                workingServerUrl = serverUrl.replace('/api', '');
                return workingServerUrl;
            }
        } catch (error) {
            console.log(`❌ Server ${i + 1} failed: ${error.message}`);
            continue;
        }
    }
    
    // If no server is working, throw an error
    throw new Error('No servers are currently available. Please check if any server is running on ports 3000-3004.');
}

// Smart server selection: try cached server first, then sequential search
async function getWorkingServerUrl() {
    console.log('getWorkingServerUrl - Current cached server:', workingServerUrl);
    
    // If we have a cached working server, try it first
    if (workingServerUrl) {
        try {
            console.log('Testing cached server:', workingServerUrl);
            const response = await fetch(`${workingServerUrl}/api/health`, { 
                method: 'GET',
                signal: AbortSignal.timeout(2000) // Quick 2 second timeout for cached server
            });
            if (response.ok) {
                console.log('Cached server is working:', workingServerUrl);
                return workingServerUrl;
            }
        } catch (error) {
            console.log('Cached server failed:', error.message);
            // Cached server is no longer working, clear cache
            workingServerUrl = null;
            localStorage.removeItem('workingServerUrl');
        }
    }
    
    // No cached server or it's not working, find a new one
    console.log('Finding new working server...');
    const newServerUrl = await findWorkingServer();
    console.log('Found working server:', newServerUrl);
    return newServerUrl;
}

// Enhanced fetch function that automatically finds working server
async function fetchFromServer(endpoint, options = {}) {
    const serverUrl = await getWorkingServerUrl();
    return fetch(`${serverUrl}${endpoint}`, options);
}

function getRandomServerUrl() {
    // This function is kept for compatibility but now returns the cached working server
    // For immediate use when async is not possible, return the cached working server or default to primary server
    const primaryServer = window.SERVER_CONFIG ? window.SERVER_CONFIG.getPrimaryServerUrl() : 'http://localhost:3001';
    return workingServerUrl || primaryServer;
}

function maskApiKey(apiKey) {
    if (!apiKey || apiKey.length < 8) return apiKey;
    return apiKey.substring(0, 4) + '*'.repeat(apiKey.length - 8) + apiKey.substring(apiKey.length - 4);
}

function getStatusClass(status) {
    switch(status) {
        case 'active': return 'status-active';
        case 'deactivated': return 'status-deactivated';
        case 'donated': return 'status-donated';
        default: return 'status-deactivated';
    }
}

function showAlert(message, type) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create new alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    // Insert at the top of the active tab content
    const activeTab = document.querySelector('.tab-content.active');
    activeTab.insertBefore(alert, activeTab.firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Server Usage Functions
async function refreshServerUsage() {
    try {
        const serverUrl = await getWorkingServerUrl();
        console.log('Server Usage - Using server URL:', serverUrl);
        const response = await fetch(`${serverUrl}/api/admin/server-usage`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            updateServerUsageOverview(data.totalStats);
            displayServerUsageList(data.servers);
            showAlert('Server usage data refreshed successfully', 'success');
        } else {
            console.error('Server usage response error:', response.status, response.statusText);
            throw new Error('Failed to load server usage data');
        }
    } catch (error) {
        console.error('Server usage refresh error:', error);
        showAlert('Failed to refresh server usage data', 'error');
    }
}

function updateServerUsageOverview(stats) {
    document.getElementById('totalServerAllocations').textContent = stats.totalAllocations.toLocaleString();
    document.getElementById('totalServerApiCalls').textContent = stats.totalApiCalls.toLocaleString();
    document.getElementById('avgResponseTime').textContent = Math.round(stats.averageResponseTime);
    
    const successRate = stats.totalApiCalls > 0 ? 
        ((stats.totalSuccessfulRequests / stats.totalApiCalls) * 100).toFixed(1) : '0';
    document.getElementById('successRate').textContent = successRate;
}

function displayServerUsageList(servers) {
    const container = document.getElementById('serverUsageList');
    
    if (!servers || servers.length === 0) {
        container.innerHTML = '<div class="no-data">No server usage data available</div>';
        return;
    }

    const serversHtml = servers.map(server => {
        const port = server.serverUrl.match(/:(\d+)/)?.[1] || 'Unknown';
        const responseTime = server.averageResponseTime || 0;
        const healthClass = getHealthIndicatorClass(responseTime, server.isOnline);
        const healthText = getHealthText(responseTime, server.isOnline);
        const successRate = server.totalApiCalls > 0 ? 
            ((server.successfulRequests / server.totalApiCalls) * 100).toFixed(1) : '0';

        return `
            <div class="server-usage-card">
                <div class="server-usage-header">
                    <div class="server-port">Port ${port}</div>
                    <div class="server-health">
                        <div class="health-indicator ${healthClass}"></div>
                        <span>${healthText}</span>
                    </div>
                </div>
                
                <div class="server-metrics">
                    <div class="metric-item">
                        <div class="metric-value">${server.totalAllocations.toLocaleString()}</div>
                        <div class="metric-label">Allocations</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${server.totalApiCalls.toLocaleString()}</div>
                        <div class="metric-label">API Calls</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${Math.round(responseTime)}ms</div>
                        <div class="metric-label">Avg Response</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${successRate}%</div>
                        <div class="metric-label">Success Rate</div>
                    </div>
                </div>

                <div style="margin-top: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span style="font-size: 0.9rem; color: #6b7280;">Load Distribution</span>
                        <span style="font-size: 0.8rem; color: #6b7280;">${server.totalLoadHandled || 0}% of total</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(server.totalLoadHandled || 0, 100)}%"></div>
                    </div>
                </div>

                <div style="margin-top: 15px; display: flex; justify-content: space-between; font-size: 0.8rem; color: #6b7280;">
                    <span>Last Activity: ${formatLastActivity(server.lastActivity)}</span>
                    <span>Status: ${server.isOnline ? '🟢 Online' : '🔴 Offline'}</span>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = serversHtml;
}

function getHealthIndicatorClass(responseTime, isOnline) {
    if (!isOnline) return 'health-poor';
    if (responseTime < 500) return 'health-excellent';
    if (responseTime < 1000) return 'health-good';
    return 'health-poor';
}

function getHealthText(responseTime, isOnline) {
    if (!isOnline) return 'Offline';
    if (responseTime < 500) return 'Excellent';
    if (responseTime < 1000) return 'Good';
    return 'Poor';
}

function formatLastActivity(lastActivity) {
    if (!lastActivity) return 'Never';
    const date = new Date(lastActivity);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
}

async function loadServerAnalytics() {
    try {
        const days = document.getElementById('analyticsRange').value;
        const serverUrl = await getWorkingServerUrl();
        console.log('Analytics - Using server URL:', serverUrl);
        
        const response = await fetch(`${serverUrl}/api/admin/server-analytics?days=${days}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            renderDailyChart(data.daily);
            renderHourlyChart(data.hourly);
        } else {
            console.error('Analytics response error:', response.status, response.statusText);
            throw new Error('Failed to load analytics data');
        }
    } catch (error) {
        console.error('Analytics load error:', error);
        showAlert('Failed to load analytics data', 'error');
    }
}

function renderDailyChart(dailyData) {
    const canvas = document.getElementById('dailyChart');
    const ctx = canvas.getContext('2d');
    
    // Simple canvas chart rendering (you can replace with Chart.js)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!dailyData || dailyData.length === 0) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Simple bar chart
    const maxCalls = Math.max(...dailyData.map(d => d.apiCalls));
    const barWidth = canvas.width / dailyData.length;
    
    dailyData.forEach((day, index) => {
        const barHeight = (day.apiCalls / maxCalls) * (canvas.height - 40);
        const x = index * barWidth;
        const y = canvas.height - barHeight - 20;
        
        ctx.fillStyle = '#4f46e5';
        ctx.fillRect(x + 5, y, barWidth - 10, barHeight);
        
        // Labels
        ctx.fillStyle = '#374151';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
                     x + barWidth / 2, canvas.height - 5);
    });
}

function renderHourlyChart(hourlyData) {
    const canvas = document.getElementById('hourlyChart');
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!hourlyData || hourlyData.length === 0) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Simple line chart for hourly data
    const maxCalls = Math.max(...hourlyData.map(h => h.apiCalls));
    const stepX = canvas.width / (hourlyData.length - 1);
    
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    hourlyData.forEach((hour, index) => {
        const x = index * stepX;
        const y = canvas.height - 20 - ((hour.apiCalls / maxCalls) * (canvas.height - 40));
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
        
        // Data points
        ctx.fillStyle = '#10b981';
        ctx.fillRect(x - 2, y - 2, 4, 4);
    });
    
    ctx.stroke();
}

async function resetServerStats() {
    if (!confirm('Are you sure you want to reset all server statistics? This action cannot be undone.')) {
        return;
    }
    
    try {
        const serverUrl = await getWorkingServerUrl();
        const response = await fetch(`${serverUrl}/api/admin/reset-server-stats`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            showAlert('Server statistics reset successfully', 'success');
            refreshServerUsage();
            loadServerAnalytics();
        } else {
            throw new Error('Failed to reset server statistics');
        }
    } catch (error) {
        console.error('Reset server stats error:', error);
        showAlert('Failed to reset server statistics', 'error');
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function() {
    // Clear cached server URL to force fresh discovery (temporary debug)
    localStorage.removeItem('workingServerUrl');
    workingServerUrl = null;
    console.log('Cleared cached server URL for fresh discovery');
    
    // Check if user is already authenticated
    const isAuthenticated = await checkAuthentication();
    
    if (isAuthenticated) {
        showDashboard();
        loadOverview();
    } else {
        // Show login screen (default state)
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('dashboardContainer').style.display = 'none';
    }
    
    // Auto-refresh every 30 seconds (only when authenticated)
    setInterval(() => {
        if (currentUser && authToken && document.getElementById('dashboardContainer').style.display !== 'none') {
            const activeTab = document.querySelector('.tab-content.active');
            if (activeTab) {
                loadTabData(activeTab.id);
            }
        }
    }, 30000);
});
