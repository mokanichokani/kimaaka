// This background script is mainly here to facilitate communication
// if needed in more complex scenarios or for future features.
// For this specific task, most logic can be in popup.js
// because activeTab permission grants access upon user action.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "captureVisibleTab") {
        chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                sendResponse({ error: chrome.runtime.lastError.message });
                return;
            }
            if (dataUrl) {
                sendResponse({ imageDataUrl: dataUrl });
            } else {
                sendResponse({ error: "Failed to capture tab." });
            }
        });
        return true; // Indicates that the response will be sent asynchronously
    }
});

// Open options page message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openOptionsPage") {
        chrome.runtime.openOptionsPage();
    }
});