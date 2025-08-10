# 🎛️ Kimaaka Admin Dashboard - Deployment Ready

## 📁 What's Included

This folder contains a **complete, standalone admin dashboard** that can be deployed independently of your Kimaaka servers.

### 📋 Files Overview
- `admin.html` - Main dashboard interface
- `admin.js` - Dashboard functionality and API calls  
- `package.json` - Node.js configuration for development
- `README.md` - Setup and usage instructions
- `DEPLOYMENT.md` - Complete deployment guide
- `vercel.json` - Vercel deployment configuration
- `netlify.toml` - Netlify deployment configuration

## 🚀 Quick Deploy Options

### Option 1: Deploy to Vercel (1-click)
```bash
cd admin-dashboard
npx vercel --prod
```

### Option 2: Deploy to Netlify
```bash
cd admin-dashboard  
npx netlify-cli deploy --prod --dir .
```

### Option 3: Serve via Your Kimaaka Server
```bash
# Admin dashboard accessible at:
# http://localhost:3001/admin/admin.html
```

## ⚙️ Configuration Required

### Update Server URLs
Before deploying, edit `admin.js` and update:

```javascript
const SERVER_URLS = [
    'https://your-server-1.com/api',
    'https://your-server-2.com/api', 
    'https://your-server-3.com/api',
    'https://your-server-4.com/api',
    'https://your-server-5.com/api'
];
```

### Configure CORS on Servers
Add your admin dashboard domain to your server CORS:

```javascript
app.use(cors({
    origin: [
        'https://your-admin-dashboard.vercel.app',
        'https://admin.yourdomain.com'
    ]
}));
```

## 🎯 Features

✅ **API Key Management** - Add, validate, reactivate keys  
✅ **System Monitoring** - Real-time stats and health  
✅ **Server Management** - Monitor all server instances  
✅ **Usage Analytics** - Track allocation patterns  
✅ **Bulk Operations** - Validate all, reset counters  
✅ **Data Export** - Backup system data  
✅ **Responsive Design** - Works on all devices  
✅ **Production Ready** - Security headers included  

## 🔒 Security Notes

⚠️ **No Authentication**: Add authentication for production use  
⚠️ **HTTPS Required**: Use HTTPS in production  
⚠️ **CORS Setup**: Configure CORS on your servers  

## 📱 Supported Platforms

- **Vercel** - Recommended for instant deployment
- **Netlify** - Great for static hosting  
- **GitHub Pages** - Free hosting option
- **Traditional Hosting** - Any web server
- **Your Kimaaka Server** - Served directly

## 🆘 Need Help?

1. Check `README.md` for setup instructions
2. See `DEPLOYMENT.md` for detailed deployment guide  
3. Verify your server URLs are correct
4. Ensure CORS is configured properly

## 🎉 Ready to Deploy!

This admin dashboard is completely independent and ready for production deployment. Choose your preferred hosting platform and follow the deployment guide!

**Pro Tip**: Deploy to Vercel for the fastest setup - just run `npx vercel` and you're live in minutes! 🚀
