# Kimaaka Server

A Next.js API server for managing Gemini API keys with user authentication, admin dashboard, and comprehensive analytics. Built with TypeScript, MongoDB, and deployed on Vercel with integrated analytics and performance monitoring.

## 🚀 Features

- **API Key Management**: Round-robin distribution of Gemini API keys
- **User Authentication**: JWT-based authentication system
- **Admin Dashboard**: Complete admin interface for managing API keys and users
- **Key Donation System**: Users can donate their API keys to the pool
- **Analytics & Monitoring**: Vercel Analytics and Speed Insights integration
- **Health Monitoring**: Comprehensive health checks and server statistics
- **CORS Support**: Full CORS configuration for cross-origin requests
- **Usage Tracking**: Detailed usage statistics and performance metrics

## 🛠️ Tech Stack

- **Framework**: Next.js 15.5.4 with App Router
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Analytics**: Vercel Analytics & Speed Insights
- **CORS**: Built-in CORS handling

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB database (local or cloud)
- npm or yarn package manager

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/kimaaka
   JWT_SECRET=your-super-secret-jwt-key
   RENDER_EXTERNAL_URL=http://localhost:3000
   ```

4. **Database Setup**
   Make sure MongoDB is running and accessible with the URI specified in your environment variables.

5. **Create Admin User**
   ```bash
   npm run create-admin
   ```
   Follow the prompts to create your first admin user.

## 🚀 Development

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Run tests**
   ```bash
   npm test
   ```

3. **Build for production**
   ```bash
   npm run build
   npm start
   ```

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
| `POST` | `/api/logout` | User logout |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/auth/login` | Admin authentication |
| `GET` | `/api/admin/auth/verify` | Admin token verification |
| `GET` | `/api/admin/users` | List all users |
| `GET` | `/api/admin/stats` | Server statistics |
| `GET` | `/api/admin/api-keys` | Manage API keys |
| `POST` | `/api/admin/api-keys` | Add new API key |
| `GET` | `/api/admin/api-keys/validate-all` | Validate all API keys |
| `GET` | `/api/admin/recent-activity` | Recent activity logs |
| `GET` | `/api/admin/usage-statistics` | Usage statistics |

### Convenience Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/gemini-key` | Alias for `/api/gemini-key` |
| `POST` | `/donate-key` | Alias for `/api/donate-key` |

## 🗄️ Database Models

### User
- `email`: User email (unique)
- `password`: Hashed password
- `isAdmin`: Admin status
- `createdAt`: Registration date

### AdminUser
- `username`: Admin username (unique)
- `password`: Hashed password
- `role`: 'admin' or 'viewer'
- `isDefault`: Default admin flag
- `lastLogin`: Last login timestamp
- `createdAt`: Creation date
- `createdBy`: Creator identifier

### ApiKey
- `keyName`: Key identifier
- `apiKey`: Actual API key
- `status`: 'active' or 'deactivated'
- `usageCount`: Number of allocations
- `allocationCount`: Total allocations
- `lastUsed`: Last usage timestamp
- `lastValidated`: Last validation timestamp
- `validationError`: Validation error message
- `description`: Key description
- `source`: 'admin' or 'donated'

### DonatedApiKey
- `apiKey`: Donated API key
- `donorEmail`: Donor email
- `status`: 'active' or 'deactivated'
- `usageCount`: Usage statistics
- `isValidated`: Validation status
- `source`: Source identifier

### ServerUsage
- `serverUrl`: Server URL
- `port`: Server port
- `totalAllocations`: Total API key allocations
- `totalApiCalls`: Total API calls
- `successfulRequests`: Successful requests count
- `failedRequests`: Failed requests count
- `averageResponseTime`: Average response time
- `dailyStats`: Daily usage statistics
- `hourlyStats`: Hourly usage statistics

## 🔐 Authentication

### User Authentication
1. **Signup**: `POST /api/signup` with email and password
2. **Login**: `POST /api/login` with email and password
3. **Token**: JWT token returned for authenticated requests
4. **Verification**: `GET /api/verify` with Bearer token

### Admin Authentication
1. **Login**: `POST /api/admin/auth/login` with username and password
2. **Token**: JWT token for admin operations
3. **Verification**: `GET /api/admin/auth/verify` with Bearer token

## 📊 Analytics & Monitoring

The application includes comprehensive monitoring:

- **Vercel Analytics**: Page views and user interactions
- **Speed Insights**: Core Web Vitals and performance metrics
- **Health Checks**: Database connectivity and server status
- **Usage Statistics**: API key usage and allocation tracking
- **Performance Metrics**: Response times and error rates

## 🚀 Deployment

### Vercel Deployment

1. **Connect to Vercel**
   ```bash
   vercel login
   vercel
   ```

2. **Environment Variables**
   Set the following in Vercel dashboard:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Secret key for JWT tokens
   - `RENDER_EXTERNAL_URL`: Your Vercel app URL

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Configuration

The `vercel.json` file includes:
- CORS headers for all API routes
- Function timeout configuration (30 seconds)
- URL rewrites for convenience endpoints

## 🧪 Testing

Run the comprehensive API test suite:

```bash
npm test
```

The test suite covers:
- Health checks
- User authentication flow
- Admin authentication
- API key management
- Token verification
- Error handling

## 📝 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production with Turbopack |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run API tests |
| `npm run create-admin` | Create admin user interactively |
| `npm run setup-admin` | Setup admin user |

## 🔧 Configuration

### CORS
- Configured for cross-origin requests
- Supports all common HTTP methods
- Allows Content-Type and Authorization headers

### Security
- Password hashing with bcryptjs (12 rounds)
- JWT token authentication
- Input validation and sanitization
- CORS protection

### Performance
- Round-robin API key distribution
- Connection pooling for MongoDB
- Response time tracking
- Memory usage monitoring

## 📈 Usage Statistics

The server tracks comprehensive usage statistics:

- **API Key Allocations**: Round-robin distribution tracking
- **Request Metrics**: Success/failure rates and response times
- **User Activity**: Registration and login patterns
- **Server Performance**: Memory usage and uptime
- **Daily/Hourly Stats**: Detailed time-based analytics

## 🛠️ Development Tools

- **TypeScript**: Full type safety
- **ESLint**: Code quality and consistency
- **Tailwind CSS**: Utility-first styling
- **Mongoose**: MongoDB object modeling
- **Next.js**: React framework with API routes

## 📄 License

This project is private and proprietary.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests to ensure everything works
5. Submit a pull request

## 📞 Support

For support and questions, please contact the development team.

---

**Built with ❤️ using Next.js, TypeScript, and MongoDB**
