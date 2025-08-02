// background.js

const GEMINI_MODEL_NAME = "gemini-2.5-flash";
const API_BASE_URL = 'https://server-t1gp.onrender.com/api';

/**
 * Fetches the Gemini API key from the backend server.
 * No user authentication is required for this action.
 */
async function getApiKeyFromServer() {
    try {
        const response = await fetch(`${API_BASE_URL}/gemini-key`);
        if (!response.ok) {
            throw new Error('Failed to fetch API key from server.');
        }
        const data = await response.json();
        return data.geminiApiKey;
    } catch (error) {
        console.error('Error getting API key from server:', error);
        throw error;
    }
}

/**
 * Calls the Google Gemini Vision API with the provided image data and prompt.
 * @param {string} base64ImageData - The base64 encoded image of the screen.
 * @param {string} apiKey - The Gemini API key.
 * @param {string} promptText - The prompt to send to the AI.
 * @returns {Promise<string>} The text response from the AI.
 */
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
            console.error("API Error:", errorBody);
            throw new Error(`API request failed: ${response.status} ${response.statusText}. ${errorBody.error?.message || ''}`);
        }

        const data = await response.json();
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text;
        } else if (data.promptFeedback?.blockReason) {
            return `Content generation blocked. Reason: ${data.promptFeedback.blockReason}`;
        }
        throw new Error("Analysis failed due to an unexpected API response.");
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw error;
    }
}

/**
 * Main handler function to orchestrate the screen analysis process.
 * This function is triggered by a user command or popup click.
 * @param {chrome.tabs.Tab} tab - The tab where the action was initiated.
 */
async function handleTriggerAnalysis(tab) {
    // --- Step 1: BASIC VALIDATION ---
    // Check if we have a valid tab
    if (!tab || !tab.url) {
        console.log("ISEkimaaka triggered on an invalid tab. Aborting.");
        return; // Stop execution immediately
    }
    const currentTabId = tab.id;

    // --- Step 2: SCRIPT INJECTION ---
    // Inject the scripts on demand for any website.
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
    // Only proceed if validation and injection are successful.
    const sendLoadingMessage = (targetTabId) => chrome.tabs.sendMessage(targetTabId, { action: "show_gemini_loading" }).catch(e => console.debug("Content script not ready yet for loading message.", e));
    const sendResultMessage = (targetTabId, payload) => chrome.tabs.sendMessage(targetTabId, { action: "show_gemini_result", ...payload }).catch(e => console.debug("Content script not ready for result message.", e));

    try {
        const apiKey = await getApiKeyFromServer();
        sendLoadingMessage(currentTabId);
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
        if (chrome.runtime.lastError) {
            throw new Error(chrome.runtime.lastError.message);
        }
        
        const base64ImageData = dataUrl.split(',')[1];
        const prompt = "Analyze this screen content and provide a helpful response. If you see a question with multiple choice options, provide the correct answer(s) as option letters/numbers (e.g., A, B, C, D or 1, 2, 3, 4). For other content, provide a brief, relevant analysis or summary.";
        
        const analysisResult = await callGeminiApi(base64ImageData, apiKey, prompt);
        sendResultMessage(currentTabId, { result: analysisResult });
    } catch (error) {
        console.error('Error during analysis:', error);
        sendResultMessage(currentTabId, { error: error.message });
    }
}

// Listen for the keyboard shortcut command.
chrome.commands.onCommand.addListener((command, tab) => {
    if (command === "trigger_analysis") {
        handleTriggerAnalysis(tab);
    }
});

// Listen for the message from the popup UI.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "triggerAnalysisFromPopup") {
        // sender.tab contains the tab object where the popup was opened.
        handleTriggerAnalysis(sender.tab);
        sendResponse({ status: "processing_triggered" });
        return true; // Indicates an async response, although we don't use it here.
    }
});

console.log("ISEkimaaka background script loaded.");