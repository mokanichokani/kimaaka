const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// Admin User Schema
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

// Hash password before saving
adminUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

const AdminUser = mongoose.model('AdminUser', adminUserSchema);

async function setupAdmin() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    console.log('✅ Connected to MongoDB');

    // Check if any admin exists
    const existingAdmin = await AdminUser.findOne({});
    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists. Skipping setup.');
      console.log(`Existing admin: ${existingAdmin.username}`);
      return;
    }

    // Create default admin
    const defaultAdmin = new AdminUser({
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      isDefault: true,
      createdBy: 'system'
    });

    await defaultAdmin.save();
    console.log('✅ Default admin user created successfully!');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('⚠️  Please change the default password after first login!');

  } catch (error) {
    console.error('❌ Error setting up admin user:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

setupAdmin();

