# 🎯 ISEkimaaka - AI-Powered Multiple Choice Assistant

**Version:** 3.0.0  
**Description:** An intelligent Chrome extension system that captures screenshots and uses Google's Gemini AI to automatically solve multiple choice questions with visual colored indicators.

## 🌟 System Overview

ISEkimaaka is a comprehensive three-component system designed for automated multiple choice question solving:

### 🧩 Core Components

1. **🔧 Chrome Extension** - Frontend interface with AI-powered screen analysis
2. **⚙️ Node.js Server** - Backend API service with Gemini integration
3. **📊 Admin Dashboard** - Management interface for monitoring and configuration

### ✨ Key Features

- **🎯 AI Question Solving**: Automatic multiple choice answer detection using Gemini 2.5 Flash
- **🎨 Visual Answer Display**: Color-coded option boxes (A-E, 1-5) with distinct colors
- **🔄 Server Failover**: Intelligent server switching for high availability
- **⚡ Instant Analysis**: Keyboard shortcut (Cmd+Shift+Y) for quick activation
- **📈 Real-time Monitoring**: Admin dashboard with server status and usage analytics
- **🛡️ Error Resilience**: Visual error handling with black indicator boxes

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- Chrome Browser
- Google Gemini API Key

### Installation

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd ISEkimaaka
   ```

2. **Setup Server**
   ```bash
   cd server
   npm install
   cp .env.example .env  # Add your Gemini API key
   ./start-servers.sh    # Starts servers on ports 3000-3004
   ```

3. **Install Extension**
   - Open Chrome → Extensions → Developer Mode
   - Load unpacked → Select `extension/` folder
   - Enable the extension

4. **Launch Admin Dashboard**
   ```bash
   cd admin-dashboard
   npm run serve  # Runs on http://localhost:8080
   ```

## 🎮 Usage

### Basic Operation
1. **Navigate** to any webpage with multiple choice questions
2. **Press** `Cmd+Shift+Y` (Mac) or `Ctrl+Shift+Y` (Windows)
3. **View** colored answer boxes appear on the page:
   - 🔴 **A/1** = Red
   - 🟢 **B/2** = Green  
   - 🔵 **C/3** = Blue
   - 🟠 **D/4** = Orange
   - 🩷 **E/5** = Pink
   - ⚫ **Error** = Black

### Advanced Features
- **Multiple Servers**: Automatic failover across 5 server instances
- **Cache Management**: 2-hour API key caching for performance
- **Error Handling**: Silent error recovery with visual indicators
- **Server Status**: Real-time monitoring via admin dashboard

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Chrome         │    │  Node.js        │    │  Admin          │
│  Extension      │◄──►│  Server         │◄──►│  Dashboard      │
│  (Frontend)     │    │  (Backend)      │    │  (Management)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
   User Interface          Gemini AI API           Server Monitoring
   Visual Results          Key Management          Usage Analytics
   Server Failover         Multi-port Service      User Management
```

## 📁 Project Structure

```
ISEkimaaka/
├── extension/           # Chrome Extension (Frontend)
│   ├── manifest.json   # Extension configuration
│   ├── background.js   # Service worker & AI logic
│   ├── content.js     # Page injection & display
│   ├── popup.html     # Extension popup interface
│   └── config.js      # Server connection settings
├── server/             # Node.js Backend
│   ├── server.js      # Express server & API endpoints
│   ├── config.js      # Server configuration
│   └── *.sh          # Server management scripts
├── admin-dashboard/    # Management Interface
│   ├── admin.html     # Dashboard UI
│   ├── admin.js      # Dashboard logic
│   └── config.js     # Dashboard configuration
└── README.md          # This file
```

## 🔧 Configuration

### Environment Variables (.env)
```bash
# Server Configuration
GEMINI_API_KEY=your_gemini_api_key_here
ENVIRONMENT=development
PORT=3000

# Admin Credentials
ADMIN_USERNAME=mokani
ADMIN_PASSWORD=chokani
```

### Multi-Server Setup
The system automatically runs on ports 3000-3004 for high availability:
- Primary: localhost:3000
- Failover: localhost:3001-3004

## 🎨 Color Scheme

| Option | Color | Hex Code |
|--------|-------|----------|
| A / 1  | Red   | #FF4444  |
| B / 2  | Green | #44AA44  |
| C / 3  | Blue  | #4444FF  |
| D / 4  | Orange| #FFAA00  |
| E / 5  | Pink  | #FF44AA  |
| Error  | Black | #000000  |

## 🚀 Deployment

### Development
```bash
# Start all servers
./server/start-servers.sh

# Check status
./server/status-servers.sh

# Stop all servers
./server/stop-servers.sh
```

### Production
- **Server**: Deploy to cloud platforms (Render, Heroku, etc.)
- **Extension**: Publish to Chrome Web Store
- **Dashboard**: Deploy to static hosting (Netlify, Vercel)

## 📊 Monitoring

Access the admin dashboard at `http://localhost:8080`:
- **Server Status**: Real-time health monitoring
- **Usage Analytics**: Request counts and response times
- **Error Tracking**: Failed request analysis
- **User Management**: Admin account control

## 🛠️ Development

### Extension Development
```bash
cd extension
# Make changes to files
# Reload extension in Chrome
```

### Server Development
```bash
cd server
npm run dev  # Start with nodemon
```

### Dashboard Development
```bash
cd admin-dashboard
npm run dev  # Start with live-server
```

## 🔒 Security

- **Client-side Authentication**: Admin dashboard uses localStorage
- **API Key Management**: Secure server-side API key handling
- **CORS Protection**: Configured for specific domains
- **Input Validation**: Server-side request validation

## 🐛 Troubleshooting

### Common Issues

1. **Extension Not Working**
   - Check if servers are running on ports 3000-3004
   - Verify Gemini API key in server/.env
   - Reload extension in Chrome

2. **Server Errors**
   - Check `./server/status-servers.sh` for server status
   - Verify API key is valid and has quota
   - Check server logs in `./server/logs/`

3. **Admin Dashboard Issues**
   - Verify servers are accessible from dashboard
   - Check browser console for errors
   - Ensure correct credentials (mokani/chokani)

### Debug Mode
Enable verbose logging by setting `DEBUG=true` in environment variables.

## 📜 License

MIT License - See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📞 Support

For issues and questions:
- Create GitHub issues for bugs
- Check troubleshooting section
- Review component-specific README files

---

**Made with ❤️ for automated learning assistance**
