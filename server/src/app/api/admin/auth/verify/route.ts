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
    const adminUser = await AdminUser.findById(user.userId).select('-password');
    
    if (!adminUser) {
      const response = NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
      return addCorsHeaders(response);
    }
    
    const response = NextResponse.json({
      success: true,
      user: {
        id: adminUser._id,
        username: adminUser.username,
        role: adminUser.role,
        lastLogin: adminUser.lastLogin
      }
    });
    
    return addCorsHeaders(response);
    
  } catch (error: any) {
    console.error('Admin verify error:', error);
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return addCorsHeaders(response);
  }
}

