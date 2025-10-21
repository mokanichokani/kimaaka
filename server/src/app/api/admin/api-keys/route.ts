import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { ApiKey, DonatedApiKey } from '@/lib/models';
import { authenticateToken } from '@/lib/auth';
import { validateGeminiApiKey } from '@/lib/helpers';
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
    
    const [adminKeys, donatedKeys] = await Promise.all([
      ApiKey.find().sort({ createdAt: -1 }),
      DonatedApiKey.find().sort({ createdAt: -1 })
    ]);

    const allKeys = [
      ...adminKeys.map(key => ({
        _id: key._id,
        apiKey: key.apiKey,
        status: key.status,
        usageCount: key.usageCount,
        allocationCount: key.allocationCount,
        lastUsed: key.lastUsed,
        lastValidated: key.lastValidated,
        description: key.description || key.keyName,
        source: 'admin',
        createdAt: key.createdAt
      })),
      ...donatedKeys.map(key => ({
        _id: key._id,
        apiKey: key.apiKey,
        status: key.status,
        usageCount: key.usageCount,
        allocationCount: key.allocationCount,
        lastUsed: key.lastUsed,
        lastValidated: key.lastValidated,
        description: `Donated by ${key.donorEmail}`,
        source: 'donated',
        createdAt: key.createdAt
      }))
    ];

    const response = NextResponse.json(allKeys);
    return addCorsHeaders(response);
  } catch (error: any) {
    console.error('Get API keys error:', error);
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
    const { apiKey, description, source = 'admin' } = await req.json();

    if (!apiKey) {
      const response = NextResponse.json({ error: 'API key is required' }, { status: 400 });
      return addCorsHeaders(response);
    }

    // Validate the API key
    const validation = await validateGeminiApiKey(apiKey);

    if (source === 'admin') {
      const existingKey = await ApiKey.findOne({ apiKey });
      if (existingKey) {
        const response = NextResponse.json({ error: 'API key already exists in admin collection' }, { status: 400 });
        return addCorsHeaders(response);
      }

      const newKey = new ApiKey({
        keyName: description || `Admin-Key-${Date.now()}`,
        apiKey,
        description: description || '',
        status: validation.isValid ? 'active' : 'deactivated',
        isActive: validation.isValid,
        lastValidated: new Date(),
        validationError: validation.error
      });

      await newKey.save();
    } else {
      const existingKey = await DonatedApiKey.findOne({ apiKey });
      if (existingKey) {
        const response = NextResponse.json({ error: 'API key already exists in donated collection' }, { status: 400 });
        return addCorsHeaders(response);
      }

      const newKey = new DonatedApiKey({
        apiKey,
        donorEmail: description || 'admin-added',
        status: validation.isValid ? 'active' : 'deactivated',
        isActive: validation.isValid,
        isValidated: validation.isValid,
        lastValidated: new Date(),
        validationError: validation.error
      });

      await newKey.save();
    }

    const response = NextResponse.json({
      message: 'API key added successfully',
      isValid: validation.isValid,
      error: validation.error
    });
    
    return addCorsHeaders(response);
  } catch (error: any) {
    console.error('Add API key error:', error);
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return addCorsHeaders(response);
  }
}
