// background.js

const GEMINI_MODEL_NAME = "gemini-2.5-flash";
const API_BASE_URL = 'https://server-t1gp.onrender.com/api';

async function getApiKeyFromServer() {
    // ... (This function remains unchanged)
}

async function callGeminiApi(base64ImageData, apiKey, promptText) {
    // ... (This function remains unchanged)
}

// Helper functions for demonstration, expand them with your actual code
async function getApiKeyFromServer() {
    try {
        const response = await fetch(`${API_BASE_URL}/gemini-key`);
        if (!response.ok) throw new Error('Failed to fetch API key from server.');
        const data = await response.json();
        return data.geminiApiKey;
    } catch (error) {
        console.error('Error getting API key from server:', error);
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
        console.log("isekimaaka cannot run on this protected page. Aborting.");
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
    const sendLoadingMessage = (targetTabId) => chrome.tabs.sendMessage(targetTabId, { action: "show_gemini_loading" }).catch(e => {});
    const sendResultMessage = (targetTabId, payload) => chrome.tabs.sendMessage(targetTabId, { action: "show_gemini_result", ...payload }).catch(e => {});

    try {
        const apiKey = await getApiKeyFromServer();
        sendLoadingMessage(currentTabId);
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
        if (chrome.runtime.lastError) throw new Error(chrome.runtime.lastError.message);
        
        const base64ImageData = dataUrl.split(',')[1];
        const prompt = "Answer the question by selecting the correct option(s) only . Do not include any explanations—just the option letter(s) or number(s), e.g., A, B, C, D or 1, 2, 3, 4 ";
        
        const analysisResult = await callGeminiApi(base64ImageData, apiKey, prompt);
        sendResultMessage(currentTabId, { result: analysisResult });
    } catch (error) {
        console.error('Error during analysis:', error);
        sendResultMessage(currentTabId, { error: error.message });
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
    }
});