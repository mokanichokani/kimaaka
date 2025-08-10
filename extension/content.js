// content.js

// Prevent multiple injections by checking if already loaded
if (window.kimaakaContentScriptLoaded) {
    console.log("Kimaaka content script already loaded, skipping injection");
} else {
    window.kimaakaContentScriptLoaded = true;
    console.log("Gemini Vision content script INJECTED into:", window.location.href);

let geminiDisplayElement = null;
let displayTimeoutId = null;

function ensureDisplayElement() {
    console.log("CS: ensureDisplayElement called.");
    if (!geminiDisplayElement) {
        console.log("CS: Creating geminiDisplayElement.");
        geminiDisplayElement = document.createElement('div');
        geminiDisplayElement.id = 'gemini-vision-onpage-result';
        geminiDisplayElement.style.display = 'none'; 
        
        if (document.body) {
            document.body.appendChild(geminiDisplayElement);
            console.log("CS: geminiDisplayElement appended to document.body.");
        } else {
            console.warn("CS: document.body not available at time of ensureDisplayElement. Will try on DOMContentLoaded.");
            document.addEventListener('DOMContentLoaded', () => {
                if (!geminiDisplayElement.parentNode && document.body) {
                    document.body.appendChild(geminiDisplayElement);
                    console.log("CS: geminiDisplayElement appended to document.body (DOMContentLoaded).");
                }
            });
        }
    }
    return geminiDisplayElement;
}

function convertTextToColoredBoxes(text) {
    if (!text || typeof text !== 'string') return text;
    
    // Define color mapping for options
    const colorMap = {
        'A': '#FF4444', // Red
        'B': '#44AA44', // Green  
        'C': '#4444FF', // Blue
        'D': '#FFAA00', // Yellow/Orange
        'E': '#FF44AA', // Pink
        '1': '#FF4444', // Red (same as A)
        '2': '#44AA44', // Green (same as B)
        '3': '#4444FF', // Blue (same as C)
        '4': '#FFAA00', // Yellow/Orange (same as D)
        '5': '#FF44AA'  // Pink (same as E)
    };
    
    // Find all instances of A, B, C, D, E or 1, 2, 3, 4, 5 (case insensitive) and convert to colored boxes
    let result = text.replace(/\b([ABCDE12345])\b/gi, (match, character) => {
        const upperCharacter = character.toUpperCase();
        const color = colorMap[upperCharacter] || colorMap[character];
        if (color) {
            return `<span class="option-box" style="background-color: ${color};" title="Option ${upperCharacter || character}"></span>`;
        }
        return match;
    });
    
    return result;
}

function showOnPageDisplay(htmlContent, rror = false, isLoading = false) {
    console.log(`CS: showOnPageDisplay called. isLoading: ${isLoading}, rror: ${rror}`);
    const displayEl = ensureDisplayElement();

    if (!displayEl) {
        console.error("CS: displayEl is null in showOnPageDisplay. Cannot show content.");
        return;
    }
    
    if (!displayEl.parentNode && document.body) {
        console.warn("CS: displayEl was not in DOM, re-appending in showOnPageDisplay.");
        document.body.appendChild(displayEl);
    }

    // Convert text to colored boxes if it's not an error or loading state
    let processedContent = htmlContent;
    if (!rror && !isLoading) {
        processedContent = convertTextToColoredBoxes(htmlContent);
    }

    displayEl.innerHTML = processedContent;
    // Remove all helper classes as we're not using them for styling background/color
    displayEl.classList.remove('error', 'loading'); 

    displayEl.style.display = 'block';
    console.log("CS: displayEl.style.display set to 'block'. InnerHTML:", displayEl.innerHTML);

    if (displayTimeoutId) {
        clearTimeout(displayTimeoutId);
        displayTimeoutId = null;
    }

    if (!isLoading) {
        const hideDelay = rror ? 8000 : 1500; // Adjust as needed
        console.log(`CS: Setting auto-hide timer for ${hideDelay}ms.`);
        displayTimeoutId = setTimeout(() => {
            if (geminiDisplayElement) {
                geminiDisplayElement.style.opacity = '0';
                setTimeout(() => {
                    if (geminiDisplayElement) geminiDisplayElement.style.display = 'none';
                    console.log("CS: geminiDisplayElement hidden by timer.");
                }, 300); 
            }
            displayTimeoutId = null;
        }, hideDelay);
    } else {
        // If loading, ensure opacity is 1 (in case it was faded out before)
        if (displayEl) displayEl.style.opacity = '1';
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("CS: Message received from background:", request); 

    if (request.action === "show_gemini_loading") {
        console.log("CS: Handling 'show_gemini_loading'.");
        const loadingText = request.loadingText || '. .'; // Use provided loading text or default
        showOnPageDisplay(loadingText, false, true);
        sendResponse({status: "loading_shown_on_page"});
    } else if (request.action === "show_gemini_result") {
        console.log("CS: Handling 'show_gemini_result'.");
        if (request.error) {
            // Show black option box for errors
            console.log("CS: Error detected, showing black option box");
            const blackBox = '<span class="option-box" style="background-color: #000000;" title="Error"></span>';
            showOnPageDisplay(blackBox, false);
        } else if (!request.result || request.result.trim() === '') {
            // Show black option box for empty results (analysis failures)
            console.log("CS: Empty result detected, showing black option box");
            const blackBox = '<span class="option-box" style="background-color: #000000;" title="No Answer"></span>';
            showOnPageDisplay(blackBox, false);
        } else {
            // Show normal result with colored boxes
            showOnPageDisplay(request.result ? request.result.replace(/\n/g, '<br>') : '', false);
        }
        sendResponse({status: "result_shown_on_page"});
    }
    return true; 
});

} // End of kimaakaContentScriptLoaded check