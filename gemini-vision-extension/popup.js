document.addEventListener('DOMContentLoaded', () => {
    const captureButton = document.getElementById('captureAndAnalyze');
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');
    const apiKeyPromptDiv = document.getElementById('api-key-prompt');
    const mainContentDiv = document.getElementById('main-content');
    const openOptionsLink = document.getElementById('openOptions');

    let apiKey = null;
    const GEMINI_MODEL_NAME = "gemini-2.5-flash-preview-04-17"; // Or "gemini-1.0-pro-vision-001"
                                                       // Or "gemini-2.5-pro-exp-03-25" if you have access

    // Check for API Key first
    chrome.storage.sync.get(['geminiApiKey'], (result) => {
        if (result.geminiApiKey) {
            apiKey = result.geminiApiKey;
            mainContentDiv.style.display = 'block';
            apiKeyPromptDiv.style.display = 'none';
        } else {
            mainContentDiv.style.display = 'none';
            apiKeyPromptDiv.style.display = 'block';
        }
    });

    if (openOptionsLink) {
        openOptionsLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Send message to background to open options page
            chrome.runtime.sendMessage({ action: "openOptionsPage" });
            window.close(); // Close the popup
        });
    }


    if (captureButton) {
        captureButton.addEventListener('click', async () => {
            if (!apiKey) {
                resultDiv.textContent = 'API Key not set. Please set it in the options.';
                resultDiv.className = 'error';
                // Optionally, direct them to options again
                mainContentDiv.style.display = 'none';
                apiKeyPromptDiv.style.display = 'block';
                return;
            }

            loadingDiv.style.display = 'block';
            resultDiv.textContent = '';
            resultDiv.className = '';
            captureButton.disabled = true;

            try {
                // Send message to background script to capture the tab
                const response = await chrome.runtime.sendMessage({ action: "captureVisibleTab" });

                if (response.error) {
                    throw new Error(`Capture error: ${response.error}`);
                }
                if (!response.imageDataUrl) {
                    throw new Error("Failed to get image data URL.");
                }

                const base64ImageData = response.imageDataUrl.split(',')[1]; // Remove "data:image/png;base64,"

                const analysis = await callGeminiApi(base64ImageData, apiKey);
                resultDiv.textContent = analysis;

            } catch (error) {
                console.error('Error:', error);
                resultDiv.textContent = `Error: ${error.message}`;
                resultDiv.className = 'error';
            } finally {
                loadingDiv.style.display = 'none';
                captureButton.disabled = false;
            }
        });
    }

    async function callGeminiApi(base64ImageData, key) {
        const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${key}`;

        const requestBody = {
            "contents": [{
                "parts": [
                    { "text": "Answer the question by selecting the correct option(s) only (e.g., A, B, C, or D). If multiple options are correct, list all of them. Do not include explanations" },
                    {
                        "inlineData": {
                            "mimeType": "image/png",
                            "data": base64ImageData
                        }
                    }
                ]
            }],
            "generationConfig": { // Optional: configure output
                "temperature": 0.4,
                "topK": 32,
                "topP": 1,
                "maxOutputTokens": 4096 // Adjust as needed
            }
        };

        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("API Error:", errorBody);
            throw new Error(`API request failed: ${response.status} ${response.statusText}. ${errorBody.error?.message || ''}`);
        }

        const data = await response.json();

        if (data.candidates && data.candidates.length > 0 &&
            data.candidates[0].content && data.candidates[0].content.parts &&
            data.candidates[0].content.parts.length > 0) {
            return data.candidates[0].content.parts[0].text;
        } else if (data.promptFeedback && data.promptFeedback.blockReason) {
             // Handle cases where the content is blocked
            return `Content generation blocked. Reason: ${data.promptFeedback.blockReason}${data.promptFeedback.blockReasonMessage ? ' - ' + data.promptFeedback.blockReasonMessage : ''}`;
        } else {
            console.warn("Unexpected API response structure:", data);
            return "Could not extract text from Gemini's response.";
        }
    }
});