import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET!;

export interface JWTPayload {
  userId: string;
  email?: string;
  username?: string;
  isAdmin?: boolean;
  role?: string;
  type?: string;
}

// JWT middleware for API routes
export const authenticateToken = (req: NextRequest): { user: JWTPayload | null; error: string | null } => {
  const authHeader = req.headers.get('authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return { user: null, error: 'Access token required' };
  }

  try {
    const user = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return { user, error: null };
  } catch (err) {
    return { user: null, error: 'Invalid or expired token' };
  }
};

// Admin middleware
export const authenticateAdmin = (req: NextRequest): { user: JWTPayload | null; error: string | null } => {
  const { user, error } = authenticateToken(req);
  
  if (error) {
    return { user: null, error };
  }
  
  if (!user) {
    return { user: null, error: 'User not found' };
  }
  
  // Check for both old style (isAdmin) and new style (type: 'admin') tokens
  if (!user.isAdmin && user.type !== 'admin') {
    return { user: null, error: 'Admin access required' };
  }
  
  return { user, error: null };
};

// Generate JWT token
export const generateToken = (payload: JWTPayload, expiresIn: string = '30d'): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
};

