document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const saveButton = document.getElementById('save');
    const statusDiv = document.getElementById('status');

    // Load saved API key
    chrome.storage.sync.get(['geminiApiKey'], (result) => {
        if (result.geminiApiKey) {
            apiKeyInput.value = result.geminiApiKey;
        }
    });

    saveButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
                statusDiv.textContent = 'API Key saved!';
                setTimeout(() => { statusDiv.textContent = ''; }, 2000);
            });
        } else {
            statusDiv.textContent = 'Please enter an API Key.';
            statusDiv.style.color = 'red';
            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.style.color = 'green';
            }, 2000);
        }
    });
});