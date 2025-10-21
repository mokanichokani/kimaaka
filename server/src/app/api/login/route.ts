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

    const user = await User.findOne({ email }).maxTimeMS(20000);
    if (!user) {
      const response = NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      return addCorsHeaders(response);
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      const response = NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      return addCorsHeaders(response);
    }

    const token = generateToken(
      { userId: user._id, email: user.email, isAdmin: user.isAdmin },
      '30d'
    );

    const response = NextResponse.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
    
    return addCorsHeaders(response);

  } catch (error: any) {
    console.error('Login error:', error);
    
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
    
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return addCorsHeaders(response);
  }
}

