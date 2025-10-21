import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { AdminUser } from '@/lib/models';
import { generateToken } from '@/lib/auth';
import { addCorsHeaders, handleCors } from '@/lib/cors';

export async function POST(req: NextRequest) {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const timestamp = new Date().toISOString();
  
  try {
    await connectDB();
    const { username, password } = await req.json();
    
    if (!username || !password) {
      const response = NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
      return addCorsHeaders(response);
    }
    
    console.log(`[${timestamp}] 🔐 Admin login attempt for username: ${username}`);
    
    const adminUser = await AdminUser.findOne({ username });
    
    if (!adminUser) {
      console.log(`[${timestamp}] ❌ Admin user not found: ${username}`);
      const response = NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      return addCorsHeaders(response);
    }
    
    const isPasswordValid = await adminUser.comparePassword(password);
    
    if (!isPasswordValid) {
      console.log(`[${timestamp}] ❌ Invalid password for admin user: ${username}`);
      const response = NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      return addCorsHeaders(response);
    }
    
    await AdminUser.findByIdAndUpdate(adminUser._id, { lastLogin: new Date() });
    
    const token = generateToken(
      { 
        userId: adminUser._id, 
        username: adminUser.username, 
        role: adminUser.role,
        type: 'admin'
      },
      '24h'
    );
    
    console.log(`[${timestamp}] ✅ Admin login successful: ${username}`);
    
    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: adminUser._id,
        username: adminUser.username,
        role: adminUser.role,
        lastLogin: adminUser.lastLogin
      }
    });
    
    return addCorsHeaders(response);
    
  } catch (error: any) {
    console.error(`[${timestamp}] ❌ Admin login error:`, error);
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return addCorsHeaders(response);
  }
}

