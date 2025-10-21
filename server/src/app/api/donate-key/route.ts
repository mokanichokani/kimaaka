import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { DonatedApiKey, ApiKey } from '@/lib/models';
import { validateGeminiApiKey } from '@/lib/helpers';
import { addCorsHeaders, handleCors } from '@/lib/cors';

export async function POST(req: NextRequest) {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const timestamp = new Date().toISOString();
  const { apiKey, donorEmail } = await req.json();
  
  console.log(`[${timestamp}] 💝 API Key Donation Request`);
  console.log(`[${timestamp}] - Donor Email: ${donorEmail || 'anonymous'}`);
  console.log(`[${timestamp}] - API Key: ${apiKey ? `${apiKey.substring(0, 8)}...` : 'missing'}`);

  try {
    await connectDB();

    if (!apiKey) {
      console.log(`[${timestamp}] ❌ Donation Failed: No API key provided`);
      const response = NextResponse.json({ error: 'API key is required' }, { status: 400 });
      return addCorsHeaders(response);
    }

    // Check if this API key already exists in either collection
    console.log(`[${timestamp}] 🔍 Checking for duplicate keys...`);
    const existingAdminKey = await ApiKey.findOne({ apiKey });
    const existingDonatedKey = await DonatedApiKey.findOne({ apiKey });
    
    if (existingAdminKey || existingDonatedKey) {
      console.log(`[${timestamp}] ❌ Donation Failed: Duplicate key detected`);
      const response = NextResponse.json({ error: 'This API key has already been donated' }, { status: 400 });
      return addCorsHeaders(response);
    }

    // Validate the API key
    console.log(`[${timestamp}] 🔄 Validating API key with Gemini API...`);
    const validation = await validateGeminiApiKey(apiKey);
    
    if (!validation.isValid) {
      console.log(`[${timestamp}] ❌ Donation Failed: Invalid API key - ${validation.error}`);
      const response = NextResponse.json({ 
        error: 'Invalid API key', 
        details: validation.error 
      }, { status: 400 });
      return addCorsHeaders(response);
    }

    // Save the validated API key
    console.log(`[${timestamp}] 💾 Saving validated API key to database...`);
    const donatedKey = new DonatedApiKey({
      apiKey,
      donorEmail: donorEmail || 'anonymous',
      isValidated: true,
      isActive: true
    });

    await donatedKey.save();
    console.log(`[${timestamp}] ✅ Donation Successful! Key saved with ID: ${donatedKey._id}`);

    const response = NextResponse.json({
      message: 'API key validated and added successfully! Thank you for your donation.',
      success: true
    }, { status: 201 });
    
    return addCorsHeaders(response);

  } catch (error: any) {
    console.error(`[${timestamp}] ❌ Donation Error:`, error.message);
    
    if (error.code === 11000) {
      console.log(`[${timestamp}] ❌ Donation Failed: Duplicate key error`);
      const response = NextResponse.json({ error: 'This API key has already been donated' }, { status: 400 });
      return addCorsHeaders(response);
    }
    
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return addCorsHeaders(response);
  }
}

