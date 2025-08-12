const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import server configuration
const SERVER_CONFIG = require('./config.js');

// Debug environment variables
console.log('Environment check:');
console.log('Current directory:', __dirname);
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
if (process.env.MONGODB_URI) {
    console.log('MONGODB_URI starts with mongodb:', process.env.MONGODB_URI.startsWith('mongodb'));
}

const app = express();

// Enhanced CORS configuration for Chrome Extension and Admin Dashboard
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, Postman, Chrome extensions)
        if (!origin) return callback(null, true);
        
        // Allow Chrome extension origins
        if (origin.startsWith('chrome-extension://')) {
            return callback(null, true);
        }
        
        // Allow moz-extension for Firefox
        if (origin.startsWith('moz-extension://')) {
            return callback(null, true);
        }
        
        // Allow localhost for development
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }
        
        // Allow admin dashboard origins
        const allowedOrigins = [
            'https://kimaaka-admin.netlify.app',
            'https://kimaaka-admin.vercel.app',
            'null' // For local file access
        ];
        
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        // Allow all origins for now (can be restricted later)
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Additional CORS headers for Chrome Extensions
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    
    next();
});

// Logging middleware to track all requests
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;
    const ip = req.ip || req.connection.remoteAddress;
    
    console.log(`[${timestamp}] ${method} ${url} - IP: ${ip}`);
    
    // Log request body for POST/PUT requests (but hide sensitive data)
    if ((method === 'POST' || method === 'PUT') && req.body) {
        const logBody = { ...req.body };
        // Hide sensitive information
        if (logBody.password) logBody.password = '[HIDDEN]';
        if (logBody.apiKey) logBody.apiKey = `${logBody.apiKey.substring(0, 8)}...`;
        console.log(`[${timestamp}] Request Body:`, logBody);
    }
    
    // Track response
    const originalSend = res.send;
    res.send = function(data) {
        const statusCode = res.statusCode;
        console.log(`[${timestamp}] Response: ${statusCode} ${method} ${url}`);
        if (statusCode >= 400) {
            console.log(`[${timestamp}] Error Response:`, data);
        }
        originalSend.call(this, data);
    };
    
    next();
});

// Serve static files for admin panel
app.use('/admin', express.static(path.join(__dirname, '../admin-dashboard')));

// ========================================
// DATABASE CONNECTION
// ========================================

// Connect to MongoDB with extended timeout settings
mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
    maxPoolSize: 10,
    retryWrites: true,
    w: 'majority'
}).then(() => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🗄️ Connected to MongoDB successfully`);
}).catch((error) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ MongoDB connection error:`, error.message);
    process.exit(1);
});

// Handle MongoDB connection events
mongoose.connection.on('connected', async () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🔗 Mongoose connected to MongoDB`);
    
    // Initialize server usage tracking after MongoDB connection
    try {
        await initializeServerUsageTracking();
    } catch (error) {
        console.error(`[${timestamp}] ⚠️ Failed to initialize server usage tracking:`, error.message);
    }
});

mongoose.connection.on('error', (err) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ Mongoose connection error:`, err.message);
});

