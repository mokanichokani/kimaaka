import { NextRequest, NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';
import { addCorsHeaders, handleCors } from '@/lib/cors';

export async function GET(req: NextRequest) {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const { user, error } = authenticateToken(req);
  
  if (error || !user) {
    const response = NextResponse.json({ error: error || 'Authentication failed' }, { status: 401 });
    return addCorsHeaders(response);
  }

  const response = NextResponse.json({ 
    message: 'Token is valid',
    user: {
      id: user.userId,
      email: user.email,
      isAdmin: user.isAdmin
    }
  });
  
  return addCorsHeaders(response);
}

