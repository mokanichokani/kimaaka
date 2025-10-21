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
        showLoginError(error.message || 'Connection error. Please check if any server is available.');
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

function showLoginError(message, rror = true) {
    const errorElement = document.getElementById('loginError');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
    
    // If it's an error message, hide after 5 seconds
    // If it's a loading message, don't auto-hide
    if (rror) {
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
        case 'users':
            loadUsers();
            break;
    }
}

// Overview functions
async function loadOverview() {
    try {
        // Check authentication first
        if (!authToken) {
            console.warn('No authentication token for overview');
            showAlert('Please log in to view statistics', 'error');
            return;
        }
        
        // Get aggregated statistics from all available servers
        const stats = await getAggregatedServerStats();
        
        // Basic counts
        document.getElementById('totalApiKeys').textContent = stats.totalApiKeys || 0;
        document.getElementById('activeApiKeys').textContent = stats.activeApiKeys || 0;
        document.getElementById('donatedApiKeys').textContent = stats.donatedApiKeys || 0;
        document.getElementById('onlineServers').textContent = await getOnlineServerCount();
        
        // Load detailed usage statistics
        await loadUsageStatistics(stats);
        
        loadRecentActivity();
    } catch (error) {
        console.error('Error loading overview:', error);
        if (error.message.includes('Authentication required')) {
            showAlert('Authentication required. Please log in to view admin statistics.', 'error');
        } else {
            showAlert('Failed to load overview data', 'error');
        }
    }
}

async function loadUsageStatistics(baseStats) {
    try {
        const serverUrl = await getWorkingServerUrl();
        const timeRange = document.getElementById('timeRange')?.value || '30';
        const response = await fetch(`${serverUrl}/api/admin/usage-statistics?days=${timeRange}`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            console.warn('Failed to load usage statistics:', response.status);
            return;
        }
        
        const usageStats = await response.json();
        console.log('Usage statistics loaded:', usageStats);
        console.log('Daily breakdown data:', usageStats.dailyBreakdown);
        
        // Update overview cards with usage data
        const totalCallsElement = document.getElementById('totalApiCalls');
        const totalAllocationsElement = document.getElementById('totalAllocations');
        const successRateElement = document.getElementById('successRate');
        const avgResponseTimeElement = document.getElementById('avgResponseTime');
        const lastUsedElement = document.getElementById('lastUsed');
        const serverUptimeElement = document.getElementById('serverUptime');
        
        if (totalCallsElement) {
            totalCallsElement.textContent = (usageStats.summary.totalApiCalls || 0).toLocaleString();
        }
        
        if (totalAllocationsElement) {
            totalAllocationsElement.textContent = (usageStats.summary.totalAllocations || 0).toLocaleString();
        }
        
        if (successRateElement && usageStats.currentServer) {
            const total = usageStats.currentServer.successfulRequests + usageStats.currentServer.failedRequests;
            const rate = total > 0 ? 
                ((usageStats.currentServer.successfulRequests / total) * 100).toFixed(1) : '100.0';
            successRateElement.textContent = rate + '%';
        }
        
        if (avgResponseTimeElement && usageStats.currentServer) {
            avgResponseTimeElement.textContent = Math.round(usageStats.currentServer.averageResponseTime || 0) + 'ms';
        }
        
        if (lastUsedElement && usageStats.currentServer.lastUsed) {
            const lastUsed = new Date(usageStats.currentServer.lastUsed);
            const now = new Date();
            const diffMinutes = Math.floor((now - lastUsed) / (1000 * 60));
            
            if (diffMinutes < 1) {
                lastUsedElement.textContent = 'Just now';
            } else if (diffMinutes < 60) {
                lastUsedElement.textContent = `${diffMinutes}m ago`;
            } else if (diffMinutes < 1440) {
                lastUsedElement.textContent = `${Math.floor(diffMinutes / 60)}h ago`;
            } else {
                lastUsedElement.textContent = `${Math.floor(diffMinutes / 1440)}d ago`;
            }
        } else if (lastUsedElement) {
            lastUsedElement.textContent = 'Never';
        }
        
        if (serverUptimeElement && usageStats.currentServer) {
            const uptimeSeconds = usageStats.currentServer.uptime || 0;
            const hours = Math.floor(uptimeSeconds / 3600);
            const minutes = Math.floor((uptimeSeconds % 3600) / 60);
            serverUptimeElement.textContent = `${hours}h ${minutes}m`;
        }
        
        // Create usage breakdown chart if container exists
        createUsageBreakdownChart(usageStats);
        
    } catch (error) {
        console.error('Error loading usage statistics:', error);
    }
}

// Function to update the usage chart with new time range
async function updateUsageChart() {
    try {
        const timeRange = document.getElementById('timeRange')?.value || '30';
        const serverUrl = await getWorkingServerUrl();
        const response = await fetch(`${serverUrl}/api/admin/usage-statistics?days=${timeRange}`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            console.warn('Failed to load usage statistics:', response.status);
            return;
        }
        
        const usageStats = await response.json();
        createUsageBreakdownChart(usageStats);
        showAlert(`Chart updated for last ${timeRange} days`, 'success');
    } catch (error) {
        console.error('Error updating usage chart:', error);
        showAlert('Failed to update chart', 'error');
    }
}

