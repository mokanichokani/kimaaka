import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { AdminUser } from '@/lib/models';
import { authenticateToken } from '@/lib/auth';
import { addCorsHeaders, handleCors } from '@/lib/cors';

export async function GET(req: NextRequest) {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { user, error } = authenticateToken(req);
    
    if (error || !user) {
      const response = NextResponse.json({ error: error || 'Authentication failed' }, { status: 401 });
      return addCorsHeaders(response);
    }
    
    if (user.type !== 'admin') {
      const response = NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      return addCorsHeaders(response);
    }
    
    await connectDB();
    const adminUsers = await AdminUser.find().select('-password').sort({ createdAt: -1 });
    
    const response = NextResponse.json(adminUsers);
    return addCorsHeaders(response);
    
  } catch (error: any) {
    console.error('Get admin users error:', error);
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return addCorsHeaders(response);
  }
}

export async function POST(req: NextRequest) {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { user, error } = authenticateToken(req);
    
    if (error || !user) {
      const response = NextResponse.json({ error: error || 'Authentication failed' }, { status: 401 });
      return addCorsHeaders(response);
    }
    
    if (user.type !== 'admin') {
      const response = NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      return addCorsHeaders(response);
    }
    
    await connectDB();
    const { username, password, role = 'admin' } = await req.json();
    
    if (!username || !password) {
      const response = NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
      return addCorsHeaders(response);
    }
    
    const existingUser = await AdminUser.findOne({ username });
    if (existingUser) {
      const response = NextResponse.json({ error: 'Username already exists' }, { status: 400 });
      return addCorsHeaders(response);
    }
    
    const newAdminUser = new AdminUser({
      username,
      password,
      role,
      createdBy: user.username || 'admin'
    });
    
    await newAdminUser.save();
    
    console.log(`Admin user created: ${username} by ${user.username}`);
    
    const response = NextResponse.json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        id: newAdminUser._id,
        username: newAdminUser.username,
        role: newAdminUser.role,
        createdAt: newAdminUser.createdAt
      }
    }, { status: 201 });
    
    return addCorsHeaders(response);
    
  } catch (error: any) {
    console.error('Create admin user error:', error);
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return addCorsHeaders(response);
  }
}

