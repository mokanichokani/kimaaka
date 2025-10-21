# 🎓 Kimaaka - AI-Powered Quiz Assistant

![Kimaaka Logo](public/isekimaaka.png)

**Version:** 3.1.0  
**Description:** An intelligent Chrome extension that analyzes multiple choice questions using AI and provides instant visual feedback with color-coded answer indicators.

## 🌟 Project Overview

Kimaaka is a comprehensive AI-powered quiz assistance system consisting of three main components:

### 🧩 Core Components

1. **🔧 Chrome Extension** - AI-powered multiple choice question analyzer with visual feedback
2. **⚙️ Next.js Server** - Backend API service with Gemini AI integration and MongoDB
3. **📊 Admin Dashboard** - Management interface for monitoring and analytics

### ✨ Key Features

- **🎯 AI-Powered Analysis**: Uses Google Gemini AI to analyze multiple choice questions
- **🎨 Visual Feedback**: Color-coded answer indicators (A-E, 1-5) for instant recognition
- **🔄 Multi-Server Support**: Intelligent failover across multiple production servers
- **⚡ Quick Activation**: Instant analysis with keyboard shortcut (Cmd+Shift+Y)
- **📈 Analytics Dashboard**: Comprehensive monitoring and usage statistics
- **🔐 API Key Management**: Round-robin distribution and donation system
- **🛡️ Secure Architecture**: JWT authentication and MongoDB integration

## 🎮 How Kimaaka Works

The analysis process is simple and efficient:

### Step 1: Activate the AI Assistant
![Popup Interface](public/popup_image.png)
*Click the Kimaaka extension or press Cmd+Shift+Y to start the AI analysis*

### Step 2: AI Analysis in Progress  
![Loading State](public/loading_image.png)
*The AI analyzes the question content to identify the correct answer*

### Step 3: Visual Feedback
![Answer Display](public/answer_image.png)  
*Visual feedback appears showing the correct answer highlighted with color-coded indicators*

![Successful Analysis Example](public/working_example.png)
*Example: Kimaaka successfully identified option C as the correct answer, with the visual color legend showing the extension's feedback system*

## 🚀 Quick Setup

### Prerequisites
- Node.js 18+ (for server development)
- Chrome Browser (for extension)
- MongoDB database (local or cloud)
- Google Gemini API access

### Installation

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd Kimaaka
   ```

2. **Setup Next.js Server**
   ```bash
   cd server
   npm install
   cp .env.example .env.local  # Configure MongoDB and JWT secret
   npm run create-admin        # Create admin user
   npm run dev                 # Start development server on port 3000
   ```

3. **Install Chrome Extension**
   - Open Chrome → Extensions → Developer Mode
   - Load unpacked → Select `extension/` folder
   - Pin the Kimaaka extension for easy access

4. **Launch Admin Dashboard**
   ```bash
   cd dashboard
   npm install
   npm run serve  # Dashboard at http://localhost:8080
   ```

## 🎯 Usage

### Using Kimaaka
1. **Navigate**: Go to any website with multiple choice questions
2. **Activate**: Press `Cmd+Shift+Y` (Mac) or `Ctrl+Shift+Y` (Windows)  
3. **View Results**: See color-coded answer indicators:
   - 🔴 **A/1** = Red (First option)
   - 🟢 **B/2** = Green (Second option)
   - 🔵 **C/3** = Blue (Third option)
   - 🟠 **D/4** = Orange (Fourth option)
   - 🩷 **E/5** = Pink (Fifth option)
   - ⚫ **Analysis Failed** = Black (When AI cannot determine answer)

### Key Benefits
- **Reliable Service**: Multi-server failover ensures consistent availability
- **Fast Response**: Smart caching and optimized API calls
- **User-Friendly**: Simple interface with clear visual feedback
- **Comprehensive Analytics**: Detailed usage tracking via admin dashboard

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Chrome         │    │  Next.js        │    │  Admin          │
│  Extension      │◄──►│  Server          │◄──►│  Dashboard      │
│  (AI Analysis)  │    │  (API & MongoDB) │    │  (Analytics)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
   Visual Feedback        Gemini AI API           Usage Analytics
   Color Indicators       Key Management         Server Monitoring
   Screenshot Analysis    User Authentication    Performance Metrics
```

