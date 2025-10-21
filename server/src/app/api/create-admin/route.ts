import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import { addCorsHeaders, handleCors } from '@/lib/cors';

export async function POST(req: NextRequest) {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    await connectDB();
    const { email, password } = await req.json();

    if (!email || !password) {
      const response = NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      return addCorsHeaders(response);
    }

    const existingAdmin = await User.findOne({ isAdmin: true });
    if (existingAdmin) {
      const response = NextResponse.json({ error: 'Admin already exists' }, { status: 400 });
      return addCorsHeaders(response);
    }

    const adminUser = new User({
      email,
      password,
      isAdmin: true
    });

    await adminUser.save();

    const response = NextResponse.json({
      message: 'Admin user created successfully',
      user: {
        id: adminUser._id,
        email: adminUser.email,
        isAdmin: adminUser.isAdmin
      }
    }, { status: 201 });
    
    return addCorsHeaders(response);

  } catch (error: any) {
    console.error('Create admin error:', error);
    if (error.code === 11000) {
      const response = NextResponse.json({ error: 'User already exists with this email' }, { status: 400 });
      return addCorsHeaders(response);
    }
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return addCorsHeaders(response);
  }
}

