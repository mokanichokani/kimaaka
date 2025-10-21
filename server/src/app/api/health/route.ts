import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { ApiKey, DonatedApiKey, User, ServerUsage } from '@/lib/models';
import { getCurrentServerPort } from '@/lib/helpers';
import { addCorsHeaders, handleCors } from '@/lib/cors';

export async function GET(req: NextRequest) {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    await connectDB();
    
    const dbState = connectDB().then(() => 1).catch(() => 0);
    const dbStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    const [adminKeysCount, donatedKeysCount, totalUsers, serverUsage] = await Promise.all([
      ApiKey.countDocuments({ status: 'active' }),
      DonatedApiKey.countDocuments({ status: 'active' }),
      User.countDocuments(),
      ServerUsage.findOne({ serverUrl: process.env.RENDER_EXTERNAL_URL || `http://localhost:${getCurrentServerPort()}` })
    ]);

    const dbConnected = await dbState;
    
    if (dbConnected === 1) {
      // Calculate additional statistics
      const memoryUsage = process.memoryUsage();
      const memoryUsageMB = {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      };
      
      // Server usage statistics
      const usageStats = serverUsage ? {
        totalAllocations: serverUsage.totalAllocations,
        totalApiCalls: serverUsage.totalApiCalls,
        successfulRequests: serverUsage.successfulRequests,
        failedRequests: serverUsage.failedRequests,
        averageResponseTime: serverUsage.averageResponseTime,
        lastUsed: serverUsage.lastUsed,
        uptime: Math.floor(process.uptime())
      } : null;
      
      const response = NextResponse.json({ 
        status: 'healthy', 
        database: 'connected',
        uptime: process.uptime(),
        memory: memoryUsage,
        memoryMB: memoryUsageMB,
        adminKeysCount,
        donatedKeysCount,
        totalUsers,
        apiKeysCount: adminKeysCount + donatedKeysCount,
        serverStats: usageStats,
        nodeVersion: process.version,
        platform: process.platform,
        timestamp: new Date().toISOString()
      });
      
      return addCorsHeaders(response);
    } else {
      const response = NextResponse.json({ 
        status: 'unhealthy', 
        database: dbStates[dbConnected as keyof typeof dbStates] || 'unknown',
        timestamp: new Date().toISOString()
      }, { status: 503 });
      
      return addCorsHeaders(response);
    }
  } catch (error: any) {
    console.error('Health check error:', error);
    const response = NextResponse.json({ 
      status: 'unhealthy', 
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 503 });
    
    return addCorsHeaders(response);
  }
}