mongoose.connection.on('disconnected', () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ⚠️ Mongoose disconnected from MongoDB`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
        process.exit(0);
    } catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
});

// ========================================
// DATABASE SCHEMAS
// ========================================

// User Schema
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Admin User Schema (for dashboard authentication)
const adminUserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 4
    },
    role: {
        type: String,
        enum: ['admin', 'viewer'],
        default: 'admin'
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: String,
        default: 'system'
    }
});

// API Key Schema for admin management
const apiKeySchema = new mongoose.Schema({
    keyName: {
        type: String,
        required: true,
        unique: true
    },
    apiKey: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'deactivated'],
        default: 'active'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    usageCount: {
        type: Number,
        default: 0
    },
    allocationCount: {
        type: Number,
        default: 0
    },
    lastUsed: {
        type: Date,
        default: null
    },
    lastValidated: {
        type: Date,
        default: null
    },
    validationError: {
        type: String,
        default: null
    },
    description: {
        type: String,
        default: ''
    },
    source: {
        type: String,
        enum: ['admin', 'donated'],
        default: 'admin'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Donated API Key Schema for user contributions
const donatedApiKeySchema = new mongoose.Schema({
    apiKey: {
        type: String,
        required: true,
        unique: true
    },
    donorEmail: {
        type: String,
        default: 'anonymous'
    },
    status: {
        type: String,
        enum: ['active', 'deactivated'],
        default: 'active'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    usageCount: {
        type: Number,
        default: 0
    },
    allocationCount: {
        type: Number,
        default: 0
    },
    lastUsed: {
        type: Date,
        default: null
    },
    isValidated: {
        type: Boolean,
        default: false
    },
    lastValidated: {
        type: Date,
        default: null
    },
    validationError: {
        type: String,
        default: null
    },
    source: {
        type: String,
        default: 'donated'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

adminUserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Compare password methods
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

adminUserSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Server Usage Tracking Schema
const serverUsageSchema = new mongoose.Schema({
    serverUrl: {
        type: String,
        required: true,
        unique: true
    },
    port: {
        type: Number,
        required: true
    },
    totalAllocations: {
        type: Number,
        default: 0
    },
    totalApiCalls: {
        type: Number,
        default: 0
    },
    totalLoadHandled: {
        type: Number,
        default: 0
    },
    successfulRequests: {
        type: Number,
        default: 0
    },
    failedRequests: {
        type: Number,
        default: 0
    },
    lastUsed: {
        type: Date,
        default: null
    },
    isOnline: {
        type: Boolean,
        default: true
    },
    averageResponseTime: {
        type: Number,
        default: 0
    },
    dailyStats: [{
        date: {
            type: Date,
            required: true
        },
        allocations: {
            type: Number,
            default: 0
        },
        apiCalls: {
            type: Number,
            default: 0
        },
        loadHandled: {
            type: Number,
            default: 0
        },
        successfulRequests: {
            type: Number,
            default: 0
        },
        failedRequests: {
            type: Number,
            default: 0
        },
        averageResponseTime: {
            type: Number,
            default: 0
        }
    }],
    hourlyStats: [{
        timestamp: {
            type: Date,
            required: true
        },
        allocations: {
            type: Number,
            default: 0
        },
        apiCalls: {
            type: Number,
            default: 0
        },
        responseTime: {
            type: Number,
            default: 0
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
serverUsageSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Models
const User = mongoose.model('User', userSchema);
const AdminUser = mongoose.model('AdminUser', adminUserSchema);
const ApiKey = mongoose.model('ApiKey', apiKeySchema);
const DonatedApiKey = mongoose.model('DonatedApiKey', donatedApiKeySchema);
const ServerUsage = mongoose.model('ServerUsage', serverUsageSchema);

// ========================================
// HELPER FUNCTIONS
// ========================================

// Helper function to validate Gemini API key
const validateGeminiApiKey = async (apiKey) => {
    const timestamp = new Date().toISOString();
    const maskedKey = `${apiKey.substring(0, 8)}...`;
    
    try {
        console.log(`[${timestamp}] 🧪 Testing API key ${maskedKey} with Gemini API...`);
        
        const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "contents": [{
                    "parts": [{ "text": "Test" }]
                }],
                "generationConfig": {
                    "temperature": 0.1,
                    "maxOutputTokens": 10
                }
            })
        });
        
        if (testResponse.ok) {
            const responseData = await testResponse.json();
            console.log(`[${timestamp}] ✅ API key ${maskedKey} validation successful`);
            return { isValid: true, error: null };
        } else {
            const errorData = await testResponse.json();
            const errorMsg = errorData.error?.message || `HTTP ${testResponse.status}: ${testResponse.statusText}`;
            console.log(`[${timestamp}] ❌ API key ${maskedKey} validation failed: ${errorMsg}`);
            return { 
                isValid: false, 
                error: errorMsg
            };
        }
    } catch (error) {
        const errorMsg = `Network error: ${error.message}`;
        console.log(`[${timestamp}] ❌ API key ${maskedKey} validation error: ${errorMsg}`);
        return { 
            isValid: false, 
            error: errorMsg
        };
    }
};

// Helper function to get API key using round-robin allocation with validation
const getRoundRobinApiKey = async () => {
    const timestamp = new Date().toISOString();
    
    try {
        console.log(`[${timestamp}] 🔄 Starting round-robin API key allocation...`);
        
        // Get all active keys (both admin and donated) sorted by allocation count
        const adminKeys = await ApiKey.find({ status: 'active' })
            .sort({ allocationCount: 1, lastUsed: 1 })
            .lean();
        
        const donatedKeys = await DonatedApiKey.find({ status: 'active', isValidated: true })
            .sort({ allocationCount: 1, lastUsed: 1 })
            .lean();
        
        // Combine all keys and sort by allocation count
        const allKeys = [
            ...adminKeys.map(k => ({ ...k, source: 'admin' })),
            ...donatedKeys.map(k => ({ ...k, source: 'donated' }))
        ].sort((a, b) => {
            if (a.allocationCount !== b.allocationCount) {
                return a.allocationCount - b.allocationCount;
            }
            return (a.lastUsed || new Date(0)) - (b.lastUsed || new Date(0));
        });
        
        if (allKeys.length === 0) {
            console.log(`[${timestamp}] ❌ No active API keys available`);
            throw new Error('No active API keys available');
        }
        
        // Find the key with minimum allocation count
        const minAllocationCount = allKeys[0].allocationCount;
        const candidateKeys = allKeys.filter(key => key.allocationCount === minAllocationCount);
        
        console.log(`[${timestamp}] 🎯 Found ${candidateKeys.length} keys with minimum allocation count: ${minAllocationCount}`);
        
        // Try each candidate key until we find a valid one
        for (const keyData of candidateKeys) {
            const maskedKey = `${keyData.apiKey.substring(0, 8)}...`;
            console.log(`[${timestamp}] 🧪 Testing ${keyData.source} key ${maskedKey}...`);
            
            // Validate the API key
            const validation = await validateGeminiApiKey(keyData.apiKey);
            
            if (validation.isValid) {
                // Key is valid, update allocation count and return
                console.log(`[${timestamp}] ✅ Key ${maskedKey} is valid, allocating...`);
                
                if (keyData.source === 'admin') {
                    await ApiKey.findByIdAndUpdate(keyData._id, {
                        $inc: { allocationCount: 1, usageCount: 1 },
                        lastUsed: new Date(),
                        lastValidated: new Date()
                    });
                } else {
                    await DonatedApiKey.findByIdAndUpdate(keyData._id, {
                        $inc: { allocationCount: 1, usageCount: 1 },
                        lastUsed: new Date(),
                        lastValidated: new Date()
                    });
                }
                
                console.log(`[${timestamp}] 📊 Updated ${keyData.source} key allocation count to ${keyData.allocationCount + 1}`);
                return keyData.apiKey;
            } else {
                // Key is invalid, mark as deactivated
                console.log(`[${timestamp}] ❌ Key ${maskedKey} is invalid: ${validation.error}`);
                
                if (keyData.source === 'admin') {
                    await ApiKey.findByIdAndUpdate(keyData._id, {
                        status: 'deactivated',
                        isActive: false,
                        validationError: validation.error,
                        lastValidated: new Date()
                    });
                } else {
                    await DonatedApiKey.findByIdAndUpdate(keyData._id, {
                        status: 'deactivated',
                        isActive: false,
                        validationError: validation.error,
                        lastValidated: new Date()
                    });
                }
            }
        }
        
        // If we get here, all candidate keys were invalid
        console.log(`[${timestamp}] ❌ All candidate keys were invalid, trying next batch...`);
        
        // Try to find keys with the next lowest allocation count
        const remainingKeys = allKeys.filter(key => key.allocationCount > minAllocationCount);
        
        if (remainingKeys.length === 0) {
            throw new Error('All API keys have been deactivated due to validation failures');
        }
        
        // Recursively try the next batch
        return await getRoundRobinApiKey();
        
    } catch (error) {
        console.error(`[${timestamp}] ❌ Error in round-robin allocation:`, error.message);
        throw new Error('Unable to allocate API key: ' + error.message);
    }
};

// ========================================
// SERVER USAGE TRACKING FUNCTIONS
// ========================================

// Helper function to get current server port
const getCurrentServerPort = () => {
    // This will be set when the server starts
    return process.env.CURRENT_SERVER_PORT || SERVER_CONFIG.getDefaultPort();
};

// Helper function to initialize server usage tracking
const initializeServerUsageTracking = async () => {
    const currentPort = getCurrentServerPort();
    const serverUrl = `http://localhost:${currentPort}/api`;
    
    try {
        let serverUsage = await ServerUsage.findOne({ serverUrl });
        
        if (!serverUsage) {
            serverUsage = new ServerUsage({
                serverUrl,
                port: currentPort,
                isOnline: true
            });
            await serverUsage.save();
            console.log(`📊 Initialized usage tracking for server: ${serverUrl}`);
        } else {
            // Mark server as online when starting
            serverUsage.isOnline = true;
            await serverUsage.save();
            console.log(`📊 Resumed usage tracking for server: ${serverUrl}`);
        }
        
        return serverUsage;
    } catch (error) {
        console.error('Error initializing server usage tracking:', error);
    }
};