## 📁 Project Structure

```
Kimaaka/
├── extension/           # Chrome Extension
│   ├── manifest.json   # Extension configuration
│   ├── background.js   # Service worker logic
│   ├── content.js     # Content script for visual feedback
│   ├── popup.html     # Extension popup interface
│   ├── popup.js       # Popup functionality
│   └── config.js      # Server configuration
├── server/             # Next.js Backend
│   ├── src/app/api/   # API routes
│   ├── src/lib/       # Utility libraries
│   ├── package.json   # Dependencies
│   └── vercel.json    # Deployment config
├── dashboard/          # Admin Dashboard
│   ├── admin.html     # Dashboard interface
│   ├── admin.js       # Dashboard logic
│   ├── config.js      # Dashboard configuration
│   └── package.json   # Dependencies
└── public/            # Static assets
    └── *.png         # Images and icons
```

## 🔧 Configuration

### Environment Variables (.env.local)
```bash
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/kimaaka

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key

# Server Configuration
RENDER_EXTERNAL_URL=http://localhost:3000
```

### Extension Configuration
The extension connects to multiple production servers for reliability:
- Primary: kimaakaserver1.onrender.com
- Backup: kimaakaserver2-5.onrender.com

## 📚 API Endpoints

### Public Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check and server statistics |
| `POST` | `/api/signup` | User registration |
| `POST` | `/api/login` | User authentication |
| `GET` | `/api/verify` | Token verification |
| `GET` | `/api/gemini-key` | Request API key (round-robin) |
| `POST` | `/api/donate-key` | Donate API key to pool |

### Admin Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/auth/login` | Admin authentication |
| `GET` | `/api/admin/stats` | Server statistics |
| `GET` | `/api/admin/api-keys` | Manage API keys |
| `GET` | `/api/admin/users` | List all users |
| `GET` | `/api/admin/usage-statistics` | Usage analytics |

## 🚀 Deployment

### Server Deployment (Vercel)
1. **Connect to Vercel**
   ```bash
   vercel login
   vercel
   ```

2. **Set Environment Variables**
   - MONGODB_URI
   - JWT_SECRET
   - RENDER_EXTERNAL_URL

### Extension Deployment
1. **Package Extension**
   - Zip the `extension/` folder
   - Upload to Chrome Web Store Developer Dashboard

### Dashboard Deployment
1. **Static Hosting**
   ```bash
   cd dashboard
   npm run build
   # Deploy to Netlify, Vercel, or similar
   ```

## 🛠️ Development

### Server Development
```bash
cd server
npm run dev          # Start development server
npm test            # Run API tests
npm run create-admin # Create admin user
```

### Extension Development
```bash
cd extension
# Make changes to extension files
# Reload extension in Chrome Extensions page
```

### Dashboard Development
```bash
cd dashboard
npm run serve       # Start local server
npm run dev         # Start with live reload
```

## 🔐 Security & Privacy

- **JWT Authentication**: Secure token-based authentication
- **MongoDB Security**: Database access controls and validation
- **API Key Management**: Secure round-robin distribution
- **Privacy Protection**: No personal data storage, screenshots processed locally

## 🐛 Troubleshooting

### Common Issues

1. **Extension Not Working**
   - Check if servers are running
   - Verify API keys in server configuration
   - Reload extension in Chrome
   - Check browser console for errors

2. **Server Issues**
   - Verify MongoDB connection
   - Check environment variables
   - Review server logs
   - Test API endpoints

3. **Dashboard Issues**
   - Verify server connectivity
   - Check admin credentials
   - Review browser console
   - Test API endpoints

## 📜 License

MIT License - See LICENSE file for complete details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/NewFeature`)
3. Commit changes (`git commit -m 'Add NewFeature'`)
4. Push branch (`git push origin feature/NewFeature`)
5. Open Pull Request

## 📞 Support

For questions and support:
- Create GitHub issues for bugs and feature requests
- Check troubleshooting section
- Review component-specific documentation

---

**Made with ❤️ for AI-powered learning assistance**