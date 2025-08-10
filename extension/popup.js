// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');
    const mainContentDiv = document.getElementById('main-content');
    const triggerAnalysisButton = document.getElementById('triggerAnalysisButton');
    const shortcutDisplay = document.getElementById('shortcutDisplay');
    const apiKeyDisplay = document.getElementById('apiKeyDisplay');
    const cacheStatusDisplay = document.getElementById('cacheStatusDisplay');
    const timeRemainingDisplay = document.getElementById('timeRemainingDisplay');
    const currentServerDisplay = document.getElementById('currentServerDisplay');
    
    // Donation elements
    const donateApiKeyInput = document.getElementById('donateApiKey');
    const donateEmailInput = document.getElementById('donateEmail');
    const donateButton = document.getElementById('donateButton');
    const donateStatus = document.getElementById('donateStatus');

    function updatePopupUI(isLoading, text, isError = false) {
        loadingDiv.classList.toggle('hidden', !isLoading);
        resultDiv.classList.toggle('hidden', isLoading);
        if (text) {
            resultDiv.textContent = text;
        }
        resultDiv.style.color = isError ? 'red' : 'inherit';
    }

    function showDonationStatus(message, type = 'loading') {
        donateStatus.classList.remove('hidden', 'success', 'error', 'loading');
        donateStatus.classList.add(type);
        donateStatus.textContent = message;
    }

    function hideDonationStatus() {
        donateStatus.classList.add('hidden');
    }

    async function donateApiKey() {
        const apiKey = donateApiKeyInput.value.trim();
        const email = donateEmailInput.value.trim();

        if (!apiKey) {
            showDonationStatus('Please enter an API key', 'error');
            return;
        }

        // Basic validation for Gemini API key format
        if (!apiKey.startsWith('AIza') || apiKey.length < 35) {
            showDonationStatus('Invalid API key format', 'error');
            return;
        }

        donateButton.disabled = true;
        showDonationStatus('Finding working server...', 'loading');

        try {
            // Get server URL from background script with failover
            const response = await chrome.runtime.sendMessage({ action: "getServerUrl" });
            
            if (response.warning) {
                console.warn('Server selection warning:', response.warning);
            }
            
            const serverUrl = response.serverUrl || 'https://server-t1gp.onrender.com/api';
            
            console.log(`Donating to server: ${serverUrl}`);
            
            if (response.message) {
                console.log('Server selection:', response.message);
            }

            showDonationStatus('Validating API key...', 'loading');

            const donationResponse = await fetch(`${serverUrl}/donate-key`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    apiKey: apiKey,
                    donorEmail: email || 'anonymous'
                })
            });

            const data = await donationResponse.json();

            if (donationResponse.ok) {
                showDonationStatus('✅ Thank you! API key validated and added successfully!', 'success');
                donateApiKeyInput.value = '';
                donateEmailInput.value = '';
                
                // Hide success message after 5 seconds
                setTimeout(() => {
                    hideDonationStatus();
                }, 5000);
            } else {
                showDonationStatus(data.error || 'Failed to donate API key', 'error');
            }
        } catch (error) {
            console.error('Donation error:', error);
            showDonationStatus('Network error. Please check if the server is running.', 'error');
        } finally {
            donateButton.disabled = false;
        }
    }

    async function updateTestingInfo() {
        try {
            const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
            const result = await chrome.storage.local.get(['cachedApiKey', 'keyTimestamp', 'serverIndex']);
            const now = Date.now();
            
            // Show current server
            const serverIndex = result.serverIndex || 0;
            currentServerDisplay.textContent = `Server ${serverIndex + 1}/5`;
            
            if (result.cachedApiKey) {
                // Show first and last 4 characters of API key
                const key = result.cachedApiKey;
                const maskedKey = key.length > 8 ? 
                    `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : 
                    key;
                apiKeyDisplay.textContent = maskedKey;
                
                if (result.keyTimestamp) {
                    const timeElapsed = now - result.keyTimestamp;
                    const timeRemaining = TWO_HOURS_MS - timeElapsed;
                    
                    if (timeRemaining > 0) {
                        cacheStatusDisplay.textContent = "Cached";
                        const hoursRemaining = Math.floor(timeRemaining / (60 * 60 * 1000));
                        const minutesRemaining = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
                        timeRemainingDisplay.textContent = `${hoursRemaining}h ${minutesRemaining}m`;
                    } else {
                        cacheStatusDisplay.textContent = "Expired";
                        timeRemainingDisplay.textContent = "0h 0m";
                    }
                } else {
                    cacheStatusDisplay.textContent = "No timestamp";
                    timeRemainingDisplay.textContent = "Unknown";
                }
            } else {
                apiKeyDisplay.textContent = "Not cached";
                cacheStatusDisplay.textContent = "No cache";
                timeRemainingDisplay.textContent = "N/A";
            }
        } catch (error) {
            currentServerDisplay.textContent = "Error";
            apiKeyDisplay.textContent = "Error loading";
            cacheStatusDisplay.textContent = "Error";
            timeRemainingDisplay.textContent = "Error";
        }
    }

    // Show main content immediately since no login is required
    mainContentDiv.classList.remove('hidden');
    updatePopupUI(false, 'Ready to analyze! Click button or use shortcut.');
    
    // Update testing info on load and every 30 seconds
    updateTestingInfo();
    setInterval(updateTestingInfo, 30000);

    // Event listeners
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
            // Update testing info after triggering analysis
            setTimeout(updateTestingInfo, 1000);
        });
    }

    // Donation button event listener
    if (donateButton) {
        donateButton.addEventListener('click', donateApiKey);
    }

    // Hide donation status when user starts typing
    if (donateApiKeyInput) {
        donateApiKeyInput.addEventListener('input', () => {
            if (donateStatus && !donateStatus.classList.contains('hidden')) {
                hideDonationStatus();
            }
        });
    }

    // Allow Enter key to trigger donation
    if (donateApiKeyInput) {
        donateApiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                donateApiKey();
            }
        });
    }

    if (donateEmailInput) {
        donateEmailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                donateApiKey();
            }
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