// Helper function to track API key allocation
const trackApiKeyAllocation = async (responseTime = 0) => {
    const currentPort = getCurrentServerPort();
    const serverUrl = `http://localhost:${currentPort}/api`;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentHour = new Date();
    currentHour.setMinutes(0, 0, 0);
    
    try {
        let serverUsage = await ServerUsage.findOne({ serverUrl });
        
        if (!serverUsage) {
            serverUsage = new ServerUsage({
                serverUrl,
                port: currentPort,
                isOnline: true
            });
        }
        
        // Update overall stats
        serverUsage.totalAllocations += 1;
        serverUsage.totalApiCalls += 1;
        serverUsage.totalLoadHandled += 1;
        serverUsage.successfulRequests += 1;
        serverUsage.lastUsed = new Date();
        
        // Update average response time
        if (responseTime > 0) {
            const totalRequests = serverUsage.successfulRequests + serverUsage.failedRequests;
            serverUsage.averageResponseTime = 
                ((serverUsage.averageResponseTime * (totalRequests - 1)) + responseTime) / totalRequests;
        }
        
        // Update daily stats
        let dailyStat = serverUsage.dailyStats.find(stat => 
            stat.date.getTime() === today.getTime()
        );
        
        if (!dailyStat) {
            dailyStat = {
                date: today,
                allocations: 0,
                apiCalls: 0,
                loadHandled: 0,
                successfulRequests: 0,
                failedRequests: 0,
                averageResponseTime: 0
            };
            serverUsage.dailyStats.push(dailyStat);
        }
        
        dailyStat.allocations += 1;
        dailyStat.apiCalls += 1;
        dailyStat.loadHandled += 1;
        dailyStat.successfulRequests += 1;
        if (responseTime > 0) {
            const dailyTotalRequests = dailyStat.successfulRequests + dailyStat.failedRequests;
            dailyStat.averageResponseTime = 
                ((dailyStat.averageResponseTime * (dailyTotalRequests - 1)) + responseTime) / dailyTotalRequests;
        }
        
        // Update hourly stats
        let hourlyStat = serverUsage.hourlyStats.find(stat => 
            stat.timestamp.getTime() === currentHour.getTime()
        );
        
        if (!hourlyStat) {
            hourlyStat = {
                timestamp: currentHour,
                allocations: 0,
                apiCalls: 0,
                responseTime: responseTime
            };
            serverUsage.hourlyStats.push(hourlyStat);
        } else {
            hourlyStat.allocations += 1;
            hourlyStat.apiCalls += 1;
            if (responseTime > 0) {
                hourlyStat.responseTime = (hourlyStat.responseTime + responseTime) / 2;
            }
        }
        
        // Keep only last 30 days of daily stats
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        serverUsage.dailyStats = serverUsage.dailyStats.filter(stat => stat.date >= thirtyDaysAgo);
        
        // Keep only last 24 hours of hourly stats
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
        serverUsage.hourlyStats = serverUsage.hourlyStats.filter(stat => stat.timestamp >= twentyFourHoursAgo);
        
        await serverUsage.save();
        
        console.log(`📈 Tracked allocation for ${serverUrl} - Total: ${serverUsage.totalAllocations}`);
        
    } catch (error) {
        console.error('Error tracking API key allocation:', error);
    }
};

// Helper function to track failed requests
const trackFailedRequest = async (error = null) => {
    const currentPort = getCurrentServerPort();
    const serverUrl = `http://localhost:${currentPort}/api`;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    try {
        let serverUsage = await ServerUsage.findOne({ serverUrl });
        
        if (!serverUsage) {
            serverUsage = new ServerUsage({
                serverUrl,
                port: currentPort,
                isOnline: true
            });
        }
        
        serverUsage.failedRequests += 1;
        
        // Update daily stats
        let dailyStat = serverUsage.dailyStats.find(stat => 
            stat.date.getTime() === today.getTime()
        );
        
        if (!dailyStat) {
            dailyStat = {
                date: today,
                allocations: 0,
                apiCalls: 0,
                loadHandled: 0,
                successfulRequests: 0,
                failedRequests: 0,
                averageResponseTime: 0
            };
            serverUsage.dailyStats.push(dailyStat);
        }
        
        dailyStat.failedRequests += 1;
        
        await serverUsage.save();
        
        console.log(`📉 Tracked failed request for ${serverUrl} - Total failures: ${serverUsage.failedRequests}`);
        
    } catch (error) {
        console.error('Error tracking failed request:', error);
    }
};

// ========================================
// AUTHENTICATION MIDDLEWARE
// ========================================

