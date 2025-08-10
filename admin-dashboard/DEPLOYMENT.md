# 🚀 Admin Dashboard Deployment Guide

## 🌐 Deployment Options

### 1. **Vercel Deployment** (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from admin-dashboard folder
cd admin-dashboard
vercel

# Follow prompts:
# - Project name: kimaaka-admin-dashboard
# - Framework preset: Other
# - Build command: (leave empty)
# - Output directory: ./
```

**Vercel Configuration** (`vercel.json`):
```json
{
  "functions": {},
  "routes": [
    { "src": "/", "dest": "/admin.html" }
  ]
}
```

### 2. **Netlify Deployment**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy from admin-dashboard folder
cd admin-dashboard
netlify deploy

# For production:
netlify deploy --prod
```

**Netlify Configuration** (`netlify.toml`):
```toml
[build]
  command = ""
  publish = "."

[[redirects]]
  from = "/"
  to = "/admin.html"
  status = 200
```

### 3. **GitHub Pages**
1. Push admin-dashboard folder to GitHub
2. Go to repository Settings → Pages
3. Select source branch
4. Access via: `https://username.github.io/repo-name/admin.html`

### 4. **Traditional Web Hosting**
1. Upload all files to your web server
2. Point domain/subdomain to the folder
3. Access via: `https://admin.yourdomain.com/admin.html`

## ⚙️ Configuration for Production

### Update Server URLs
Edit `admin.js` and update the server URLs:

```javascript
// For production servers
const SERVER_URLS = [
    'https://kimaaka-server-1.yourdomain.com/api',
    'https://kimaaka-server-2.yourdomain.com/api',
    'https://kimaaka-server-3.yourdomain.com/api',
    'https://kimaaka-server-4.yourdomain.com/api',
    'https://kimaaka-server-5.yourdomain.com/api'
];
```

### CORS Configuration
Add your admin dashboard domain to CORS in your server:

```javascript
// In server.js
app.use(cors({
    origin: [
        'http://localhost:8080',
        'https://your-admin-dashboard.vercel.app',
        'https://admin.yourdomain.com'
    ]
}));
```

## 🔒 Security Configuration

### Environment-based URLs
```javascript
// In admin.js - Environment detection
const isDevelopment = window.location.hostname === 'localhost';

const SERVER_URLS = isDevelopment ? [
    'http://localhost:3001/api',
    'http://localhost:3002/api',
    // ... dev URLs
] : [
    'https://server1.yourdomain.com/api',
    'https://server2.yourdomain.com/api',
    // ... production URLs
];
```

### Basic Authentication (Optional)
Add to your HTML head:
```html
<script>
// Simple auth check
const adminPassword = prompt('Enter admin password:');
if (adminPassword !== 'your-secret-password') {
    document.body.innerHTML = '<h1>Access Denied</h1>';
}
</script>
```

## 📊 Monitoring Setup

### Google Analytics (Optional)
Add to HTML head:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Error Monitoring
Add error tracking:
```javascript
// In admin.js
window.addEventListener('error', (e) => {
    console.error('Dashboard Error:', e.error);
    // Send to monitoring service
});
```

## 🚀 Performance Optimization

### Minify Assets
```bash
# Install minification tools
npm install -g html-minifier uglify-js clean-css-cli

# Minify files
html-minifier --collapse-whitespace admin.html > admin.min.html
uglifyjs admin.js -o admin.min.js
```

### Enable Gzip
For traditional hosting, add `.htaccess`:
```apache
# Enable Gzip compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/javascript
</IfModule>
```

## 🔧 Custom Domain Setup

### Vercel Custom Domain
1. Go to Vercel dashboard
2. Select your project
3. Go to Settings → Domains
4. Add your custom domain
5. Update DNS records as shown

### Netlify Custom Domain
1. Go to Netlify dashboard
2. Select your site
3. Go to Site settings → Domain management
4. Add custom domain
5. Configure DNS

## 📱 PWA Configuration (Optional)

Create `manifest.json`:
```json
{
  "name": "Kimaaka Admin Dashboard",
  "short_name": "Kimaaka Admin",
  "description": "API Key Management Dashboard",
  "start_url": "/admin.html",
  "display": "standalone",
  "background_color": "#667eea",
  "theme_color": "#4f46e5",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

Add to HTML head:
```html
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#4f46e5">
```

## ✅ Pre-Deployment Checklist

- [ ] Update SERVER_URLS for production
- [ ] Configure CORS on servers
- [ ] Test all functionality
- [ ] Set up custom domain (optional)
- [ ] Configure monitoring (optional)
- [ ] Add authentication (recommended)
- [ ] Enable HTTPS
- [ ] Test on mobile devices
- [ ] Set up backup strategy

## 🆘 Troubleshooting

### Common Issues
1. **CORS Errors**: Update server CORS configuration
2. **404 Errors**: Check server URLs and routes
3. **Loading Issues**: Verify all servers are running
4. **Mobile Issues**: Test responsive design

### Debug Mode
Add to `admin.js`:
```javascript
const DEBUG = true;
if (DEBUG) {
    console.log('Debug mode enabled');
    // Add debug logs
}
```