function createUsageBreakdownChart(usageStats) {
    const chartContainer = document.getElementById('usageChart');
    if (!chartContainer) {
        console.log('Chart container not found');
        return;
    }
    
    const dailyData = usageStats.dailyBreakdown || [];
    console.log('Chart data:', dailyData);
    
    if (!dailyData || dailyData.length === 0) {
        console.log('No daily data available for chart');
        chartContainer.innerHTML = '<div style="text-align: center; padding: 30px; background: #ffffff; border: 4px solid #000000; box-shadow: 4px 4px 0px #000000;"><p style="color: #000000; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; font-size: 18px;">No usage data available for chart</p></div>';
        return;
    }
    
    // Calculate total calls for display
    const totalCalls = dailyData.reduce((sum, day) => sum + (day.apiCalls || 0), 0);
    const maxCalls = Math.max(...dailyData.map(d => d.apiCalls || 0));
    
    // If no calls at all, show a message
    if (totalCalls === 0) {
        chartContainer.innerHTML = '<div style="text-align: center; padding: 30px; background: #ffffff; border: 4px solid #000000; box-shadow: 4px 4px 0px #000000;"><p style="color: #000000; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; font-size: 18px;">No API calls recorded yet</p></div>';
        return;
    }
    
    // Create responsive bar chart
    const daysCount = dailyData.length;
    const barWidth = Math.max(20, Math.min(50, 800 / daysCount)); // Responsive bar width
    const chartHeight = 120;
    
    let chartHTML = '<div class="usage-chart" style="padding: 20px; background: #ffffff; border: 4px solid #000000; box-shadow: 4px 4px 0px #000000; margin: 10px 0;">';
    chartHTML += `<h4 style="margin: 0 0 20px 0; color: #000000; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">API Calls (Last ${daysCount} Days)</h4>`;
    chartHTML += '<div class="chart-container" style="display: flex; align-items: end; height: ' + chartHeight + 'px; gap: 2px; margin: 10px 0; overflow-x: auto; padding: 10px 0;">';
    
    dailyData.forEach((day, index) => {
        const apiCalls = day.apiCalls || 0;
        const height = maxCalls > 0 ? Math.max(20, (apiCalls / maxCalls) * (chartHeight - 40)) : 20;
        const date = new Date(day.date);
        const isToday = index === dailyData.length - 1;
        const isRecent = index >= dailyData.length - 7;
        
        // Format date based on time range
        let dateLabel;
        if (daysCount <= 14) {
            dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else if (daysCount <= 30) {
            dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else {
            dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        
        chartHTML += `
            <div class="chart-bar" style="
                background: ${isToday ? '#00ff00' : isRecent ? '#ff00ff' : '#00ffff'}; 
                width: ${barWidth}px; 
                height: ${height}px; 
                position: relative; 
                border: 2px solid #000000;
                cursor: pointer;
                transition: all 0.2s ease;
                flex-shrink: 0;
            " 
            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='4px 4px 0px #000000';" 
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';"
            title="${apiCalls} calls on ${dateLabel}">
                <div style="position: absolute; bottom: -25px; font-size: 10px; text-align: center; width: 100%; color: #000000; font-weight: 700; white-space: nowrap;">${dateLabel}</div>
                <div style="position: absolute; top: -20px; font-size: 10px; text-align: center; width: 100%; font-weight: 900; color: #000000; white-space: nowrap;">${apiCalls}</div>
            </div>
        `;
    });
    
    chartHTML += '</div>';
    chartHTML += `<div style="text-align: center; margin-top: 20px; font-size: 16px; color: #000000; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Total: ${totalCalls.toLocaleString()} API calls over ${daysCount} days</div>`;
    chartHTML += '</div>';
    
    chartContainer.innerHTML = chartHTML;
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
    
    // Get base URLs for health checks (without /api)
    const baseUrls = window.SERVER_CONFIG ? window.SERVER_CONFIG.getBaseUrls() : [];
    
    const serverProms = baseUrls.map(async (baseUrl, index) => {
        // Extract server identifier (port for localhost, domain for production)
        let serverIdentifier;
        if (baseUrl.includes('localhost')) {
            serverIdentifier = `Port ${baseUrl.split(':')[2]}`;
        } else {
            // For production URLs like https://example-server1.onrender.com
            const domain = baseUrl.replace('https://', '').replace('http://', '');
            serverIdentifier = domain;
        }
        
        try {
            const response = await fetch(`${baseUrl}/api/health`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            const isOnline = response.ok;
            const data = isOnline ? await response.json() : null;
            
            return {
                index: index + 1,
                url: baseUrl,
                identifier: serverIdentifier,
                status: isOnline ? 'online' : 'offline',
                data: data
            };
        } catch (error) {
            return {
                index: index + 1,
                url: baseUrl,
                identifier: serverIdentifier,
                status: 'offline',
                error: error.message
            };
        }
    });
    
    try {
        const serverStatuses = await Promise.all(serverProms);
        
        container.innerHTML = serverStatuses.map(server => `
            <div class="server-card">
                <div class="server-status">
                    <div class="status-indicator ${server.status === 'online' ? 'status-online' : 'status-offline'}"></div>
                    <strong>Server ${server.index} (${server.identifier})</strong>
                </div>
                <p><strong>Status:</strong> ${server.status.toUpperCase()}</p>
                <p><strong>URL:</strong> ${server.url}</p>
                ${server.data ? `
                    <p><strong>Database:</strong> ${server.data.database || 'Unknown'}</p>
                    <p><strong>Uptime:</strong> ${Math.floor(server.data.uptime || 0)}s</p>
                    <p><strong>Admin Keys:</strong> ${server.data.adminKeysCount || 0}</p>
                    <p><strong>Donated Keys:</strong> ${server.data.donatedKeysCount || 0}</p>
                ` : ''}
                ${server.error ? `<p><strong>Error:</strong> ${server.error}</p>` : ''}
                <button class="btn btn-primary btn-sm" onclick="restartServer('${server.url}')">Restart</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error checking servers:', error);
        container.innerHTML = '<p>Failed to check server status. Please check the console for details.</p>';
    }
}

async function getOnlineServerCount() {
    let onlineCount = 0;
    
    // Get base URLs for health checks (without /api)
    const baseUrls = window.SERVER_CONFIG ? window.SERVER_CONFIG.getBaseUrls() : [];
    
    const proms = baseUrls.map(async (baseUrl) => {
        try {
            const response = await fetch(`${baseUrl}/api/health`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            return response.ok;
        } catch {
            return false;
        }
    });
    
    const results = await Promise.all(proms);
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
                                ${user.allocatedServer ? ` | Server: ${user.allocatedServer}` : ' | Not allocated'}
                            </div>
                        </div>
                        <div class="user-actions">
                            ${!user.isDefault ? `
                                <button class="btn btn-warning btn-sm" onclick="editUser('${user._id}', '${user.username}')">Edit Password</button>
                                <button class="btn btn-info btn-sm" onclick="reallocateUser('${user._id}', '${user.username}')">🔄 Reallocate</button>
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

// Function to reallocate user (delete their current API key allocation)
async function reallocateUser(userId, username) {
    if (!confirm(`Are you sure you want to reallocate user "${username}"? This will delete their current API key allocation so they can get a new one.`)) {
        return;
    }
    
    try {
        const serverUrl = getRandomServerUrl();
        const response = await fetch(`${serverUrl}/api/admin/users/${userId}/reallocate`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showAlert(`User "${username}" has been reallocated. They can now get a new API key.`, 'success');
            loadUsers();
        } else {
            showAlert(result.error || 'Failed to reallocate user', 'error');
        }
    } catch (error) {
        console.error('Error reallocating user:', error);
        showAlert('Failed to reallocate user. Please check server connection.', 'error');
    }
}

// Function to delete user's API key allocation from a specific server
async function deleteUserServerAllocation(userId, username, serverUrl) {
    if (!confirm(`Are you sure you want to delete user "${username}"'s allocation from server ${serverUrl}? They can get reallocated to another server.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${serverUrl}/api/admin/users/${userId}/allocation`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showAlert(`User "${username}" has been deallocated from server. They can now get reallocated.`, 'success');
            loadUsers();
            refreshServerUsage(); // Refresh server usage to show updated numbers
        } else {
            showAlert(result.error || 'Failed to delete user allocation', 'error');
        }
    } catch (error) {
        console.error('Error deleting user allocation:', error);
        showAlert('Failed to delete user allocation. Please check server connection.', 'error');
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
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                return workingServerUrl;
            }
        } catch (error) {
            // Server is no longer working, clear cache
            workingServerUrl = null;
        }
    }
    
    // Get base URLs for health checks
    const baseUrls = window.SERVER_CONFIG ? window.SERVER_CONFIG.getBaseUrls() : [];
    
    // Try servers sequentially from 1 to 5
    for (let i = 0; i < baseUrls.length; i++) {
        const baseUrl = baseUrls[i];
        try {
            console.log(`Trying server ${i + 1}: ${baseUrl}`);
            const response = await fetch(`${baseUrl}/api/health`, { 
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                console.log(`✅ Server ${i + 1} is working: ${baseUrl}`);
                workingServerUrl = baseUrl;
                return workingServerUrl;
            }
        } catch (error) {
            console.log(`❌ Server ${i + 1} failed: ${error.message}`);
            continue;
        }
    }
    
    // If no server is working, throw an error
    throw new Error('No servers are currently available. Please check server status or try again later.');
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

// Enhanced statistics function that gets UNIQUE data across servers (not multiplied)
async function getAggregatedServerStats() {
    const baseUrls = window.SERVER_CONFIG ? window.SERVER_CONFIG.getBaseUrls() : [];
    console.log('Getting stats from servers:', baseUrls);
    
    const aggregatedStats = {
        totalApiKeys: 0,
        activeApiKeys: 0,
        donatedApiKeys: 0,
        totalAllocations: 0,
        totalApiCalls: 0,
        totalSuccessfulRequests: 0,
        servers: [],
        onlineServers: 0,
        averageResponseTime: 0,
        successRate: 0
    };
    
    // Check if we have authentication
    if (!authToken) {
        console.warn('No auth token available for admin statistics');
        throw new Error('Authentication required for admin statistics. Please log in first.');
    }
    
    // Collect stats from all servers
    const serverProms = baseUrls.map(async (baseUrl, index) => {
        try {
            console.log(`Fetching stats from server ${index + 1}: ${baseUrl}`);
            const response = await fetch(`${baseUrl}/api/admin/stats`, {
                method: 'GET',
                headers: {
                    ...getAuthHeaders(),
                    'Accept': 'application/json'
                },
                timeout: 10000 // 10 second timeout
            });
            
            if (response.ok) {
                const stats = await response.json();
                console.log(`Raw stats from ${baseUrl}:`, stats);
                console.log(`Stats type:`, typeof stats);
                console.log(`Stats keys:`, Object.keys(stats));
                
                // Map common field variations to our expected format
                const normalizedStats = {
                    totalApiKeys: stats.totalApiKeys || stats.apiKeysCount || stats.totalKeys || 0,
                    activeApiKeys: stats.activeApiKeys || stats.activeKeys || 0,
                    donatedApiKeys: stats.donatedApiKeys || stats.donatedKeys || 0,
                    totalAllocations: stats.totalAllocations || stats.allocations || stats.userAllocations || 0,
                    totalApiCalls: stats.totalApiCalls || stats.apiCalls || stats.requests || 0,
                    totalSuccessfulRequests: stats.totalSuccessfulRequests || stats.successfulRequests || stats.successfulCalls || 0,
                    averageResponseTime: stats.averageResponseTime || stats.avgResponseTime || stats.responseTime || 0,
                    adminKeysCount: stats.adminKeysCount || stats.adminKeys || 0,
                    donatedKeysCount: stats.donatedKeysCount || stats.donatedKeys || 0
                };
                
                console.log(`Normalized stats for ${baseUrl}:`, normalizedStats);
                
                return {
                    index: index + 1,
                    url: baseUrl,
                    identifier: baseUrl.includes('localhost') ? 
                        `Port ${baseUrl.split(':')[2]}` : 
                        baseUrl.replace('https://', '').replace('http://', ''),
                    status: 'online',
                    stats: normalizedStats,
                    rawStats: stats
                };
            } else if (response.status === 401) {
                console.warn(`Authentication failed for ${baseUrl}`);
                return null;
            } else {
                console.warn(`Server ${baseUrl} returned status:`, response.status);
                return null;
            }
        } catch (error) {
            console.warn(`Failed to get stats from ${baseUrl}:`, error.message);
            return null;
        }
    });
    
    const serverResults = await Promise.all(serverProms);
    console.log('All server results:', serverResults);
    
    // Get the first working server's stats as the base (since API keys are shared across servers)
    const workingServers = serverResults.filter(result => result && result.stats);
    
    if (workingServers.length > 0) {
        // Use stats from first server since API keys are shared across all servers
        const firstServer = workingServers[0];
        const baseStats = firstServer.stats;
        console.log(`Using base stats from ${firstServer.identifier}:`, baseStats);
        
        // API keys are shared across servers, so don't multiply
        aggregatedStats.totalApiKeys = baseStats.totalApiKeys || 0;
        aggregatedStats.activeApiKeys = baseStats.activeApiKeys || 0;
        aggregatedStats.donatedApiKeys = baseStats.donatedApiKeys || 0;
        
        // Sum the usage stats (allocations, calls) from all working servers
        workingServers.forEach(result => {
            if (result && result.stats) {
                const serverStats = result.stats;
                aggregatedStats.totalAllocations += serverStats.totalAllocations || 0;
                aggregatedStats.totalApiCalls += serverStats.totalApiCalls || 0;
                aggregatedStats.totalSuccessfulRequests += serverStats.totalSuccessfulRequests || 0;
                aggregatedStats.onlineServers++;
                
                aggregatedStats.servers.push({
                    identifier: result.identifier,
                    url: result.url,
                    stats: result.stats,
                    status: result.status
                });
            }
        });
        
        // Calculate derived metrics
        aggregatedStats.successRate = aggregatedStats.totalApiCalls > 0 ? 
            ((aggregatedStats.totalSuccessfulRequests / aggregatedStats.totalApiCalls) * 100).toFixed(1) : '0';
        
        // Calculate average response time across servers
        const responseTimes = workingServers
            .map(server => server.stats.averageResponseTime)
            .filter(time => time !== undefined && time !== null && time > 0);
        
        aggregatedStats.averageResponseTime = responseTimes.length > 0 ?
            responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;
            
    } else {
        console.warn('No working servers found for statistics');
        // If no servers are working, we might still want to show the interface
        // with zeros or use cached/mock data for testing
    }
    
    console.log('Final aggregated stats:', aggregatedStats);
    return aggregatedStats;
}

// Helper function to validate and enhance server data
function validateServerData(server, index) {
    const validatedServer = {
        identifier: server.identifier || `Server ${index + 1}`,
        url: server.url || 'Unknown',
        status: server.status || 'unknown',
        stats: {
            totalApiKeys: 0,
            activeApiKeys: 0,
            donatedApiKeys: 0,
            adminKeysCount: 0,
            donatedKeysCount: 0,
            totalAllocations: 0,
            totalApiCalls: 0,
            totalSuccessfulRequests: 0,
            averageResponseTime: 0,
            ...server.stats
        }
    };
    
    // Ensure all numeric values are actually numbers
    Object.keys(validatedServer.stats).forEach(key => {
        const value = validatedServer.stats[key];
        if (typeof value !== 'number' || isNaN(value)) {
            validatedServer.stats[key] = 0;
        }
    });
    
    return validatedServer;
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
        // Check authentication first
        if (!authToken) {
            showAlert('Please log in to view server usage statistics', 'error');
            return;
        }
        
        console.log('Refreshing server usage from all available servers...');
        console.log('Auth token present:', !!authToken);
        
        // Show loading state
        document.getElementById('totalServerAllocations').textContent = 'Loading...';
        document.getElementById('totalServerApiCalls').textContent = 'Loading...';
        document.getElementById('avgResponseTime').textContent = 'Loading...';
        document.getElementById('successRate').textContent = 'Loading...';
        
        // Get aggregated statistics from all servers
        const aggregatedStats = await getAggregatedServerStats();
        console.log('Aggregated stats received:', aggregatedStats);
        
        // Update overview with aggregated data
        updateServerUsageOverview(aggregatedStats);
        
        // Display individual server usage with enhanced error handling
        if (aggregatedStats.servers && aggregatedStats.servers.length > 0) {
            console.log('Displaying server list with', aggregatedStats.servers.length, 'servers');
            displayServerUsageList(aggregatedStats.servers);
        } else {
            // If no server data, show a message
            const container = document.getElementById('serverUsageList');
            container.innerHTML = `
                <div class="no-data">
                    <p>No individual server data available.</p>
                    <p><small>This might be due to:</small></p>
                    <ul style="text-align: left; margin: 10px 0;">
                        <li>Authentication issues</li>
                        <li>Servers not responding to admin endpoints</li>
                        <li>Missing server statistics data</li>
                    </ul>
                    <button class="btn btn-primary" onclick="refreshServerUsage()">🔄 Try Again</button>
                    <button class="btn btn-info" onclick="testServerConnection()">🧪 Test Connection</button>
                </div>
            `;
        }
        
        showAlert(`Server usage data refreshed from ${aggregatedStats.onlineServers} server(s)`, 'success');
    } catch (error) {
        console.error('Server usage refresh error:', error);
        
        // Reset loading states to show error
        document.getElementById('totalServerAllocations').textContent = 'Error';
        document.getElementById('totalServerApiCalls').textContent = 'Error';
        document.getElementById('avgResponseTime').textContent = 'Error';
        document.getElementById('successRate').textContent = 'Error';
        
        if (error.message.includes('Authentication required')) {
            showAlert('Authentication required. Please log in to view server usage statistics.', 'error');
        } else {
            showAlert('Failed to refresh server usage data: ' + error.message, 'error');
        }
    }
}

// Debug function to test server connection
async function testServerConnection() {
    try {
        console.log('Testing server connections...');
        const baseUrls = window.SERVER_CONFIG ? window.SERVER_CONFIG.getBaseUrls() : [];
        console.log('Testing URLs:', baseUrls);
        
        const results = [];
        
        for (const baseUrl of baseUrls) {
            try {
                console.log(`Testing ${baseUrl}...`);
                
                // Test health endpoint
                const healthResponse = await fetch(`${baseUrl}/api/health`);
                console.log(`Health check for ${baseUrl}:`, healthResponse.status);
                
                // Test admin stats endpoint
                const statsResponse = await fetch(`${baseUrl}/api/admin/stats`, {
                    headers: getAuthHeaders()
                });
                console.log(`Stats check for ${baseUrl}:`, statsResponse.status);
                
                let statsData = null;
                if (statsResponse.ok) {
                    statsData = await statsResponse.json();
                    console.log(`Stats data from ${baseUrl}:`, statsData);
                }
                
                results.push({
                    url: baseUrl,
                    health: healthResponse.status,
                    stats: statsResponse.status,
                    data: statsData
                });
                
            } catch (err) {
                console.error(`Error testing ${baseUrl}:`, err);
                results.push({
                    url: baseUrl,
                    health: 'Error',
                    stats: 'Error',
                    error: err.message
                });
            }
        }
        
        // Display results in a popup or alert
        const resultText = results.map(r => 
            `${r.url}: Health=${r.health}, Stats=${r.stats}${r.error ? `, Error=${r.error}` : ''}`
        ).join('\n');
        
        alert('Connection Test Results:\n\n' + resultText);
        console.log('Full test results:', results);
        
        showAlert('Server connection test completed. Check console for details.', 'info');
    } catch (error) {
        console.error('Test connection error:', error);
        showAlert('Failed to test server connections', 'error');
    }
}

// Function to show raw statistics data for debugging
async function showRawStats() {
    try {
        const baseUrls = window.SERVER_CONFIG ? window.SERVER_CONFIG.getBaseUrls() : [];
        console.log('Fetching raw stats from all servers...');
        
        const allResults = [];
        
        for (const baseUrl of baseUrls) {
            try {
                const response = await fetch(`${baseUrl}/api/admin/stats`, {
                    headers: getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`Raw stats from ${baseUrl}:`, data);
                    console.log(`Data keys:`, Object.keys(data));
                    console.log(`Data values:`, Object.values(data));
                    
                    allResults.push({
                        server: baseUrl,
                        status: 'success',
                        data: data,
                        keys: Object.keys(data)
                    });
                } else {
                    console.log(`Failed to get stats from ${baseUrl}:`, response.status);
                    allResults.push({
                        server: baseUrl,
                        status: 'error',
                        error: `HTTP ${response.status}`
                    });
                }
            } catch (error) {
                console.error(`Error getting stats from ${baseUrl}:`, error);
                allResults.push({
                    server: baseUrl,
                    status: 'error',
                    error: error.message
                });
            }
        }
        
        // Create a detailed report
        const report = allResults.map(result => {
            if (result.status === 'success') {
                return `✅ ${result.server}:\n  Fields: ${result.keys.join(', ')}\n  Data: ${JSON.stringify(result.data, null, 2)}`;
            } else {
                return `❌ ${result.server}: ${result.error}`;
            }
        }).join('\n\n');
        
        // Show in alert and console
        alert('Raw Statistics Report:\n\n' + report);
        console.log('Complete raw stats results:', allResults);
        
        showAlert('Raw statistics logged to console', 'info');
    } catch (error) {
        console.error('Error showing raw stats:', error);
        showAlert('Failed to show raw statistics', 'error');
    }
}

// Function to test display with mock data
async function testMockData() {
    console.log('Testing display with mock data...');
    
    const mockStats = {
        totalApiKeys: 4,
        activeApiKeys: 4,
        donatedApiKeys: 0,
        totalAllocations: 25,
        totalApiCalls: 150,
        totalSuccessfulRequests: 142,
        onlineServers: 1,
        averageResponseTime: 350,
        successRate: '94.7',
        servers: [
            {
                identifier: 'kimaaka-server.vercel.app',
                url: 'https://kimaaka-server.vercel.app',
                status: 'online',
                stats: {
                    totalApiKeys: 4,
                    activeApiKeys: 4,
                    donatedApiKeys: 0,
                    totalAllocations: 5,
                    totalApiCalls: 30,
                    totalSuccessfulRequests: 28,
                    averageResponseTime: 320,
                    adminKeysCount: 4,
                    donatedKeysCount: 0
                }
            }
        ]
    };
    
    console.log('Mock data:', mockStats);
    
    // Test overview display
    updateServerUsageOverview(mockStats);
    
    // Test individual server display
    displayServerUsageList(mockStats.servers);
    
    showAlert('Mock data test completed - check if statistics display correctly', 'info');
}

function updateServerUsageOverview(stats) {
    console.log('updateServerUsageOverview called with:', stats);
    console.log('Stats keys:', Object.keys(stats));
    
    // Debug each field
    console.log('totalAllocations:', stats.totalAllocations);
    console.log('totalApiCalls:', stats.totalApiCalls);
    console.log('averageResponseTime:', stats.averageResponseTime);
    console.log('totalSuccessfulRequests:', stats.totalSuccessfulRequests);
    
    document.getElementById('totalServerAllocations').textContent = (stats.totalAllocations || 0).toLocaleString();
    document.getElementById('totalServerApiCalls').textContent = (stats.totalApiCalls || 0).toLocaleString();
    document.getElementById('avgResponseTime').textContent = Math.round(stats.averageResponseTime || 0);
    
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

    // Validate and enhance server data
    const validatedServers = servers.map((server, index) => validateServerData(server, index));

    const serversHtml = validatedServers.map((server, index) => {
        // Extract server identifier (domain for production, port for localhost)
        let serverIdentifier = server.identifier;
        if (server.url && server.url !== 'Unknown') {
            if (server.url.includes('localhost')) {
                const port = server.url.match(/:(\d+)/)?.[1] || 'Unknown';
                serverIdentifier = `Port ${port}`;
            } else {
                // For production URLs, extract domain name
                const domain = server.url.replace('https://', '').replace('http://', '').split('/')[0];
                serverIdentifier = domain;
            }
        }
        
        // Extract statistics from nested stats object
        const stats = server.stats;
        const responseTime = stats.averageResponseTime || 0;
        const isOnline = server.status === 'online';
        const healthClass = getHealthIndicatorClass(responseTime, isOnline);
        const healthText = getHealthText(responseTime, isOnline);
        const successRate = stats.totalApiCalls > 0 ? 
            ((stats.totalSuccessfulRequests / stats.totalApiCalls) * 100).toFixed(1) : '0';

        return `
            <div class="server-usage-card">
                <div class="server-usage-header">
                    <div class="server-port">${serverIdentifier}</div>
                    <div class="server-health">
                        <div class="health-indicator ${healthClass}"></div>
                        <span>${healthText}</span>
                    </div>
                </div>
                
                <div class="server-metrics">
                    <div class="metric-item">
                        <div class="metric-value">${stats.totalAllocations.toLocaleString()}</div>
                        <div class="metric-label">Allocations</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-value">${stats.totalApiCalls.toLocaleString()}</div>
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
                        <span style="font-size: 0.9rem; color: #6b7280;">Server Info</span>
                        <span style="font-size: 0.8rem; color: #6b7280;">Status: ${isOnline ? '🟢 Online' : '🔴 Offline'}</span>
                    </div>
                    <div style="background: #f3f4f6; padding: 8px; border-radius: 4px; font-size: 0.85rem;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            <span>Admin Keys: ${stats.adminKeysCount}</span>
                            <span>Donated Keys: ${stats.donatedKeysCount}</span>
                            <span>Total Keys: ${stats.totalApiKeys}</span>
                            <span>Active Keys: ${stats.activeApiKeys}</span>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 15px; font-size: 0.8rem; color: #6b7280; text-align: center;">
                    <strong>Server URL:</strong> ${server.url}
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
    if (!confirm('Are you sure you want to reset all server statistics across all servers? This action cannot be undone.')) {
        return;
    }
    
    try {
        const baseUrls = window.SERVER_CONFIG ? window.SERVER_CONFIG.getBaseUrls() : [];
        let successCount = 0;
        let totalServers = 0;
        
        // Reset stats on all available servers
        const resetProms = baseUrls.map(async (baseUrl) => {
            try {
                const response = await fetch(`${baseUrl}/api/admin/reset-server-stats`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${authToken}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });

                totalServers++;
                if (response.ok) {
                    successCount++;
                    return { success: true, url: baseUrl };
                } else {
                    console.warn(`Failed to reset stats on ${baseUrl}: ${response.status}`);
                    return { success: false, url: baseUrl, error: response.status };
                }
            } catch (error) {
                totalServers++;
                console.warn(`Failed to reset stats on ${baseUrl}:`, error.message);
                return { success: false, url: baseUrl, error: error.message };
            }
        });

        await Promise.all(resetProms);
        
        if (successCount > 0) {
            showAlert(`Server statistics reset successfully on ${successCount}/${totalServers} server(s)`, 'success');
            refreshServerUsage();
            loadServerAnalytics();
        } else {
            throw new Error('Failed to reset statistics on any server');
        }
    } catch (error) {
        console.error('Reset server stats error:', error);
        showAlert('Failed to reset server statistics', 'error');
    }
}

// ============================================================================
// INTEGRATED TESTING FUNCTIONS
// ============================================================================

async function testServerHealth() {
    const resultsDiv = document.getElementById('diagnosticsResults');
    resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">🔄 Testing server health...</div>';
    
    const baseUrls = window.SERVER_CONFIG ? window.SERVER_CONFIG.getBaseUrls() : [];
    
    try {
        const proms = baseUrls.map(async (baseUrl, index) => {
            const startTime = Date.now();
            try {
                const response = await fetch(`${baseUrl}/api/health`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                const responseTime = Date.now() - startTime;
                
                if (response.ok) {
                    const data = await response.json();
                    return {
                        index: index + 1,
                        url: baseUrl,
                        identifier: baseUrl.includes('localhost') ? 
                            `Port ${baseUrl.split(':')[2]}` : 
                            baseUrl.replace('https://', '').replace('http://', ''),
                        status: 'online',
                        responseTime,
                        data
                    };
                } else {
                    return {
                        index: index + 1,
                        url: baseUrl,
                        identifier: baseUrl.includes('localhost') ? 
                            `Port ${baseUrl.split(':')[2]}` : 
                            baseUrl.replace('https://', '').replace('http://', ''),
                        status: 'offline',
                        responseTime,
                        error: `HTTP ${response.status}`
                    };
                }
            } catch (error) {
                const responseTime = Date.now() - startTime;
                return {
                    index: index + 1,
                    url: baseUrl,
                    identifier: baseUrl.includes('localhost') ? 
                        `Port ${baseUrl.split(':')[2]}` : 
                        baseUrl.replace('https://', '').replace('http://', ''),
                    status: 'offline',
                    responseTime,
                    error: error.message
                };
            }
        });
        
        const results = await Promise.all(proms);
        const onlineCount = results.filter(r => r.status === 'online').length;
        
        let html = '<h4>❤️ Health Test Results</h4>';
        html += `<div style="margin: 10px 0; padding: 10px; background: ${onlineCount > 0 ? '#d4edda' : '#f8d7da'}; border-radius: 4px; color: ${onlineCount > 0 ? '#155724' : '#721c24'};">`;
        html += `<strong>Summary:</strong> ${onlineCount}/${results.length} servers healthy</div>`;
        
        results.forEach(result => {
            const statusClass = result.status === 'online' ? '#d4edda' : '#f8d7da';
            const statusColor = result.status === 'online' ? '#155724' : '#721c24';
            
            html += `
                <div style="margin: 10px 0; padding: 12px; background: ${statusClass}; border-radius: 4px; color: ${statusColor};">
                    <strong>${result.identifier}</strong> - ${result.status.toUpperCase()} (${result.responseTime}ms)
                    ${result.data ? `
                        <br><small>Database: ${result.data.database} | Uptime: ${Math.floor(result.data.uptime)}s | Keys: ${result.data.adminKeysCount || 0}</small>
                    ` : ''}
                    ${result.error ? `<br><small>Error: ${result.error}</small>` : ''}
                </div>
            `;
        });
        
        resultsDiv.innerHTML = html;
        showAlert(`Health test completed: ${onlineCount}/${results.length} servers healthy`, onlineCount > 0 ? 'success' : 'error');
    } catch (error) {
        resultsDiv.innerHTML = `<div style="color: #dc3545; padding: 15px;">❌ Health test failed: ${error.message}</div>`;
        showAlert('Health test failed', 'error');
    }
}

async function testAdminEndpoints() {
    const resultsDiv = document.getElementById('diagnosticsResults');
    resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">🔐 Testing admin endpoint security...</div>';
    
    const baseUrls = window.SERVER_CONFIG ? window.SERVER_CONFIG.getBaseUrls() : [];
    
    try {
        const proms = baseUrls.map(async (baseUrl, index) => {
            try {
                const response = await fetch(`${baseUrl}/api/admin/stats`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                return {
                    index: index + 1,
                    url: baseUrl,
                    identifier: baseUrl.includes('localhost') ? 
                        `Port ${baseUrl.split(':')[2]}` : 
                        baseUrl.replace('https://', '').replace('http://', ''),
                    status: response.status,
                    statusText: response.statusText,
                    requiresAuth: response.status === 401,
                    accessible: response.ok
                };
            } catch (error) {
                return {
                    index: index + 1,
                    url: baseUrl,
                    identifier: baseUrl.includes('localhost') ? 
                        `Port ${baseUrl.split(':')[2]}` : 
                        baseUrl.replace('https://', '').replace('http://', ''),
                    status: 'error',
                    error: error.message
                };
            }
        });
        
        const results = await Promise.all(proms);
        const securedCount = results.filter(r => r.requiresAuth).length;
        const accessibleCount = results.filter(r => r.accessible).length;
        
        let html = '<h4>🔐 Security Test Results</h4>';
        html += '<p style="color: #666; margin: 10px 0;">Testing admin endpoints without authentication (should return 401 Unauthorized):</p>';
        
        if (accessibleCount > 0) {
            html += `<div style="margin: 10px 0; padding: 10px; background: #f8d7da; border-radius: 4px; color: #721c24;">`;
            html += `<strong>⚠️ SECURITY ALERT:</strong> ${accessibleCount} admin endpoint(s) accessible without authentication!</div>`;
        }
        
        html += `<div style="margin: 10px 0; padding: 10px; background: ${securedCount === results.length ? '#d4edda' : '#f8d7da'}; border-radius: 4px; color: ${securedCount === results.length ? '#155724' : '#721c24'};">`;
        html += `<strong>Security Summary:</strong> ${securedCount}/${results.length} admin endpoints properly secured</div>`;
        
        results.forEach(result => {
            const isSecure = result.requiresAuth && !result.accessible;
            const statusClass = isSecure ? '#d4edda' : '#f8d7da';
            const statusColor = isSecure ? '#155724' : '#721c24';
            const statusText = isSecure ? 'PROPERLY SECURED' : 'SECURITY ISSUE';
            
            html += `
                <div style="margin: 10px 0; padding: 12px; background: ${statusClass}; border-radius: 4px; color: ${statusColor};">
                    <strong>${result.identifier}</strong> - ${statusText}
                    <br><small>Response: ${result.status} ${result.statusText || ''}</small>
                    ${isSecure ? 
                        '<br><small>✅ Endpoint properly requires authentication</small>' : 
                        '<br><small>⚠️ Admin endpoint may be unsecured</small>'
                    }
                    ${result.error ? `<br><small>Connection Error: ${result.error}</small>` : ''}
                </div>
            `;
        });
        
        resultsDiv.innerHTML = html;
        showAlert(`Security test completed: ${securedCount}/${results.length} endpoints secured`, securedCount === results.length ? 'success' : 'error');
    } catch (error) {
        resultsDiv.innerHTML = `<div style="color: #dc3545; padding: 15px;">❌ Security test failed: ${error.message}</div>`;
        showAlert('Security test failed', 'error');
    }
}

async function testAggregatedStats() {
    const resultsDiv = document.getElementById('diagnosticsResults');
    resultsDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">📊 Testing aggregated statistics...</div>';
    
    try {
        if (!authToken) {
            resultsDiv.innerHTML = `
                <div style="color: #856404; background: #fff3cd; padding: 15px; border-radius: 4px;">
                    <strong>⚠️ Authentication Required</strong><br>
                    Please log in to test admin statistics functionality.
                </div>
            `;
            showAlert('Authentication required for stats test', 'warning');
            return;
        }
        
        const aggregatedStats = await getAggregatedServerStats();
        
        let html = '<h4>📊 Aggregated Statistics Test</h4>';
        html += `<div style="margin: 10px 0; padding: 10px; background: #d4edda; border-radius: 4px; color: #155724;">`;
        html += `<strong>✅ Success:</strong> Aggregated data from ${aggregatedStats.onlineServers} server(s)</div>`;
        
        // Statistics overview
        html += `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 15px 0;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #007bff;">${aggregatedStats.totalApiKeys}</div>
                    <div style="font-size: 14px; color: #666;">Total API Keys</div>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #28a745;">${aggregatedStats.activeApiKeys}</div>
                    <div style="font-size: 14px; color: #666;">Active Keys</div>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #17a2b8;">${aggregatedStats.donatedApiKeys}</div>
                    <div style="font-size: 14px; color: #666;">Donated Keys</div>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #ffc107;">${aggregatedStats.onlineServers}/${aggregatedStats.servers.length}</div>
                    <div style="font-size: 14px; color: #666;">Online Servers</div>
                </div>
            </div>
        `;
        
        // Individual server contributions
        html += '<h5>📈 Server Contributions:</h5>';
        aggregatedStats.servers.forEach(server => {
            if (server.stats) {
                html += `
                    <div style="margin: 8px 0; padding: 10px; background: #e3f2fd; border-radius: 4px;">
                        <strong>${server.identifier}</strong>: 
                        ${server.stats.totalApiKeys || 0} keys, 
                        ${(server.stats.totalApiCalls || 0).toLocaleString()} calls
                    </div>
                `;
            }
        });
        
        resultsDiv.innerHTML = html;
        showAlert('Statistics aggregation test completed successfully', 'success');
    } catch (error) {
        let html = '<h4>📊 Aggregated Statistics Test</h4>';
        html += `<div style="color: #dc3545; background: #f8d7da; padding: 15px; border-radius: 4px;">`;
        html += `<strong>❌ Failed:</strong> ${error.message}</div>`;
        
        if (error.message.includes('Authentication required')) {
            html += `<div style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 4px; color: #856404;">`;
            html += `<strong>💡 Tip:</strong> Make sure you're logged in as an admin to access statistics.</div>`;
        }
        
        resultsDiv.innerHTML = html;
        showAlert('Statistics test failed', 'error');
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function() {
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