// JWT middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Admin middleware
const authenticateAdmin = (req, res, next) => {
    authenticateToken(req, res, (err) => {
        if (err) return;
        
        // Check for both old style (isAdmin) and new style (type: 'admin') tokens
        if (!req.user.isAdmin && req.user.type !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    });
};

// ========================================
// PUBLIC ROUTES
// ========================================

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const dbState = mongoose.connection.readyState;
        const dbStates = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        
        const [adminKeysCount, donatedKeysCount, totalUsers, serverUsage] = await Promise.all([
            ApiKey.countDocuments({ status: 'active' }),
            DonatedApiKey.countDocuments({ status: 'active' }),
            User.countDocuments(),
            ServerUsage.findOne({ serverUrl: process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}` })
        ]);

        if (dbState === 1) {
            await mongoose.connection.db.admin().ping();
            
            // Calculate additional statistics
            const memoryUsage = process.memoryUsage();
            const memoryUsageMB = {
                rss: Math.round(memoryUsage.rss / 1024 / 1024),
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                external: Math.round(memoryUsage.external / 1024 / 1024)
            };
            
            // Server usage statistics
            const usageStats = serverUsage ? {
                totalAllocations: serverUsage.totalAllocations,
                totalApiCalls: serverUsage.totalApiCalls,
                successfulRequests: serverUsage.successfulRequests,
                failedRequests: serverUsage.failedRequests,
                averageResponseTime: serverUsage.averageResponseTime,
                lastUsed: serverUsage.lastUsed,
                uptime: Math.floor(process.uptime())
            } : null;
            
            res.json({ 
                status: 'healthy', 
                database: 'connected',
                uptime: process.uptime(),
                memory: memoryUsage,
                memoryMB: memoryUsageMB,
                adminKeysCount,
                donatedKeysCount,
                totalUsers,
                apiKeysCount: adminKeysCount + donatedKeysCount,
                serverStats: usageStats,
                nodeVersion: process.version,
                platform: process.platform,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(503).json({ 
                status: 'unhealthy', 
                database: dbStates[dbState] || 'unknown',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Health check error:', error);
        res.status(503).json({ 
            status: 'unhealthy', 
            database: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Get API key for any user (no authentication required)
app.get('/api/gemini-key', async (req, res) => {
    const timestamp = new Date().toISOString();
    const startTime = Date.now();
    console.log(`[${timestamp}] 🔑 API Key Request - Using round-robin allocation...`);
    
    try {
        const apiKey = await getRoundRobinApiKey();
        const maskedKey = `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`;
        
        const responseTime = Date.now() - startTime;
        
        // Track successful API key allocation
        await trackApiKeyAllocation(responseTime);
        
        console.log(`[${timestamp}] ✅ API Key Provided: ${maskedKey} (${responseTime}ms)`);
        res.json({ geminiApiKey: apiKey });

    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        // Track failed request
        await trackFailedRequest(error.message);
        
        console.error(`[${timestamp}] ❌ API Key Error:`, error.message);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Donate API key endpoint (no authentication required)
app.post('/api/donate-key', async (req, res) => {
    const timestamp = new Date().toISOString();
    const { apiKey, donorEmail } = req.body;
    
    console.log(`[${timestamp}] 💝 API Key Donation Request`);
    console.log(`[${timestamp}] - Donor Email: ${donorEmail || 'anonymous'}`);
    console.log(`[${timestamp}] - API Key: ${apiKey ? `${apiKey.substring(0, 8)}...` : 'missing'}`);

    try {
        if (!apiKey) {
            console.log(`[${timestamp}] ❌ Donation Failed: No API key provided`);
            return res.status(400).json({ error: 'API key is required' });
        }

        // Check if this API key already exists in either collection
        console.log(`[${timestamp}] 🔍 Checking for duplicate keys...`);
        const existingAdminKey = await ApiKey.findOne({ apiKey });
        const existingDonatedKey = await DonatedApiKey.findOne({ apiKey });
        
        if (existingAdminKey || existingDonatedKey) {
            console.log(`[${timestamp}] ❌ Donation Failed: Duplicate key detected`);
            return res.status(400).json({ error: 'This API key has already been donated' });
        }

        // Validate the API key
        console.log(`[${timestamp}] 🔄 Validating API key with Gemini API...`);
        const validation = await validateGeminiApiKey(apiKey);
        
        if (!validation.isValid) {
            console.log(`[${timestamp}] ❌ Donation Failed: Invalid API key - ${validation.error}`);
            return res.status(400).json({ 
                error: 'Invalid API key', 
                details: validation.error 
            });
        }

        // Save the validated API key
        console.log(`[${timestamp}] 💾 Saving validated API key to database...`);
        const donatedKey = new DonatedApiKey({
            apiKey,
            donorEmail: donorEmail || 'anonymous',
            isValidated: true,
            isActive: true
        });

        await donatedKey.save();
        console.log(`[${timestamp}] ✅ Donation Successful! Key saved with ID: ${donatedKey._id}`);

        res.status(201).json({
            message: 'API key validated and added successfully! Thank you for your donation.',
            success: true
        });

    } catch (error) {
        console.error(`[${timestamp}] ❌ Donation Error:`, error.message);
        
        if (error.code === 11000) {
            console.log(`[${timestamp}] ❌ Donation Failed: Duplicate key error`);
            return res.status(400).json({ error: 'This API key has already been donated' });
        }
        
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========================================
// USER AUTHENTICATION ROUTES
// ========================================

// Sign up
app.post('/api/signup', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        const existingUser = await User.findOne({ email }).maxTimeMS(20000);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }

        const user = new User({ email, password });
        await user.save();

        const token = jwt.sign(
            { userId: user._id, email: user.email, isAdmin: user.isAdmin },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: user._id,
                email: user.email,
                isAdmin: user.isAdmin
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        
        if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
            return res.status(503).json({ 
                error: 'Database connection timeout. Please try again in a moment.',
                details: 'The server is experiencing connectivity issues with the database.'
            });
        }
        
        if (error.name === 'MongoServerSelectionError') {
            return res.status(503).json({ 
                error: 'Database server unavailable. Please try again later.',
                details: 'Cannot connect to the database server.'
            });
        }
        
        if (error.code === 11000) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }
        
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findOne({ email }).maxTimeMS(20000);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email, isAdmin: user.isAdmin },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                isAdmin: user.isAdmin
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        
        if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
            return res.status(503).json({ 
                error: 'Database connection timeout. Please try again in a moment.',
                details: 'The server is experiencing connectivity issues with the database.'
            });
        }
        
        if (error.name === 'MongoServerSelectionError') {
            return res.status(503).json({ 
                error: 'Database server unavailable. Please try again later.',
                details: 'Cannot connect to the database server.'
            });
        }
        
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Verify token endpoint
app.get('/api/verify', authenticateToken, (req, res) => {
    res.json({ 
        message: 'Token is valid',
        user: {
            id: req.user.userId,
            email: req.user.email,
            isAdmin: req.user.isAdmin
        }
    });
});

// Logout (client-side token removal, but we can log it)
app.post('/api/logout', authenticateToken, (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

// Create first admin user endpoint (only if no admin exists)
app.post('/api/create-admin', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const existingAdmin = await User.findOne({ isAdmin: true });
        if (existingAdmin) {
            return res.status(400).json({ error: 'Admin already exists' });
        }

        const adminUser = new User({
            email,
            password,
            isAdmin: true
        });

        await adminUser.save();

        res.status(201).json({
            message: 'Admin user created successfully',
            user: {
                id: adminUser._id,
                email: adminUser.email,
                isAdmin: adminUser.isAdmin
            }
        });

    } catch (error) {
        console.error('Create admin error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========================================
// ADMIN AUTHENTICATION ROUTES
// ========================================

// Admin login
app.post('/api/admin/auth/login', async (req, res) => {
    const timestamp = new Date().toISOString();
    
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        console.log(`[${timestamp}] 🔐 Admin login attempt for username: ${username}`);
        
        const adminUser = await AdminUser.findOne({ username });
        
        if (!adminUser) {
            console.log(`[${timestamp}] ❌ Admin user not found: ${username}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const isPasswordValid = await adminUser.comparePassword(password);
        
        if (!isPasswordValid) {
            console.log(`[${timestamp}] ❌ Invalid password for admin user: ${username}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        await AdminUser.findByIdAndUpdate(adminUser._id, { lastLogin: new Date() });
        
        const token = jwt.sign(
            { 
                userId: adminUser._id, 
                username: adminUser.username, 
                role: adminUser.role,
                type: 'admin'
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        console.log(`[${timestamp}] ✅ Admin login successful: ${username}`);
        
        res.json({
            success: true,
            token,
            user: {
                id: adminUser._id,
                username: adminUser.username,
                role: adminUser.role,
                lastLogin: adminUser.lastLogin
            }
        });
        
    } catch (error) {
        console.error(`[${timestamp}] ❌ Admin login error:`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin token verification
app.get('/api/admin/auth/verify', authenticateToken, async (req, res) => {
    try {
        if (req.user.type !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const adminUser = await AdminUser.findById(req.user.userId).select('-password');
        
        if (!adminUser) {
            return res.status(404).json({ error: 'Admin user not found' });
        }
        
        res.json({
            success: true,
            user: {
                id: adminUser._id,
                username: adminUser.username,
                role: adminUser.role,
                lastLogin: adminUser.lastLogin
            }
        });
        
    } catch (error) {
        console.error('Admin verify error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all admin users
app.get('/api/admin/auth/users', authenticateToken, async (req, res) => {
    try {
        if (req.user.type !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const adminUsers = await AdminUser.find().select('-password').sort({ createdAt: -1 });
        res.json(adminUsers);
        
    } catch (error) {
        console.error('Get admin users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add new admin user
app.post('/api/admin/auth/users', authenticateToken, async (req, res) => {
    try {
        if (req.user.type !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const { username, password, role = 'admin' } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        const existingUser = await AdminUser.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        const newAdminUser = new AdminUser({
            username,
            password,
            role,
            createdBy: req.user.username
        });
        
        await newAdminUser.save();
        
        console.log(`Admin user created: ${username} by ${req.user.username}`);
        
        res.status(201).json({
            success: true,
            message: 'Admin user created successfully',
            user: {
                id: newAdminUser._id,
                username: newAdminUser.username,
                role: newAdminUser.role,
                createdAt: newAdminUser.createdAt
            }
        });
        
    } catch (error) {
        console.error('Create admin user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update admin user password
app.put('/api/admin/auth/users/:userId/password', authenticateToken, async (req, res) => {
    try {
        if (req.user.type !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const { userId } = req.params;
        const { newPassword } = req.body;
        
        if (!newPassword) {
            return res.status(400).json({ error: 'New password is required' });
        }
        
        const adminUser = await AdminUser.findById(userId);
        if (!adminUser) {
            return res.status(404).json({ error: 'Admin user not found' });
        }
        
        if (adminUser.isDefault && req.user.userId !== userId) {
            return res.status(403).json({ error: 'Cannot modify default admin user' });
        }
        
        adminUser.password = newPassword;
        await adminUser.save();
        
        console.log(`Admin user password updated: ${adminUser.username} by ${req.user.username}`);
        
        res.json({ success: true, message: 'Password updated successfully' });
        
    } catch (error) {
        console.error('Update admin password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete admin user
app.delete('/api/admin/auth/users/:userId', authenticateToken, async (req, res) => {
    try {
        if (req.user.type !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const { userId } = req.params;
        
        const adminUser = await AdminUser.findById(userId);
        if (!adminUser) {
            return res.status(404).json({ error: 'Admin user not found' });
        }
        
        if (adminUser.isDefault) {
            return res.status(403).json({ error: 'Cannot delete default admin user' });
        }
        
        if (req.user.userId === userId) {
            return res.status(403).json({ error: 'Cannot delete your own account' });
        }
        
        await AdminUser.findByIdAndDelete(userId);
        
        console.log(`Admin user deleted: ${adminUser.username} by ${req.user.username}`);
        
        res.json({ success: true, message: 'Admin user deleted successfully' });
        
    } catch (error) {
        console.error('Delete admin user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========================================
// ADMIN DASHBOARD ROUTES
// ========================================

// Get admin stats for overview
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    try {
        const [
            totalApiKeysCount,
            activeApiKeysCount,
            donatedApiKeysCount,
            totalDonatedKeysCount,
            totalUsers,
            adminKeys,
            donatedKeys,
            serverUsage
        ] = await Promise.all([
            ApiKey.countDocuments(),
            ApiKey.countDocuments({ status: 'active' }),
            DonatedApiKey.countDocuments({ status: 'active' }),
            DonatedApiKey.countDocuments(),
            User.countDocuments(),
            ApiKey.find({ status: 'active' }).select('usageCount allocationCount lastUsed'),
            DonatedApiKey.find({ status: 'active' }).select('usageCount allocationCount lastUsed'),
            ServerUsage.findOne({ port: getCurrentServerPort() })
        ]);

        // Calculate total API calls from all keys
        const adminTotalCalls = adminKeys.reduce((sum, key) => sum + (key.usageCount || 0), 0);
        const donatedTotalCalls = donatedKeys.reduce((sum, key) => sum + (key.usageCount || 0), 0);
        const totalApiCalls = adminTotalCalls + donatedTotalCalls;

        // Calculate total allocations from all keys
        const adminTotalAllocations = adminKeys.reduce((sum, key) => sum + (key.allocationCount || 0), 0);
        const donatedTotalAllocations = donatedKeys.reduce((sum, key) => sum + (key.allocationCount || 0), 0);
        const totalAllocations = adminTotalAllocations + donatedTotalAllocations;

        // Server-specific statistics
        const serverStats = serverUsage ? {
            totalServerAllocations: serverUsage.totalAllocations,
            totalServerApiCalls: serverUsage.totalApiCalls,
            successfulRequests: serverUsage.successfulRequests,
            failedRequests: serverUsage.failedRequests,
            averageResponseTime: serverUsage.averageResponseTime,
            lastUsed: serverUsage.lastUsed,
            serverUptime: Math.floor(process.uptime()),
            isOnline: serverUsage.isOnline
        } : {
            totalServerAllocations: 0,
            totalServerApiCalls: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            lastUsed: null,
            serverUptime: Math.floor(process.uptime()),
            isOnline: true
        };

        // Calculate success rate
        const totalRequests = serverStats.successfulRequests + serverStats.failedRequests;
        const successRate = totalRequests > 0 ? 
            ((serverStats.successfulRequests / totalRequests) * 100).toFixed(1) : '100.0';

        // Most recent API key usage
        const allKeys = [...adminKeys, ...donatedKeys];
        const mostRecentUsage = allKeys
            .filter(key => key.lastUsed)
            .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))[0];

        const response = {
            // Basic counts
            totalApiKeys: totalApiKeysCount + totalDonatedKeysCount,
            activeApiKeys: activeApiKeysCount + donatedApiKeysCount,
            donatedApiKeys: donatedApiKeysCount,
            totalUsers,
            
            // API call statistics
            totalApiCalls,
            adminApiCalls: adminTotalCalls,
            donatedApiCalls: donatedTotalCalls,
            
            // Allocation statistics
            totalAllocations,
            adminAllocations: adminTotalAllocations,
            donatedAllocations: donatedTotalAllocations,
            
            // Server statistics
            ...serverStats,
            successRate,
            
            // Usage metadata
            mostRecentUsage: mostRecentUsage ? {
                timestamp: mostRecentUsage.lastUsed,
                timeAgo: new Date() - new Date(mostRecentUsage.lastUsed)
            } : null,
            
            // Current server info
            currentServerPort: getCurrentServerPort(),
            lastUpdated: new Date().toISOString()
        };

        res.json(response);
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get recent activity
app.get('/api/admin/recent-activity', authenticateToken, async (req, res) => {
    try {
        const recentApiKeys = await ApiKey.find()
            .sort({ lastUsed: -1 })
            .limit(10)
            .select('keyName lastUsed usageCount');

        const recentDonated = await DonatedApiKey.find()
            .sort({ lastUsed: -1 })
            .limit(10)
            .select('donorEmail lastUsed usageCount');

        const activities = [];

        recentApiKeys.forEach(key => {
            if (key.lastUsed) {
                activities.push({
                    action: `Admin key "${key.keyName}" used (${key.usageCount} times)`,
                    timestamp: key.lastUsed
                });
            }
        });

        recentDonated.forEach(key => {
            if (key.lastUsed) {
                activities.push({
                    action: `Donated key from "${key.donorEmail}" used (${key.usageCount} times)`,
                    timestamp: key.lastUsed
                });
            }
        });

        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json(activities.slice(0, 20));
    } catch (error) {
        console.error('Recent activity error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get comprehensive usage statistics with date/time breakdown
app.get('/api/admin/usage-statistics', authenticateToken, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const daysInt = parseInt(days);
        
        // Get server usage data
        const currentServerUsage = await ServerUsage.findOne({ port: getCurrentServerPort() });
        const allServerUsage = await ServerUsage.find();
        
        // Get API key usage data
        const [adminKeys, donatedKeys] = await Promise.all([
            ApiKey.find({ status: 'active' }).select('usageCount allocationCount lastUsed createdAt keyName'),
            DonatedApiKey.find({ status: 'active' }).select('usageCount allocationCount lastUsed createdAt donorEmail')
        ]);
        
        // Calculate daily usage breakdown from server data
        const dailyUsage = {};
        
        if (currentServerUsage && currentServerUsage.dailyStats) {
            currentServerUsage.dailyStats
                .filter(stat => {
                    const daysDiff = (new Date() - new Date(stat.date)) / (1000 * 60 * 60 * 24);
                    return daysDiff <= daysInt;
                })
                .forEach(stat => {
                    const dateKey = new Date(stat.date).toISOString().split('T')[0];
                    dailyUsage[dateKey] = {
                        date: dateKey,
                        allocations: stat.allocations,
                        apiCalls: stat.apiCalls,
                        successfulRequests: stat.successfulRequests,
                        failedRequests: stat.failedRequests,
                        averageResponseTime: stat.averageResponseTime
                    };
                });
        }
        
        // Calculate hourly usage for today
        const hourlyUsage = [];
        if (currentServerUsage && currentServerUsage.hourlyStats) {
            const twentyFourHoursAgo = new Date();
            twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
            
            currentServerUsage.hourlyStats
                .filter(stat => new Date(stat.timestamp) >= twentyFourHoursAgo)
                .forEach(stat => {
                    hourlyUsage.push({
                        hour: new Date(stat.timestamp).toISOString(),
                        allocations: stat.allocations,
                        apiCalls: stat.apiCalls,
                        responseTime: stat.responseTime
                    });
                });
        }
        
        // API key usage statistics
        const keyUsageStats = {
            adminKeys: adminKeys.map(key => ({
                name: key.keyName || 'Unnamed',
                usageCount: key.usageCount,
                allocationCount: key.allocationCount,
                lastUsed: key.lastUsed,
                daysSinceCreated: Math.floor((new Date() - new Date(key.createdAt)) / (1000 * 60 * 60 * 24)),
                daysSinceLastUsed: key.lastUsed ? 
                    Math.floor((new Date() - new Date(key.lastUsed)) / (1000 * 60 * 60 * 24)) : null
            })),
            donatedKeys: donatedKeys.map(key => ({
                donor: key.donorEmail,
                usageCount: key.usageCount,
                allocationCount: key.allocationCount,
                lastUsed: key.lastUsed,
                daysSinceCreated: Math.floor((new Date() - new Date(key.createdAt)) / (1000 * 60 * 60 * 24)),
                daysSinceLastUsed: key.lastUsed ? 
                    Math.floor((new Date() - new Date(key.lastUsed)) / (1000 * 60 * 60 * 24)) : null
            }))
        };
        
        // Total usage calculations
        const totalAdminCalls = adminKeys.reduce((sum, key) => sum + (key.usageCount || 0), 0);
        const totalDonatedCalls = donatedKeys.reduce((sum, key) => sum + (key.usageCount || 0), 0);
        const totalAdminAllocations = adminKeys.reduce((sum, key) => sum + (key.allocationCount || 0), 0);
        const totalDonatedAllocations = donatedKeys.reduce((sum, key) => sum + (key.allocationCount || 0), 0);
        
        // Cross-server aggregation
        const crossServerStats = {
            totalServers: allServerUsage.length,
            onlineServers: allServerUsage.filter(s => s.isOnline).length,
            combinedAllocations: allServerUsage.reduce((sum, s) => sum + s.totalAllocations, 0),
            combinedApiCalls: allServerUsage.reduce((sum, s) => sum + s.totalApiCalls, 0),
            combinedSuccessfulRequests: allServerUsage.reduce((sum, s) => sum + s.successfulRequests, 0),
            combinedFailedRequests: allServerUsage.reduce((sum, s) => sum + s.failedRequests, 0),
            averageResponseTime: allServerUsage.length > 0 ? 
                allServerUsage.reduce((sum, s) => sum + s.averageResponseTime, 0) / allServerUsage.length : 0
        };
        
        const response = {
            summary: {
                totalApiCalls: totalAdminCalls + totalDonatedCalls,
                totalAllocations: totalAdminAllocations + totalDonatedAllocations,
                adminCalls: totalAdminCalls,
                donatedCalls: totalDonatedCalls,
                adminAllocations: totalAdminAllocations,
                donatedAllocations: totalDonatedAllocations,
                currentServerPort: getCurrentServerPort(),
                lastUpdated: new Date().toISOString(),
                periodDays: daysInt
            },
            currentServer: {
                port: getCurrentServerPort(),
                totalAllocations: currentServerUsage?.totalAllocations || 0,
                totalApiCalls: currentServerUsage?.totalApiCalls || 0,
                successfulRequests: currentServerUsage?.successfulRequests || 0,
                failedRequests: currentServerUsage?.failedRequests || 0,
                averageResponseTime: currentServerUsage?.averageResponseTime || 0,
                lastUsed: currentServerUsage?.lastUsed || null,
                uptime: Math.floor(process.uptime())
            },
            crossServerStats,
            dailyBreakdown: Object.values(dailyUsage).sort((a, b) => new Date(a.date) - new Date(b.date)),
            hourlyBreakdown: hourlyUsage.sort((a, b) => new Date(a.hour) - new Date(b.hour)),
            keyUsageStats,
            metadata: {
                generatedAt: new Date().toISOString(),
                serverPort: getCurrentServerPort(),
                dataRange: `${daysInt} days`,
                totalKeysTracked: adminKeys.length + donatedKeys.length
            }
        };
        
        res.json(response);
    } catch (error) {
        console.error('Usage statistics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get server usage statistics
app.get('/api/admin/server-usage', authenticateToken, async (req, res) => {
    try {
        const allServerUsage = await ServerUsage.find().sort({ port: 1 });
        
        // Calculate totals across all servers
        const totalStats = {
            totalServers: allServerUsage.length,
            onlineServers: allServerUsage.filter(s => s.isOnline).length,
            totalAllocations: allServerUsage.reduce((sum, s) => sum + s.totalAllocations, 0),
            totalApiCalls: allServerUsage.reduce((sum, s) => sum + s.totalApiCalls, 0),
            totalSuccessfulRequests: allServerUsage.reduce((sum, s) => sum + s.successfulRequests, 0),
            totalFailedRequests: allServerUsage.reduce((sum, s) => sum + s.failedRequests, 0),
            averageResponseTime: allServerUsage.reduce((sum, s) => sum + s.averageResponseTime, 0) / (allServerUsage.length || 1)
        };
        
        res.json({
            servers: allServerUsage,
            totalStats
        });
    } catch (error) {
        console.error('Server usage error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get detailed server usage for a specific server
app.get('/api/admin/server-usage/:port', authenticateToken, async (req, res) => {
    try {
        const { port } = req.params;
        const serverUrl = `http://localhost:${port}/api`;
        
        const serverUsage = await ServerUsage.findOne({ serverUrl });
        
        if (!serverUsage) {
            return res.status(404).json({ error: 'Server usage data not found' });
        }
        
        res.json(serverUsage);
    } catch (error) {
        console.error('Server usage detail error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get server usage analytics (daily/hourly breakdown)
app.get('/api/admin/server-analytics', authenticateToken, async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const daysInt = parseInt(days);
        
        const allServerUsage = await ServerUsage.find();
        
        // Aggregate daily stats across all servers
        const dailyAggregates = {};
        const hourlyAggregates = {};
        
        allServerUsage.forEach(server => {
            // Process daily stats
            server.dailyStats.forEach(dayStat => {
                const dateKey = dayStat.date.toISOString().split('T')[0];
                if (!dailyAggregates[dateKey]) {
                    dailyAggregates[dateKey] = {
                        date: dateKey,
                        allocations: 0,
                        apiCalls: 0,
                        successfulRequests: 0,
                        failedRequests: 0,
                        serverCount: 0
                    };
                }
                dailyAggregates[dateKey].allocations += dayStat.allocations;
                dailyAggregates[dateKey].apiCalls += dayStat.apiCalls;
                dailyAggregates[dateKey].successfulRequests += dayStat.successfulRequests;
                dailyAggregates[dateKey].failedRequests += dayStat.failedRequests;
                dailyAggregates[dateKey].serverCount++;
            });
            
            // Process hourly stats (last 24 hours)
            server.hourlyStats.forEach(hourStat => {
                const hourKey = hourStat.timestamp.toISOString();
                if (!hourlyAggregates[hourKey]) {
                    hourlyAggregates[hourKey] = {
                        timestamp: hourKey,
                        allocations: 0,
                        apiCalls: 0,
                        responseTime: 0,
                        serverCount: 0
                    };
                }
                hourlyAggregates[hourKey].allocations += hourStat.allocations;
                hourlyAggregates[hourKey].apiCalls += hourStat.apiCalls;
                hourlyAggregates[hourKey].responseTime += hourStat.responseTime;
                hourlyAggregates[hourKey].serverCount++;
            });
        });
        
        // Convert to arrays and sort
        const dailyData = Object.values(dailyAggregates)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(-daysInt);
            
        const hourlyData = Object.values(hourlyAggregates)
            .map(hour => ({
                ...hour,
                responseTime: hour.responseTime / (hour.serverCount || 1) // Average response time
            }))
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .slice(-24); // Last 24 hours
        
        res.json({
            daily: dailyData,
            hourly: hourlyData,
            summary: {
                totalServers: allServerUsage.length,
                activePeriod: `${daysInt} days`,
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Server analytics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reset server usage statistics
app.post('/api/admin/reset-server-stats', authenticateToken, async (req, res) => {
    try {
        await ServerUsage.updateMany({}, {
            totalAllocations: 0,
            totalApiCalls: 0,
            totalLoadHandled: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            dailyStats: [],
            hourlyStats: []
        });
        
        res.json({ message: 'Server usage statistics reset successfully' });
    } catch (error) {
        console.error('Reset server stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all API keys for management (unified)
app.get('/api/admin/api-keys', authenticateToken, async (req, res) => {
    try {
        const [adminKeys, donatedKeys] = await Promise.all([
            ApiKey.find().sort({ createdAt: -1 }),
            DonatedApiKey.find().sort({ createdAt: -1 })
        ]);

        const allKeys = [
            ...adminKeys.map(key => ({
                _id: key._id,
                apiKey: key.apiKey,
                status: key.status,
                usageCount: key.usageCount,
                allocationCount: key.allocationCount,
                lastUsed: key.lastUsed,
                lastValidated: key.lastValidated,
                description: key.description || key.keyName,
                source: 'admin',
                createdAt: key.createdAt
            })),
            ...donatedKeys.map(key => ({
                _id: key._id,
                apiKey: key.apiKey,
                status: key.status,
                usageCount: key.usageCount,
                allocationCount: key.allocationCount,
                lastUsed: key.lastUsed,
                lastValidated: key.lastValidated,
                description: `Donated by ${key.donorEmail}`,
                source: 'donated',
                createdAt: key.createdAt
            }))
        ];

        res.json(allKeys);
    } catch (error) {
        console.error('Get API keys error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add new API key (unified)
app.post('/api/admin/api-keys', authenticateToken, async (req, res) => {
    try {
        const { apiKey, description, source = 'admin' } = req.body;

        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required' });
        }

        // Validate the API key
        const validation = await validateGeminiApiKey(apiKey);

        if (source === 'admin') {
            const existingKey = await ApiKey.findOne({ apiKey });
            if (existingKey) {
                return res.status(400).json({ error: 'API key already exists in admin collection' });
            }

            const newKey = new ApiKey({
                keyName: description || `Admin-Key-${Date.now()}`,
                apiKey,
                description: description || '',
                status: validation.isValid ? 'active' : 'deactivated',
                isActive: validation.isValid,
                lastValidated: new Date(),
                validationError: validation.error
            });

            await newKey.save();
        } else {
            const existingKey = await DonatedApiKey.findOne({ apiKey });
            if (existingKey) {
                return res.status(400).json({ error: 'API key already exists in donated collection' });
            }

            const newKey = new DonatedApiKey({
                apiKey,
                donorEmail: description || 'admin-added',
                status: validation.isValid ? 'active' : 'deactivated',
                isActive: validation.isValid,
                isValidated: validation.isValid,
                lastValidated: new Date(),
                validationError: validation.error
            });

            await newKey.save();
        }

        res.json({
            message: 'API key added successfully',
            isValid: validation.isValid,
            error: validation.error
        });
    } catch (error) {
        console.error('Add API key error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Validate specific API key
app.post('/api/admin/api-keys/:keyId/validate', authenticateToken, async (req, res) => {
    try {
        const { keyId } = req.params;

        let key = await ApiKey.findById(keyId);
        let isAdmin = true;

        if (!key) {
            key = await DonatedApiKey.findById(keyId);
            isAdmin = false;
        }

        if (!key) {
            return res.status(404).json({ error: 'API key not found' });
        }

        const validation = await validateGeminiApiKey(key.apiKey);

        const updateData = {
            status: validation.isValid ? 'active' : 'deactivated',
            isActive: validation.isValid,
            lastValidated: new Date(),
            validationError: validation.error
        };

        if (isAdmin) {
            await ApiKey.findByIdAndUpdate(keyId, updateData);
        } else {
            updateData.isValidated = validation.isValid;
            await DonatedApiKey.findByIdAndUpdate(keyId, updateData);
        }

        res.json({
            message: 'Validation complete',
            isValid: validation.isValid,
            error: validation.error
        });
    } catch (error) {
        console.error('Validate API key error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Validate all API keys
app.post('/api/admin/api-keys/validate-all', authenticateToken, async (req, res) => {
    try {
        const [adminKeys, donatedKeys] = await Promise.all([
            ApiKey.find(),
            DonatedApiKey.find()
        ]);

        let validated = 0;
        let active = 0;
        let deactivated = 0;

        // Validate admin keys
        for (const key of adminKeys) {
            const validation = await validateGeminiApiKey(key.apiKey);
            validated++;

            const updateData = {
                status: validation.isValid ? 'active' : 'deactivated',
                isActive: validation.isValid,
                lastValidated: new Date(),
                validationError: validation.error
            };

            await ApiKey.findByIdAndUpdate(key._id, updateData);

            if (validation.isValid) {
                active++;
            } else {
                deactivated++;
            }
        }

        // Validate donated keys
        for (const key of donatedKeys) {
            const validation = await validateGeminiApiKey(key.apiKey);
            validated++;

            const updateData = {
                status: validation.isValid ? 'active' : 'deactivated',
                isActive: validation.isValid,
                isValidated: validation.isValid,
                lastValidated: new Date(),
                validationError: validation.error
            };

            await DonatedApiKey.findByIdAndUpdate(key._id, updateData);

            if (validation.isValid) {
                active++;
            } else {
                deactivated++;
            }
        }

        res.json({
            message: 'Bulk validation complete',
            validated,
            active,
            deactivated
        });
    } catch (error) {
        console.error('Validate all keys error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reactivate API key
app.post('/api/admin/api-keys/:keyId/reactivate', authenticateToken, async (req, res) => {
    try {
        const { keyId } = req.params;

        let key = await ApiKey.findById(keyId);
        let isAdmin = true;

        if (!key) {
            key = await DonatedApiKey.findById(keyId);
            isAdmin = false;
        }

        if (!key) {
            return res.status(404).json({ error: 'API key not found' });
        }

        const validation = await validateGeminiApiKey(key.apiKey);

        if (!validation.isValid) {
            return res.status(400).json({ 
                error: 'Cannot reactivate invalid key',
                validationError: validation.error
            });
        }

        const updateData = {
            status: 'active',
            isActive: true,
            lastValidated: new Date(),
            validationError: null
        };

        if (isAdmin) {
            await ApiKey.findByIdAndUpdate(keyId, updateData);
        } else {
            updateData.isValidated = true;
            await DonatedApiKey.findByIdAndUpdate(keyId, updateData);
        }

        res.json({ message: 'API key reactivated successfully' });
    } catch (error) {
        console.error('Reactivate API key error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete API key (unified)
app.delete('/api/admin/api-keys/:keyId', authenticateToken, async (req, res) => {
    try {
        const { keyId } = req.params;

        let deleted = await ApiKey.findByIdAndDelete(keyId);

        if (!deleted) {
            deleted = await DonatedApiKey.findByIdAndDelete(keyId);
        }

        if (!deleted) {
            return res.status(404).json({ error: 'API key not found' });
        }

        res.json({ message: 'API key deleted successfully' });
    } catch (error) {
        console.error('Delete API key error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========================================
// ADMIN UTILITY ROUTES
// ========================================

// Save admin settings
app.post('/api/admin/settings', authenticateToken, async (req, res) => {
    try {
        const { keyRotationInterval, serverTimeout } = req.body;
        res.json({ message: 'Settings saved successfully' });
    } catch (error) {
        console.error('Save settings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reset allocation counts
app.post('/api/admin/reset-allocation', authenticateToken, async (req, res) => {
    try {
        await Promise.all([
            ApiKey.updateMany({}, { allocationCount: 0 }),
            DonatedApiKey.updateMany({}, { allocationCount: 0 })
        ]);

        res.json({ message: 'Allocation counts reset successfully' });
    } catch (error) {
        console.error('Reset allocation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Clear inactive keys
app.delete('/api/admin/clear-inactive', authenticateToken, async (req, res) => {
    try {
        const [adminResult, donatedResult] = await Promise.all([
            ApiKey.deleteMany({ status: 'deactivated' }),
            DonatedApiKey.deleteMany({ status: 'deactivated' })
        ]);

        const deletedCount = adminResult.deletedCount + donatedResult.deletedCount;

        res.json({ 
            message: 'Inactive keys cleared successfully',
            deletedCount 
        });
    } catch (error) {
        console.error('Clear inactive keys error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Export data
app.get('/api/admin/export', authenticateToken, async (req, res) => {
    try {
        const [adminKeys, donatedKeys, users] = await Promise.all([
            ApiKey.find().select('-apiKey'),
            DonatedApiKey.find().select('-apiKey'),
            User.find().select('-password')
        ]);

        const exportData = {
            timestamp: new Date().toISOString(),
            adminKeys: adminKeys.map(key => ({
                keyName: key.keyName,
                status: key.status,
                usageCount: key.usageCount,
                allocationCount: key.allocationCount,
                lastUsed: key.lastUsed,
                description: key.description,
                createdAt: key.createdAt
            })),
            donatedKeys: donatedKeys.map(key => ({
                donorEmail: key.donorEmail,
                status: key.status,
                usageCount: key.usageCount,
                allocationCount: key.allocationCount,
                lastUsed: key.lastUsed,
                isValidated: key.isValidated,
                createdAt: key.createdAt
            })),
            users: users.map(user => ({
                email: user.email,
                isAdmin: user.isAdmin,
                createdAt: user.createdAt
            }))
        };

        res.json(exportData);
    } catch (error) {
        console.error('Export data error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Restart server (placeholder)
app.post('/api/admin/restart', authenticateToken, async (req, res) => {
    try {
        res.json({ message: 'Server restart initiated (feature not implemented in this demo)' });
    } catch (error) {
        console.error('Restart server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ========================================
// SERVER STARTUP
// ========================================

const PORT = process.env.PORT || SERVER_CONFIG.getDefaultPort();

// Function to find an available port
const findAvailablePort = (startPort) => {
    return new Promise((resolve, reject) => {
        const server = require('net').createServer();
        server.listen(startPort, (err) => {
            if (err) {
                server.close();
                findAvailablePort(startPort + 1).then(resolve).catch(reject);
            } else {
                const port = server.address().port;
                server.close(() => resolve(port));
            }
        });
        
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                server.close();
                findAvailablePort(startPort + 1).then(resolve).catch(reject);
            } else {
                reject(err);
            }
        });
    });
};

// Start server with available port
findAvailablePort(PORT).then((availablePort) => {
    // Set the current server port for tracking
    process.env.CURRENT_SERVER_PORT = availablePort;
    
    app.listen(availablePort, async () => {
        const timestamp = new Date().toISOString();
        console.log('\n' + '='.repeat(60));
        console.log(`[${timestamp}] 🚀 Kimaaka Server Started Successfully!`);
        console.log(`[${timestamp}] 🌐 Server running on port ${availablePort}`);
        console.log(`[${timestamp}] 📊 Admin panel (via server): http://localhost:${availablePort}/admin/admin.html`);
        console.log(`[${timestamp}] 📊 Admin panel (standalone): See admin-dashboard/README.md`);
        console.log(`[${timestamp}] 🔑 API endpoint: http://localhost:${availablePort}/api/gemini-key`);
        console.log(`[${timestamp}] 💝 Donation endpoint: http://localhost:${availablePort}/api/donate-key`);
        console.log(`[${timestamp}] 📋 Health check: http://localhost:${availablePort}/api/health`);
        console.log('='.repeat(60));
        console.log(`[${timestamp}] 👀 Monitoring all requests...`);
        console.log('');
    });
}).catch((error) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ Failed to find available port:`, error);
    process.exit(1);
});
