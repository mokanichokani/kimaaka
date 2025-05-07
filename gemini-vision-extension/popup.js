// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');
    const apiKeyPromptDiv = document.getElementById('api-key-prompt');
    const mainContentDiv = document.getElementById('main-content');
    const openOptionsLink = document.getElementById('openOptions');
    const triggerAnalysisButton = document.getElementById('triggerAnalysisButton');
    const shortcutDisplay = document.getElementById('shortcutDisplay');

    let apiKeyPresent = false;

    function updatePopupUI(isLoading, text, isError = false) {
        loadingDiv.classList.toggle('hidden', !isLoading);
        resultDiv.classList.toggle('hidden', isLoading);
        if (text) {
            resultDiv.textContent = text;
        }
        resultDiv.style.color = isError ? 'red' : 'inherit';
    }

    chrome.storage.sync.get(['geminiApiKey'], (storageResult) => {
        apiKeyPresent = !!storageResult.geminiApiKey;
        mainContentDiv.classList.toggle('hidden', !apiKeyPresent);
        apiKeyPromptDiv.classList.toggle('hidden', apiKeyPresent);
        if (apiKeyPresent) {
            updatePopupUI(false, 'Ready. Click button or use shortcut.');
        }
    });

    if (triggerAnalysisButton) {
        triggerAnalysisButton.addEventListener('click', () => {
            if (!apiKeyPresent) {
                updatePopupUI(false, 'API Key not set. Please set it in options.', true);
                return;
            }
            updatePopupUI(true, '');
            chrome.runtime.sendMessage({ action: "triggerAnalysisFromPopup" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error sending trigger message:", chrome.runtime.lastError.message);
                    updatePopupUI(false, "Error starting analysis: " + chrome.runtime.lastError.message, true);
                } else {
                    // Background will send 'analysis_started_for_popup' or 'analysis_complete_for_popup'
                    console.log("Analysis trigger sent to background.");
                }
            });
        });
    }

    if (openOptionsLink) {
        openOptionsLink.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.runtime.sendMessage({ action: "openOptionsPage" });
            window.close();
        });
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "analysis_started_for_popup") {
            if (apiKeyPresent) updatePopupUI(true, '');
        } else if (request.action === "analysis_complete_for_popup") {
            if (apiKeyPresent) {
                if (request.error) {
                    updatePopupUI(false, `Error: ${request.error}`, true);
                } else {
                    updatePopupUI(false, request.result || "No result text.");
                }
            }
        }
        // Important: Acknowledge message if you're not sending an async response later
        // For simple UI updates, synchronous acknowledgement is fine.
        // sendResponse({status: "received"});
    });

    if (shortcutDisplay) {
        chrome.commands.getAll((commands) => {
            const command = commands.find(cmd => cmd.name === "trigger_analysis");
            if (command && command.shortcut) {
                shortcutDisplay.textContent = command.shortcut;
            } else {
                shortcutDisplay.textContent = "Not set (configure in chrome://extensions/shortcuts)";
            }
        });
    }
});