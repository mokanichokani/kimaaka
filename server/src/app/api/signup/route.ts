import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import { generateToken } from '@/lib/auth';
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

    if (password.length < 6) {
      const response = NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
      return addCorsHeaders(response);
    }

    const existingUser = await User.findOne({ email }).maxTimeMS(20000);
    if (existingUser) {
      const response = NextResponse.json({ error: 'User already exists with this email' }, { status: 400 });
      return addCorsHeaders(response);
    }

    const user = new User({ email, password });
    await user.save();

    const token = generateToken(
      { userId: user._id, email: user.email, isAdmin: user.isAdmin },
      '30d'
    );

    const response = NextResponse.json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        isAdmin: user.isAdmin
      }
    }, { status: 201 });
    
    return addCorsHeaders(response);

  } catch (error: any) {
    console.error('Signup error:', error);
    
    if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
      const response = NextResponse.json({ 
        error: 'Database connection timeout. Please try again in a moment.',
        details: 'The server is experiencing connectivity issues with the database.'
      }, { status: 503 });
      return addCorsHeaders(response);
    }
    
    if (error.name === 'MongoServerSelectionError') {
      const response = NextResponse.json({ 
        error: 'Database server unavailable. Please try again later.',
        details: 'Cannot connect to the database server.'
      }, { status: 503 });
      return addCorsHeaders(response);
    }
    
    if (error.code === 11000) {
      const response = NextResponse.json({ error: 'User already exists with this email' }, { status: 400 });
      return addCorsHeaders(response);
    }
    
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return addCorsHeaders(response);
  }
}

