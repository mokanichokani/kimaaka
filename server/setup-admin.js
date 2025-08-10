#!/usr/bin/env node

// setup-admin.js - Script to create initial admin user and API keys for testing

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Schemas (copy from server.js)
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    isAdmin: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const apiKeySchema = new mongoose.Schema({
    keyName: { type: String, required: true, unique: true },
    apiKey: { type: String, required: true },
    status: { type: String, enum: ['active', 'deactivated'], default: 'active' },
    isActive: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 },
    allocationCount: { type: Number, default: 0 },
    lastUsed: { type: Date, default: null },
    lastValidated: { type: Date, default: null },
    validationError: { type: String, default: null },
    description: { type: String, default: '' },
    source: { type: String, enum: ['admin', 'donated'], default: 'admin' },
    createdAt: { type: Date, default: Date.now }
});

const adminUserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, minlength: 4 },
    role: { type: String, enum: ['admin', 'viewer'], default: 'admin' },
    isDefault: { type: Boolean, default: false },
    lastLogin: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String, default: 'system' }
});

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

const User = mongoose.model('User', userSchema);
const ApiKey = mongoose.model('ApiKey', apiKeySchema);
const AdminUser = mongoose.model('AdminUser', adminUserSchema);

async function setupAdmin() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Create admin user
        console.log('👤 Creating admin user...');
        try {
            const adminUser = new User({
                email: 'admin@kimaaka.com',
                password: 'admin123',
                isAdmin: true
            });
            await adminUser.save();
            console.log('✅ Admin user created: admin@kimaaka.com / admin123');
        } catch (error) {
            if (error.code === 11000) {
                console.log('ℹ️ Admin user already exists');
            } else {
                throw error;
            }
        }

        // Create default admin dashboard user
        console.log('🔐 Creating admin dashboard user...');
        try {
            const defaultAdminUser = new AdminUser({
                username: 'mokani',
                password: 'chokani',
                role: 'admin',
                isDefault: true,
                createdBy: 'system'
            });
            await defaultAdminUser.save();
            console.log('✅ Admin dashboard user created: mokani / chokani');
        } catch (error) {
            if (error.code === 11000) {
                console.log('ℹ️ Admin dashboard user already exists');
            } else {
                throw error;
            }
        }

        // Create sample API keys for testing
        console.log('🔑 Creating sample API keys...');
        
        const sampleKeys = [
            {
                keyName: 'Test-Key-1',
                apiKey: 'test-key-1-' + Math.random().toString(36).substring(7),
                description: 'Test API Key 1 - For development',
                status: 'active'
            },
            {
                keyName: 'Test-Key-2', 
                apiKey: 'test-key-2-' + Math.random().toString(36).substring(7),
                description: 'Test API Key 2 - For development',
                status: 'active'
            },
            {
                keyName: 'Test-Key-3',
                apiKey: 'test-key-3-' + Math.random().toString(36).substring(7), 
                description: 'Test API Key 3 - Deactivated for testing',
                status: 'deactivated'
            }
        ];

        for (const keyData of sampleKeys) {
            try {
                const apiKey = new ApiKey(keyData);
                await apiKey.save();
                console.log(`✅ Created API key: ${keyData.keyName}`);
            } catch (error) {
                if (error.code === 11000) {
                    console.log(`ℹ️ API key ${keyData.keyName} already exists`);
                } else {
                    throw error;
                }
            }
        }

        console.log('\n🎉 Setup complete!');
        console.log('📊 Admin Panel: http://localhost:3001/admin/admin.html');
        console.log('👤 API Login: admin@kimaaka.com / admin123');
        console.log('🔐 Dashboard Login: mokani / chokani');
        console.log('\n⚠️ IMPORTANT: Replace test API keys with real Gemini API keys!');
        
    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit(0);
    }
}

// Run setup
setupAdmin();
