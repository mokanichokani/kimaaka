import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getRoundRobinApiKey, trackApiKeyAllocation, trackFailedRequest } from '@/lib/helpers';
import { addCorsHeaders, handleCors } from '@/lib/cors';

export async function GET(req: NextRequest) {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const timestamp = new Date().toISOString();
  const startTime = Date.now();
  console.log(`[${timestamp}] 🔑 API Key Request - Using round-robin allocation...`);
  
  try {
    await connectDB();
    const apiKey = await getRoundRobinApiKey();
    const maskedKey = `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`;
    
    const responseTime = Date.now() - startTime;
    
    // Track successful API key allocation
    await trackApiKeyAllocation(responseTime);
    
    console.log(`[${timestamp}] ✅ API Key Provided: ${maskedKey} (${responseTime}ms)`);
    
    const response = NextResponse.json({ geminiApiKey: apiKey });
    return addCorsHeaders(response);

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    // Track failed request
    await trackFailedRequest(error.message);
    
    console.error(`[${timestamp}] ❌ API Key Error:`, error.message);
    
    const response = NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    return addCorsHeaders(response);
  }
}

