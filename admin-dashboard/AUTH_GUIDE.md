# 🔐 Admin Authentication Guide

## 🎯 Default Login Credentials

**Username:** `mokani`  
**Password:** `chokani`

## ✨ Features

### 🔑 Authentication System
- **Single Admin Login**: Only one default admin account
- **No Signup**: Admin users must be added by existing admin
- **Persistent Users**: Additional users stored in browser localStorage
- **Role-based**: Admin and Viewer roles supported

### 👥 User Management
- **Add Users**: Admin can create new users with username/password
- **Edit Users**: Change passwords for existing users
- **Delete Users**: Remove users (except default admin)
- **Role Assignment**: Assign Admin or Viewer roles

## 🚀 How to Use

### 1. **First Login**
1. Open the admin dashboard
2. Enter username: `mokani`
3. Enter password: `chokani`
4. Click Login

### 2. **Add New Users**
1. Go to "Users" tab
2. Fill in username, password, and role
3. Click "Add User"
4. New user can now login

### 3. **Manage Users**
- **Edit**: Click "Edit" to change user password
- **Delete**: Click "Delete" to remove user
- **Default User**: System user cannot be deleted

## 🔧 Technical Details

### Authentication Flow
```
1. User enters credentials
2. Check against default admin (mokani/chokani)
3. Check against stored users in localStorage
4. If valid → Show dashboard
5. If invalid → Show error message
```

### User Storage
```javascript
// Users stored in browser localStorage
{
  "username": "john",
  "password": "password123",
  "role": "admin",
  "createdAt": "2025-08-10T...",
  "isDefault": false
}
```

### Role Types
- **Admin**: Full access to all features
- **Viewer**: Read-only access (can be extended)

## 🔒 Security Notes

### Current Implementation
- ⚠️ **Client-side only**: Passwords stored in browser localStorage
- ⚠️ **No encryption**: Passwords stored as plain text
- ⚠️ **No session management**: No automatic logout

### Production Recommendations
```javascript
// Enhance security with:
1. Server-side authentication
2. Password hashing (bcrypt)
3. JWT tokens
4. Session timeouts
5. HTTPS enforcement
6. Rate limiting
```

## 🎨 Customization

### Change Default Credentials
Edit in `admin.js`:
```javascript
function authenticateUser(username, password) {
    const validCredentials = [
        { username: 'your-username', password: 'your-password', role: 'admin' }
    ];
    // ...
}
```

### Add Session Persistence
```javascript
// Store authentication state
localStorage.setItem('isAuthenticated', 'true');

// Check on page load
const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
```

### Add Auto-logout
```javascript
// Auto logout after 30 minutes
setTimeout(() => {
    logout();
}, 30 * 60 * 1000);
```

## 🛡️ Best Practices

### For Development
- ✅ Use default credentials for testing
- ✅ Add multiple test users
- ✅ Test role permissions

### For Production
- ✅ Change default credentials
- ✅ Implement server-side auth
- ✅ Use HTTPS
- ✅ Add password strength requirements
- ✅ Implement session management
- ✅ Add audit logging

## 🚨 Important Notes

1. **Default User**: The `mokani` user cannot be deleted
2. **Local Storage**: Users are stored locally (not across devices)
3. **No Recovery**: No password recovery mechanism
4. **Browser Dependent**: Users tied to specific browser/device

## 🎯 Usage Examples

### Adding a Team Member
1. Login as admin (mokani/chokani)
2. Go to Users tab
3. Add: username: `john`, password: `secure123`, role: `admin`
4. John can now login with his credentials

### Creating a Viewer Account
1. Add user with role: `viewer`
2. Viewer gets read-only access (implement as needed)
3. Can view dashboards but cannot modify

This authentication system provides a solid foundation for admin access control while maintaining simplicity for development and testing! 🔐
