# Kimaaka - AI Screen Analysis Chrome Extension

![Kimaaka Icon](icons/icon128.png) <!-- Make sure this path is correct -->

A browser extension that instantly analyzes on-screen content using Google's Gemini Vision AI. Triggered by a simple command, it provides quick answers as a clean on-page overlay on any website.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/your-extension-id-here?label=Chrome%20Web%20Store&color=blue)](https://chrome.google.com/webstore/detail/your-extension-id-here) <!-- Replace with your store link -->

---

## Demo

<!-- It's highly recommended to create a short GIF showing the extension in action and place it here. -->
![Kimaaka Demo GIF](https://your-image-host.com/kimaaka-demo.gif)

*This demo shows the user triggering the extension on a webpage and receiving an instant analysis as an on-page overlay.*

## ✨ Core Features

*   **Analyze Anything, Anywhere:** Works on any website to analyze questions, text, or images directly from your screen.
*   **Instant On-Page Results:** The AI's response appears as a clean, temporary overlay, so you never have to leave your current tab.
*   **Privacy-First Design:** The extension is completely dormant until you explicitly call it. It has no access to your browsing data until the moment you trigger it.
*   **Zero Configuration:** No login or personal API key is required. The extension securely handles API access through a backend server.
*   **Customizable Shortcut:** Activate the analysis with the default `Ctrl+Shift+Y` / `Cmd+Shift+Y` shortcut, or change it to whatever you prefer in Chrome's settings.

## ⚙️ How It Works

This extension is built with security and efficiency in mind, using a modern programmatic injection model.

1.  **User Trigger:** The user presses the keyboard shortcut or clicks the action popup button.
2.  **Page Validation:** The background script checks that the current page is not a protected URL (like `chrome://` pages).
3.  **On-Demand Injection:** If the page is valid, the background script programmatically injects `content.js` and `content.css` into the active tab. These files do not run persistently on all pages.
4.  **Secure API Key Fetch:** The background script calls a dedicated backend server to get a temporary Gemini API key. No user data is sent in this request.
5.  **Screen Capture:** The extension captures a PNG of the visible portion of the active tab.
6.  **AI Analysis:** The captured image is sent to the Google Gemini Vision API for analysis. The image is processed ephemerally and is not stored.
7.  **Display Result:** The Gemini API response is sent back to the `content.js` script, which then creates and displays the overlay with the answer. The overlay fades out automatically after a few seconds.

## 🚀 Installation

### Option 1: From the Chrome Web Store (Recommended)

<!-- Replace with your final store link -->
You can install the official version from the [Chrome Web Store](https://chrome.google.com/webstore/detail/your-extension-id-here).

### Option 2: For Developers (Sideloading)

1.  Clone this repository to your local machine:
    ```bash
    git clone https://github.com/your-username/kimaaka-extension.git
    ```
2.  Open Google Chrome and navigate to `chrome://extensions`.
3.  Enable **"Developer mode"** using the toggle in the top-right corner.
4.  Click the **"Load unpacked"** button.
5.  Select the directory where you cloned the repository.

## 🖱️ Usage

1.  Navigate to any webpage you wish to analyze.
2.  Press `Ctrl+Shift+Y` on Windows/Linux or `Cmd+Shift+Y` on macOS.
3.  Watch for the result to appear in the bottom-left corner of your screen.

## 🛠️ Tech Stack

*   **Frontend (Extension):**
    *   Plain JavaScript (ES6+)
    *   HTML5 & CSS3
    *   Chrome Extension APIs (Manifest V3), primarily:
        *   `chrome.scripting` for programmatic injection.
        *   `chrome.commands` for keyboard shortcuts.
        *   `chrome.action` for the popup.
        *   `chrome.tabs` for screen capture.

*   **Backend:**
    *   Node.js / Express.js (or similar) for the API server.
    *   Hosted on Render (or any cloud provider).
    *   **Purpose:** To securely store and provide the Gemini API key to the extension without exposing it on the client-side.

*   **AI Service:**
    *   Google Gemini Vision API

## 📂 Project Structure

A brief overview of the key files in this project:
/
├── icons/ # Extension icons (16, 32, 48, 128px)
├── manifest.json # The core configuration file for the extension
├── background.js # Main service worker for handling logic, API calls, and injection
├── content.js # Script injected into pages to display the result overlay
├── content.css # Styles for the result overlay
├── popup.html # The simple UI shown when clicking the extension icon
├── popup.js # Logic for the popup UI (if any)
└── options.html/.js # Optional page for user-configurable settings


## 🔒 Privacy

Your privacy is the top priority.
*   ✅ **No Personal Data:** This extension **does not** collect, store, or transmit any personally identifiable information (e.g., name, email, passwords).
*   ✅ **No User Login:** There is no account system.
*   ✅ **Ephemeral Screen Captures:** Screen images are sent directly to the Gemini API for analysis and are **never** stored on our server or by the extension.
*   ✅ **No Activity Tracking:** The extension does not track your browsing history.

For more details, please see our full [Privacy Policy](link-to-your-privacy-policy.html).

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.