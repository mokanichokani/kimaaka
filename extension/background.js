// background.js

// Import server configuration
importScripts('config.js');

const GEMINI_MODEL_NAME = "gemini-2.5-flash";

// Track failed servers temporarily (reset every 5 minutes)
let failedServers = new Set();
let lastFailedServerReset = Date.now();
const FAILED_SERVER_RESET_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Function to reset failed servers periodically
function resetFailedServersIfNeeded() {
    const now = Date.now();
    if (now - lastFailedServerReset > FAILED_SERVER_RESET_INTERVAL) {
        console.log('Resetting failed servers list - trying all servers again');
        failedServers.clear();
        lastFailedServerReset = now;
    }
}

// Function to get available servers (excluding recently failed ones)
function getAvailableServers() {
    resetFailedServersIfNeeded();
    return SERVER_URLS.filter(url => !failedServers.has(url));
}

// Function to mark a server as failed
function markServerAsFailed(serverUrl) {
    failedServers.add(serverUrl);
    console.log(`Marked server as failed: ${serverUrl}. Failed servers: ${Array.from(failedServers).length}/${SERVER_URLS.length}`);
}

// Enhanced function to try servers with failover
async function tryServersWithFailover(operation, maxRetries = SERVER_URLS.length) {
    let attempt = 0;
    let lastError = null;
    
    while (attempt < maxRetries) {
        const availableServers = getAvailableServers();
        
        if (availableServers.length === 0) {
            console.log('All servers failed, resetting failed servers list and trying again');
            failedServers.clear();
            lastFailedServerReset = Date.now();
            // Try one more time with all servers
            if (attempt < maxRetries - 1) {
                attempt++;
                continue;
            } else {
                throw new Error(`All servers failed after ${attempt + 1} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
            }
        }
        
        // Get a random server from available ones
        const randomIndex = Math.floor(Math.random() * availableServers.length);
        const serverUrl = availableServers[randomIndex];
        
        console.log(`Attempt ${attempt + 1}/${maxRetries}: Trying server ${serverUrl}`);
        
        try {
            const result = await operation(serverUrl);
            console.log(`✅ Success with server: ${serverUrl}`);
            
            // Store successful server information
            const serverIndex = SERVER_URLS.indexOf(serverUrl);
            const serverPort = serverUrl.match(/:(\d+)/)?.[1] || 'Unknown';
            await chrome.storage.local.set({
                lastUsedServer: serverUrl,
                lastUsedServerIndex: serverIndex,
                lastUsedServerPort: serverPort,
                lastServerUseTime: Date.now()
            });
            
            return result;
        } catch (error) {
            lastError = error;
            console.log(`❌ Server ${serverUrl} failed: ${error.message}`);
            markServerAsFailed(serverUrl);
            attempt++;
            
            // If this was the last available server, wait a bit before retrying
            if (availableServers.length === 1 && attempt < maxRetries) {
                console.log('Waiting 2 seconds before trying again...');
                await new Prom(resolve => setTimeout(resolve, 2000));
            }
        }
    }
    
    throw new Error(`All servers failed after ${attempt} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
}

// Function to get a random server URL for load distribution (legacy - keeping for compatibility)
function getRandomServerUrl() {
    try {
        const availableServers = getAvailableServers();
        if (availableServers.length === 0) {
            console.warn('No available servers, using first server as fallback');
            return SERVER_URLS[0];
        }
        
        const randomIndex = Math.floor(Math.random() * availableServers.length);
        const serverUrl = availableServers[randomIndex];
        
        console.log(`Randomly selected server ${randomIndex + 1}/${availableServers.length}: ${serverUrl}`);
        return serverUrl;
    } catch (error) {
        console.error('Error getting random server URL:', error);
        return SERVER_URLS[0];
    }
}

async function getApiKeyFromServer() {
    // ... (This function remains unchanged)
}

async function callGeminiApi(base64ImageData, apiKey, promptText) {
    // ... (This function remains unchanged)
}

// Helper functions for demonstration, expand them with your actual code
async function getApiKeyFromServer() {
    console.log('🔄 Starting API key fetch with server failover...');
    
    const fetchOperation = async (serverUrl) => {
        console.log(`Fetching API key from: ${serverUrl}/gemini-key`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        try {
            const response = await fetch(`${serverUrl}/gemini-key`, {
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.geminiApiKey) {
                throw new Error('No API key received from server');
            }
            
            console.log(`✅ Successfully got API key from: ${serverUrl}`);
            return data.geminiApiKey;
            
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout (10s)');
            }
            throw error;
        }
    };
    
    try {
        return await tryServersWithFailover(fetchOperation);
    } catch (error) {
        console.error('❌ All servers failed to provide API key:', error.message);
        throw new Error(`Unable to get API key: ${error.message}`);
    }
}

async function getCachedApiKey() {
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000; // 2 hours in millconds

    try {
        // Get cached data from chrome storage
        const result = await chrome.storage.local.get([
            'cachedApiKey', 
            'keyTimestamp', 
            'lastUsedServer', 
            'lastUsedServerIndex', 
            'lastUsedServerPort'
        ]);
        const now = Date.now();
        
        // Check if we have a cached key and it's still valid (less than 2 hours old)
        if (result.cachedApiKey && result.keyTimestamp && (now - result.keyTimestamp < TWO_HOURS_MS)) {
            console.log('Using cached API key');
            return { key: result.cachedApiKey, isFromCache: true };
        }
        
        // Cache is empty or expired, fetch new key
        console.log('Fetching new API key from server');
        const newApiKey = await getApiKeyFromServer();
        
        // Store the new key with timestamp
        await chrome.storage.local.set({
            cachedApiKey: newApiKey,
            keyTimestamp: now
        });
        
        return { key: newApiKey, isFromCache: false };
        
    } catch (error) {
        console.error('Error getting API key:', error);
        throw error;
    }
}
async function callGeminiApi(base64ImageData, apiKey, promptText) {
    const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${apiKey}`;
    const requestBody = {
        "contents": [{
            "parts": [
                { "text": promptText },
                {
                    "inlineData": {
                        "mimeType": "image/png",
                        "data": base64ImageData
                    }
                }
            ]
        }],
        "generationConfig": {
            "temperature": 0.4,
            "topK": 32,
            "topP": 1,
            "maxOutputTokens": 4096
        }
    };

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`API request failed: ${errorBody.error?.message || response.statusText}`);
        }

        const data = await response.json();
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text;
        }
        throw new Error("Analysis failed due to an unexpected API response.");
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw error;
    }
}


async function handleTriggerAnalysis(tab) {
    // --- Step 1: URL VALIDATION (for protected pages) ---
    // Prevent the extension from trying to run on pages where it will fail,
    // like the Chrome Web Store, chrome:// pages, or blank new tabs.
    if (!tab || !tab.id || !tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("https://chrome.google.com")) {
        console.log("kimaaka cannot run on this protected page. Aborting.");
        return; 
    }
    const currentTabId = tab.id;

    // --- Step 2: SCRIPT INJECTION ---
    // Inject the scripts on demand into the current tab.
    try {
        await chrome.scripting.insertCSS({
            target: { tabId: currentTabId },
            files: ['content.css']
        });
        await chrome.scripting.executeScript({
            target: { tabId: currentTabId },
            files: ['content.js']
        });
    } catch (err) {
        console.error(`Failed to inject script on page: ${err}`);
        return; // Stop if injection fails
    }

    // --- Step 3: CORE LOGIC ---
    const sendLoadingMessage = (targetTabId, loadingText = '. .') => chrome.tabs.sendMessage(targetTabId, { action: "show_gemini_loading", loadingText }).catch(e => {});
    const sendResultMessage = (targetTabId, payload) => chrome.tabs.sendMessage(targetTabId, { action: "show_gemini_result", ...payload }).catch(e => {});

    try {
        // Get API key (cached or fresh) with server failover
        console.log('🔄 Starting analysis with enhanced server failover...');
        sendLoadingMessage(currentTabId, '....');
        
        const apiKeyResult = await getCachedApiKey();
        
        // Show appropriate loading message based on whether we're fetching a new key
        const loadingText = apiKeyResult.isFromCache ? '...' : '...';
        sendLoadingMessage(currentTabId, loadingText);
        
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
        if (chrome.runtime.lastError) throw new Error(chrome.runtime.lastError.message);
        
        sendLoadingMessage(currentTabId, '. .');
        
        const base64ImageData = dataUrl.split(',')[1];
        const prompt = "Answer the question by selecting the correct option(s) only . Do not include any explanations—just the option letter(s) or number(s), e.g., A, B, C, D , E  or 1, 2, 3, 4 , 5  ";
        
        const analysisResult = await callGeminiApi(base64ImageData, apiKeyResult.key, prompt);
        sendResultMessage(currentTabId, { result: analysisResult });
        
        console.log('✅ Analysis completed successfully');
        
    } catch (error) {
        console.error('❌ Error during analysis:', error);
        
        let userFriendlyMessage = error.message;
        
        // Log specific error types for debugging
        if (error.message.includes('Unable to get API key')) {
            const portRange = `${SERVER_CONFIG.PORTS[0]}-${SERVER_CONFIG.PORTS[SERVER_CONFIG.PORTS.length - 1]}`;
            console.error(`🔧 All servers are currently unavailable. Please check if the server is running on localhost:${portRange}.`);
        } else if (error.message.includes('API request failed')) {
            console.error('🔑 API key issue. The server may need to refresh its API keys.');
        } else if (error.message.includes('timeout')) {
            console.error('⏱️ Server response timeout. The server may be overloaded.');
        } else if (error.message.includes('unexpected response format')) {
            console.error('⚫ AI service returned an unexpected response format.');
        } else if (error.message.includes('Analysis failed') || error.message.includes('unexpected API response')) {
            console.error('🔴 Analysis failed - showing empty response box:', error.message);
        }
        
        // Always show empty black box for any error - no error messages to user
        console.error('🔴 Showing empty response box due to error:', error.message);
        sendResultMessage(currentTabId, { result: '' });
    }
}

// Listen for the keyboard shortcut
chrome.commands.onCommand.addListener((command, tab) => {
    if (command === "trigger_analysis") {
        handleTriggerAnalysis(tab);
    }
});

// Listen for the message from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "triggerAnalysisFromPopup") {
        handleTriggerAnalysis(sender.tab);
        sendResponse({ status: "processing_triggered" });
        return true; 
    } else if (request.action === "getServerUrl") {
        // Provide a working server URL for donations with failover
        (async () => {
            try {
                console.log('🔄 Finding working server for donation...');
                
                const testOperation = async (serverUrl) => {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for health check
                    
                    try {
                        const response = await fetch(`${serverUrl.replace('/api', '')}/api/health`, {
                            signal: controller.signal
                        });
                        
                        clearTimeout(timeoutId);
                        
                        if (!response.ok) {
                            throw new Error(`Health check failed: ${response.status}`);
                        }
                        
                        const health = await response.json();
                        if (health.status !== 'healthy') {
                            throw new Error(`Server not healthy: ${health.status}`);
                        }
                        
                        console.log(`✅ Server ${serverUrl} is healthy and ready for donations`);
                        return serverUrl;
                        
                    } catch (error) {
                        clearTimeout(timeoutId);
                        if (error.name === 'AbortError') {
                            throw new Error('Health check timeout');
                        }
                        throw error;
                    }
                };
                
                const workingServerUrl = await tryServersWithFailover(testOperation);
                sendResponse({ 
                    serverUrl: workingServerUrl,
                    message: 'Found working server for donation'
                });
                
            } catch (error) {
                console.error('❌ All servers failed health check:', error.message);
                // Fallback to first server even if health check failed
                sendResponse({ 
                    serverUrl: SERVER_URLS[0],
                    message: 'Using fallback server (health check failed)',
                    warning: error.message
                });
            }
        })();
        
        return true; // Keep the message channel open for async response
    }
});