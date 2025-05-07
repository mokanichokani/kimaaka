// background.js

const GEMINI_MODEL_NAME = "gemini-2.5-pro-exp-03-25"; // Or your preferred model like "gemini-pro-vision"
// const GEMINI_MODEL_NAME = "gemini-2.5-flash-preview-04-17"; // Original model from your code

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
            return `Content generation blocked. Reason: ${data.promptFeedback.blockReason}${data.promptFeedback.blockReasonMessage ? ' - ' + data.promptFeedback.blockReasonMessage : ''}`;
        }
        console.log("Unexpected API response structure:", data);
        throw new Error("Bluetooth is off");
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw error;
    }
}

async function handleTriggerAnalysis(tab) {
    const sendLoadingMessage = (targetTabId) => {
        if (targetTabId) {
            chrome.tabs.sendMessage(targetTabId, { action: "show_gemini_loading" }).catch(e => console.debug("Failed to send loading to content script:", e));
        }
        chrome.runtime.sendMessage({ action: "analysis_started_for_popup" }).catch(e => console.debug("Failed to send loading to popup:", e));
    };

    const sendResultMessage = (targetTabId, resultPayload) => {
        if (targetTabId) {
            chrome.tabs.sendMessage(targetTabId, { action: "show_gemini_result", ...resultPayload }).catch(e => console.debug("Failed to send result to content script:", e));
        }
        chrome.runtime.sendMessage({ action: "analysis_complete_for_popup", ...resultPayload }).catch(e => console.debug("Failed to send result to popup:", e));
    };
    
    let currentTabId = tab?.id;
    if (!currentTabId) {
        try {
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            currentTabId = activeTab?.id;
        } catch(e) {
            console.error("Could not get active tab ID:", e);
            sendResultMessage(null, { error: "Could not identify active tab." });
            return;
        }
    }


    try {
        const { geminiApiKey: apiKey } = await chrome.storage.sync.get(['geminiApiKey']);
        if (!apiKey) {
            console.warn("Gemini API Key not set.");
            sendResultMessage(currentTabId, { error: "API Key not set. Please set it in the extension options." });
            return;
        }

        sendLoadingMessage(currentTabId);

        const dataUrl = await chrome.tabs.captureVisibleTab(tab ? tab.windowId : null, { format: "png" });
        if (chrome.runtime.lastError) throw new Error(`Capture error: ${chrome.runtime.lastError.message}`);
        if (!dataUrl) throw new Error("Failed to capture tab.");

        const base64ImageData = dataUrl.split(',')[1];
        const prompt = "Answer the question by selecting the correct option(s) only . Do not include any explanations—just the option letter(s) or number(s), e.g., A, B, C, D or 1, 2, 3, 4 ";
        
        const analysisResult = await callGeminiApi(base64ImageData, apiKey, prompt);
        sendResultMessage(currentTabId, { result: analysisResult });

    } catch (error) {
        console.error('Error during analysis:', error);
        sendResultMessage(currentTabId, { error: error.message });
    }
}

chrome.commands.onCommand.addListener((command, tab) => {
    if (command === "trigger_analysis") {
        console.log("Trigger analysis command received for tab:", tab.id);
        handleTriggerAnalysis(tab);
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "triggerAnalysisFromPopup") {
        handleTriggerAnalysis(sender.tab); // sender.tab will be undefined if from popup, handleTriggerAnalysis will query active tab
        sendResponse({ status: "processing_triggered" }); // Acknowledge
        return true; // Keep message channel open if needed for further async, though not strictly here.
    } else if (request.action === "openOptionsPage") {
        chrome.runtime.openOptionsPage();
    }
    // Return true for async sendResponse if any path needs it.
    // Here, simple acknowledgements or direct actions don't strictly need it.
});

console.log("Gemini Vision background script loaded.");