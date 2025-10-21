import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

// User Schema
export interface IUser extends Document {
  email: string;
  password: string;
  isAdmin: boolean;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
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
export interface IAdminUser extends Document {
  username: string;
  password: string;
  role: 'admin' | 'viewer';
  isDefault: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  createdBy: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const adminUserSchema = new Schema<IAdminUser>({
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
export interface IApiKey extends Document {
  keyName: string;
  apiKey: string;
  status: 'active' | 'deactivated';
  isActive: boolean;
  usageCount: number;
  allocationCount: number;
  lastUsed: Date | null;
  lastValidated: Date | null;
  validationError: string | null;
  description: string;
  source: 'admin' | 'donated';
  createdAt: Date;
}

const apiKeySchema = new Schema<IApiKey>({
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
export interface IDonatedApiKey extends Document {
  apiKey: string;
  donorEmail: string;
  status: 'active' | 'deactivated';
  isActive: boolean;
  usageCount: number;
  allocationCount: number;
  lastUsed: Date | null;
  isValidated: boolean;
  lastValidated: Date | null;
  validationError: string | null;
  source: string;
  createdAt: Date;
}

const donatedApiKeySchema = new Schema<IDonatedApiKey>({
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

// Server Usage Tracking Schema
export interface IServerUsage extends Document {
  serverUrl: string;
  port: number;
  totalAllocations: number;
  totalApiCalls: number;
  totalLoadHandled: number;
  successfulRequests: number;
  failedRequests: number;
  lastUsed: Date | null;
  isOnline: boolean;
  averageResponseTime: number;
  dailyStats: Array<{
    date: Date;
    allocations: number;
    apiCalls: number;
    loadHandled: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
  }>;
  hourlyStats: Array<{
    timestamp: Date;
    allocations: number;
    apiCalls: number;
    responseTime: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const serverUsageSchema = new Schema<IServerUsage>({
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

// Update timestamp on save
serverUsageSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Compare password methods
userSchema.methods.comparePassword = async function(candidatePassword: string) {
  return await bcrypt.compare(candidatePassword, this.password);
};

adminUserSchema.methods.comparePassword = async function(candidatePassword: string) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Create models
export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
export const AdminUser = mongoose.models.AdminUser || mongoose.model<IAdminUser>('AdminUser', adminUserSchema);
export const ApiKey = mongoose.models.ApiKey || mongoose.model<IApiKey>('ApiKey', apiKeySchema);
export const DonatedApiKey = mongoose.models.DonatedApiKey || mongoose.model<IDonatedApiKey>('DonatedApiKey', donatedApiKeySchema);
export const ServerUsage = mongoose.models.ServerUsage || mongoose.model<IServerUsage>('ServerUsage', serverUsageSchema);

