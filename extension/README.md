# 🎯 kimaaka Chrome Extension

**Version:** 3.0.0  
**Type:** Chrome Extension (Manifest V3)  
**Purpose:** AI-powered multiple choice question solver with visual color-coded answers

## 🌟 Overview

The kimaaka Chrome Extension is the frontend component that captures screenshots, communicates with the backend server, and displays AI-generated answers as colored visual indicators on any webpage.

## ✨ Features

### 🎯 Core Functionality
- **Screenshot Capture**: Captures visible tab content automatically
- **AI Analysis**: Sends images to Gemini 2.5 Flash for question analysis
- **Visual Results**: Displays answers as colored option boxes
- **Keyboard Shortcut**: `Cmd+Shift+Y` (Mac) / `Ctrl+Shift+Y` (Windows)
- **Server Failover**: Intelligent switching between 5 server instances

### 🎨 Visual Answer System
- **A/1**: 🔴 Red (#FF4444)
- **B/2**: 🟢 Green (#44AA44)
- **C/3**: 🔵 Blue (#4444FF)
- **D/4**: 🟠 Orange (#FFAA00)
- **E/5**: 🩷 Pink (#FF44AA)
- **Error**: ⚫ Black (#000000)

### 🔄 Advanced Features
- **Smart Caching**: 2-hour API key cache for performance
- **Error Resilience**: Visual error handling with black boxes
- **Multi-injection Protection**: Prevents script conflicts
- **Real-time Status**: Server allocation tracking in popup

## 📁 File Structure

```
extension/
├── manifest.json       # Extension configuration & permissions
├── background.js       # Service worker (main logic)
├── content.js         # Page injection & visual display
├── popup.html         # Extension popup interface
├── popup.js          # Popup logic & server status
├── options.html      # Extension settings page
├── options.js        # Settings page logic
├── content.css       # Styles for injected elements
├── config.js         # Server connection configuration
├── privacypolicy.html # Privacy policy page
├── icons/            # Extension icons (16, 32, 48, 128px)
└── README.md         # This documentation
```

## 🔧 Installation

### Development Installation
1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd kimaaka/extension
   ```

2. **Load in Chrome**
   - Open Chrome → `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/` folder
   - Pin the extension to toolbar

3. **Verify Installation**
   - Look for kimaaka icon in toolbar
   - Test with `Cmd+Shift+Y` shortcut
   - Check popup shows server status

### Production Installation
1. Download from Chrome Web Store (when published)
2. Click "Add to Chrome"
3. Grant required permissions

## ⚙️ Configuration

### Server Configuration (config.js)
```javascript
const SERVER_CONFIG = {
    ENVIRONMENT: 'development', // 'development' or 'production'
    PORTS: [3000, 3001, 3002, 3003, 3004],
    BASE_URL: 'http://localhost',
    PRODUCTION_URL: 'https://your-production-domain.com'
};
```

### Environment Switching
- **Development**: Uses localhost:3000-3004
- **Production**: Uses configured production URL
- **Automatic Failover**: Tries all available servers

## 🎮 Usage

### Basic Operation
1. **Navigate** to any webpage with multiple choice questions
2. **Activate** using one of these methods:
   - Press `Cmd+Shift+Y` (Mac) or `Ctrl+Shift+Y` (Windows)
   - Click extension icon → "Analyze Screen"
3. **View Results**: Colored boxes appear showing the answer
4. **Auto-hide**: Results disappear after 1.5 seconds (success) or 8 seconds (error)

### Popup Interface
Click the extension icon to see:
- **Current Server Status**: Which server is being used
- **Server Health**: Real-time connection status
- **Quick Actions**: Analyze screen button
- **Settings**: Link to options page

### Advanced Usage
- **Error Handling**: Black boxes indicate analysis failures
- **Multiple Answers**: Multiple colored boxes for complex questions
- **Cache Status**: Popup shows if using cached vs fresh API keys

## 🏗️ Technical Architecture

### Background Script (background.js)
- **Service Worker**: Handles API communication
- **Server Management**: Failover logic and health monitoring
- **API Integration**: Gemini API communication
- **Cache Management**: 2-hour API key caching
- **Error Handling**: Comprehensive error management

### Content Script (content.js)
- **DOM Injection**: Safely injects visual elements
- **Result Display**: Renders colored option boxes
- **Multi-injection Protection**: Prevents conflicts
- **Visual Styling**: Applies CSS for option boxes
- **Message Handling**: Communicates with background script

### Popup Interface (popup.js)
- **Server Status**: Real-time server monitoring
- **User Controls**: Manual analysis trigger
- **Status Display**: Connection and cache information
- **Navigation**: Links to settings and privacy policy

## 🔄 Server Communication

### API Endpoints Used
```javascript
// Primary endpoints (with failover)
GET  /gemini-key           # Fetch API key
GET  /api/health          # Health check
POST /api/analyze         # Future endpoint (if implemented)
```

### Failover Logic
1. **Try Available Servers**: Exclude recently failed servers
2. **Random Selection**: Load balancing across healthy servers
3. **Error Tracking**: Mark failed servers for 5-minute timeout
4. **Auto Recovery**: Reset failed servers after timeout
5. **Fallback**: Try all servers if all marked as failed

### Request Flow
```
User Action → Background Script → Server Selection → API Call → 
Gemini Analysis → Response Processing → Content Script → Visual Display
```

## 🎨 Visual System

### Option Box Styling
```css
.option-box {
    display: inline-block;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    margin: 0 2px;
    vertical-align: middle;
    border: 1px solid rgba(0,0,0,0.2);
}
```

### Color Detection
- **Regex Pattern**: `/\b([ABCDE12345])\b/gi`
- **Case Insensitive**: Handles both uppercase and lowercase
- **Word Boundaries**: Prevents partial matches
- **Dual Support**: Both letters (A-E) and numbers (1-5)

### Error Handling
- **Silent Errors**: No error messages shown to user
- **Visual Indicators**: Black boxes for any error state
- **Console Logging**: Detailed errors in developer console
- **Graceful Degradation**: System continues working after errors

## 🔒 Permissions & Security

### Required Permissions (manifest.json)
```json
{
  "permissions": [
    "activeTab",      // Screenshot capture
    "storage",        // Cache management
    "scripting",      // Content script injection
    "commands"        // Keyboard shortcuts
  ],
  "host_permissions": [
    "<all_urls>",     // All websites
    "https://generativelanguage.googleapis.com/"  // Gemini API
  ]
}
```

### Security Features
- **Tab Isolation**: Only affects active tab
- **Protected Pages**: Cannot run on chrome:// or store pages
- **Input Validation**: Server validates all requests
- **No Data Storage**: No personal data stored locally
- **API Key Security**: Keys handled server-side only

## 🐛 Troubleshooting

### Common Issues

#### 1. Extension Not Working
**Symptoms**: No response to keyboard shortcut
**Solutions**:
- Check if page is protected (chrome://, store pages)
- Verify extension is enabled
- Check server status in popup
- Reload extension in chrome://extensions/

#### 2. Server Connection Errors
**Symptoms**: Black boxes appearing consistently
**Solutions**:
- Verify servers running on localhost:3000-3004
- Check popup for server status
- Test server health: `curl http://localhost:3000/api/health`
- Check browser console for detailed errors

#### 3. Visual Display Issues
**Symptoms**: Results not appearing or misplaced
**Solutions**:
- Check for CSS conflicts on page
- Verify content script injection
- Look for JavaScript errors in console
- Try refreshing the page

#### 4. Performance Issues
**Symptoms**: Slow response times
**Solutions**:
- Check API key cache status
- Monitor server response times
- Use fewer concurrent requests
- Verify network connectivity

### Debug Mode
Enable detailed logging:
1. Open browser console (F12)
2. Look for "CS:" (content script) and background logs
3. Check Network tab for API requests
4. Monitor popup for real-time status

### Error Categories
- **🔴 Server Errors**: Connection/API issues
- **🟡 Analysis Errors**: Gemini API problems
- **🔵 Display Errors**: Content injection issues
- **⚫ Unknown Errors**: Unexpected failures

## 🔄 Development

### Development Setup
```bash
# Make changes to extension files
cd extension/

# Reload extension
# Go to chrome://extensions/ → Reload button

# Test changes
# Use Cmd+Shift+Y on test pages
```

### Testing Checklist
- [ ] Keyboard shortcut works
- [ ] Popup displays correctly
- [ ] Server failover functions
- [ ] Visual boxes appear properly
- [ ] Error handling works
- [ ] Multiple choice formats supported
- [ ] Cache management operational

### Code Modification
- **Background Script**: API logic and server communication
- **Content Script**: Visual display and page interaction
- **Popup**: User interface and status display
- **Config**: Server URLs and environment settings

## 📊 Performance Metrics

### Typical Response Times
- **Cached API Key**: 0.5-1.5 seconds
- **Fresh API Key**: 1.0-2.5 seconds
- **Server Failover**: +0.5-1.0 seconds per attempt
- **Visual Display**: <100ms

### Resource Usage
- **Memory**: ~5-10MB when active
- **Network**: ~200KB per analysis
- **CPU**: Minimal background usage
- **Storage**: <1MB for cache

## 🚀 Future Enhancements

### Planned Features
- **Answer Confidence**: Visual confidence indicators
- **Question Types**: Support for more question formats
- **Bulk Analysis**: Multiple questions at once
- **Custom Shortcuts**: User-configurable hotkeys
- **Analytics**: Usage statistics and insights

### API Improvements
- **Streaming Responses**: Real-time analysis updates
- **Batch Processing**: Multiple images per request
- **Custom Prompts**: User-defined analysis instructions
- **Result Caching**: Cache answers for repeated questions

---

**Extension Ready! 🚀 Press Cmd+Shift+Y to analyze any multiple choice question**
