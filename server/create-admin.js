const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const adminUserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, minlength: 4 },
    role: { type: String, enum: ['admin', 'viewer'], default: 'admin' },
    isDefault: { type: Boolean, default: false },
    lastLogin: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String, default: 'system' }
});

adminUserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

const AdminUser = mongoose.model('AdminUser', adminUserSchema);

async function createDefaultAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const existingAdmin = await AdminUser.findOne({ isDefault: true });
        if (existingAdmin) {
            console.log('Default admin already exists:', existingAdmin.username);
            process.exit(0);
        }
        
        const defaultAdmin = new AdminUser({
            username: 'mokani',
            password: 'chokani',
            role: 'admin',
            isDefault: true,
            createdBy: 'system'
        });
        
        await defaultAdmin.save();
        console.log('Default admin user created successfully!');
        console.log('Username: mokani');
        console.log('Password: chokani');
        console.log('Please change the password after first login.');
        
    } catch (error) {
        console.error('Error creating default admin:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

createDefaultAdmin();
