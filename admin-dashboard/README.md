# 🎛️ Kimaaka Admin Dashboard

Professional admin interface for managing API keys and monitoring the Kimaaka system.

## 🚀 Quick Start

### Access the Dashboard
```bash
# Start your Kimaaka server
cd ../server
npm start

# Access dashboard at:
# http://localhost:3001/admin/admin.html
```

### Login Credentials
- **Username:** `mokani`
- **Password:** `chokani`

*See AUTH_GUIDE.md for complete authentication details*

### Option 2: Standalone Development Server
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access dashboard at:
# http://localhost:8080/admin.html
# Login: mokani / chokani
```

### Option 3: Simple HTTP Server
```bash
# Start simple server
npm run serve

# Access dashboard at:
# http://localhost:8080/admin.html
# Login: mokani / chokani
```

## 🔧 Configuration

Update the `SERVER_URLS` in `admin.js` to match your server setup:

```javascript
const SERVER_URLS = [
    'http://localhost:3000/api',
    'http://localhost:3001/api',
    'http://localhost:3002/api', 
    'http://localhost:3003/api',
    'http://localhost:3004/api',
];
```

## 📊 Features

- **API Key Management**: Add, validate, reactivate, and delete API keys
- **System Overview**: Real-time statistics and monitoring
- **Server Health**: Monitor all server instances
- **User Management**: Add/edit/delete admin users
- **Usage Analytics**: Track API key allocation and usage
- **Authentication**: Secure login system
- **Bulk Operations**: Validate all keys, reset counters, export data

## 🌐 Production Deployment

### Deploy to Vercel/Netlify
1. Upload the `admin-dashboard` folder
2. Set the build command to serve static files
3. Update `SERVER_URLS` to point to your production servers

### Deploy to Traditional Hosting
1. Upload files to your web server
2. Ensure CORS is configured on your Kimaaka servers
3. Update server URLs in `admin.js`

## 🔒 Security Notes

### Authentication
- **Default Login**: mokani / chokani
- **User Management**: Admin can add additional users
- **Local Storage**: Users stored in browser localStorage
- **No Signup**: Only admin can create new users

### Production Security
For production deployment:

1. **Change Default Credentials**: Update default login in code
2. **Implement Server Auth**: Move authentication to server-side
3. **Add HTTPS**: Ensure all connections are encrypted
4. **Session Management**: Add automatic logout and session timeouts
5. **Password Security**: Implement password hashing and strength requirements

See `AUTH_GUIDE.md` for detailed authentication information.

## 📱 Responsive Design

The dashboard is fully responsive and works on:
- 💻 Desktop computers
- 📱 Tablets
- 📱 Mobile phones

## 🎨 Customization

- Modify `admin.html` for layout changes
- Update `admin.js` for functionality changes
- CSS is embedded in the HTML for easy customization

## 🆘 Support

If you encounter issues:
1. Check browser console for errors
2. Verify server URLs are correct
3. Ensure CORS is properly configured
4. Check that your Kimaaka servers are running
