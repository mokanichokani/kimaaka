// content.js

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
        'D': '#FFAA00'  // Yellow/Orange
    };
    
    // Find all instances of A, B, C, D (case insensitive) and convert to colored boxes
    let result = text.replace(/\b([ABCD])\b/gi, (match, letter) => {
        const upperLetter = letter.toUpperCase();
        const color = colorMap[upperLetter];
        if (color) {
            return `<span class="option-box" style="background-color: ${color};" title="Option ${upperLetter}"></span>`;
        }
        return match;
    });
    
    return result;
}

function showOnPageDisplay(htmlContent, isError = false, isLoading = false) {
    console.log(`CS: showOnPageDisplay called. isLoading: ${isLoading}, isError: ${isError}`);
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
    if (!isError && !isLoading) {
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
        const hideDelay = isError ? 8000 : 1500; // Adjust as needed
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
            // For errors, you might still want some minimal visual distinction or prefix
            showOnPageDisplay(`Error: ${request.error.replace(/\n/g, '<br>')}`, true);
        } else {
            showOnPageDisplay(request.result ? request.result.replace(/\n/g, '<br>') : '', false); // Just the result
        }
        sendResponse({status: "result_shown_on_page"});
    }
    return true; 
});