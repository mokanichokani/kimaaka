import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { ApiKey, DonatedApiKey } from '@/lib/models';
import { authenticateToken } from '@/lib/auth';
import { validateGeminiApiKey } from '@/lib/helpers';
import { addCorsHeaders, handleCors } from '@/lib/cors';

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
    
    // Get all active API keys
    const [adminKeys, donatedKeys] = await Promise.all([
      ApiKey.find({ status: 'active' }),
      DonatedApiKey.find({ status: 'active' })
    ]);

    const allKeys = [
      ...adminKeys.map(key => ({ ...key.toObject(), source: 'admin' })),
      ...donatedKeys.map(key => ({ ...key.toObject(), source: 'donated' }))
    ];

    let validated = 0;
    let deactivated = 0;
    let active = 0;
    const results = [];

    // Validate each key
    for (const key of allKeys) {
      try {
        const validation = await validateGeminiApiKey(key.apiKey);
        
        if (validation.isValid) {
          // Update last validated timestamp
          if (key.source === 'admin') {
            await ApiKey.findByIdAndUpdate(key._id, { 
              lastValidated: new Date(),
              status: 'active'
            });
          } else {
            await DonatedApiKey.findByIdAndUpdate(key._id, { 
              lastValidated: new Date(),
              status: 'active'
            });
          }
          active++;
          results.push({
            keyId: key._id,
            source: key.source,
            status: 'valid',
            message: 'API key is valid'
          });
        } else {
          // Deactivate invalid key
          if (key.source === 'admin') {
            await ApiKey.findByIdAndUpdate(key._id, { 
              status: 'inactive',
              lastValidated: new Date()
            });
          } else {
            await DonatedApiKey.findByIdAndUpdate(key._id, { 
              status: 'inactive',
              lastValidated: new Date()
            });
          }
          deactivated++;
          results.push({
            keyId: key._id,
            source: key.source,
            status: 'invalid',
            message: validation.error || 'API key validation failed'
          });
        }
        validated++;
      } catch (error: any) {
        console.error(`Error validating key ${key._id}:`, error);
        results.push({
          keyId: key._id,
          source: key.source,
          status: 'error',
          message: 'Validation error: ' + (error.message || 'Unknown error')
        });
        validated++;
      }
    }

    const response = NextResponse.json({
      validated,
      active,
      deactivated,
      total: allKeys.length,
      results,
      lastValidated: new Date().toISOString()
    });
    
    return addCorsHeaders(response);
  } catch (error: any) {
    console.error('Validate all keys error:', error);
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return addCorsHeaders(response);
  }
}
