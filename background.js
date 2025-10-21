// background.js

// Import server configuration
importScripts('config.js');

const GEMINI_MODEL_NAME = "gemini-2.5-flash";

async function getApiKeyFromServer() {
    // ... (This function remains unchanged)
}

async function callGeminiApi(base64ImageData, apiKey, promptText) {
    // ... (This function remains unchanged)
}

// Helper functions for demonstration, expand them with your actual code
async function getApiKeyFromServer() {
    console.log('🔄 Fetching API key from server...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
        const response = await fetch(`${SERVER_API_URL}/gemini-key`, {
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
        
        console.log(`✅ Successfully got API key from: ${SERVER_URL}`);
        return data.geminiApiKey;
        
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout (10s)');
        }
        throw error;
    }
}

async function getCachedApiKey() {
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

    try {
        // Get cached data from chrome storage
        const result = await chrome.storage.local.get([
            'cachedApiKey', 
            'keyTimestamp'
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
            console.error(`🔧 Server is currently unavailable. Please check if the server is running at ${SERVER_URL}.`);
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
        // Provide the server URL for donations
        sendResponse({ 
            serverUrl: SERVER_API_URL,
            message: 'Using Vercel server for donation'
        });
        return true;
    }
});