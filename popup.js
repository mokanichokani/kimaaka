// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');
    const mainContentDiv = document.getElementById('main-content');
    const triggerAnalysisButton = document.getElementById('triggerAnalysisButton');
    const shortcutDisplay = document.getElementById('shortcutDisplay');

    function updatePopupUI(isLoading, text, isError = false) {
        loadingDiv.classList.toggle('hidden', !isLoading);
        resultDiv.classList.toggle('hidden', isLoading);
        if (text) {
            resultDiv.textContent = text;
        }
        resultDiv.style.color = isError ? 'red' : 'inherit';
    }

    // Show main content immediately since no login is required
    mainContentDiv.classList.remove('hidden');
    updatePopupUI(false, 'Ready to analyze! Click button or use shortcut.');

    if (triggerAnalysisButton) {
        triggerAnalysisButton.addEventListener('click', () => {
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

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "analysis_started_for_popup") {
            updatePopupUI(true, '');
        } else if (request.action === "analysis_complete_for_popup") {
            if (request.error) {
                updatePopupUI(false, `Error: ${request.error}`, true);
            } else {
                updatePopupUI(false, request.result || "No result text.");
            }
        }
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