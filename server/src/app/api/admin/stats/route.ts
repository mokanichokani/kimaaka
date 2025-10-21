import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { ApiKey, DonatedApiKey, User, ServerUsage } from '@/lib/models';
import { authenticateToken } from '@/lib/auth';
import { getCurrentServerPort } from '@/lib/helpers';
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
    
    const [
      totalApiKeysCount,
      activeApiKeysCount,
      donatedApiKeysCount,
      totalDonatedKeysCount,
      totalUsers,
      adminKeys,
      donatedKeys,
      serverUsage
    ] = await Promise.all([
      ApiKey.countDocuments(),
      ApiKey.countDocuments({ status: 'active' }),
      DonatedApiKey.countDocuments({ status: 'active' }),
      DonatedApiKey.countDocuments(),
      User.countDocuments(),
      ApiKey.find({ status: 'active' }).select('usageCount allocationCount lastUsed'),
      DonatedApiKey.find({ status: 'active' }).select('usageCount allocationCount lastUsed'),
      ServerUsage.findOne({ port: getCurrentServerPort() })
    ]);

    // Calculate total API calls from all keys
    const adminTotalCalls = adminKeys.reduce((sum, key) => sum + (key.usageCount || 0), 0);
    const donatedTotalCalls = donatedKeys.reduce((sum, key) => sum + (key.usageCount || 0), 0);
    const totalApiCalls = adminTotalCalls + donatedTotalCalls;

    // Calculate total allocations from all keys
    const adminTotalAllocations = adminKeys.reduce((sum, key) => sum + (key.allocationCount || 0), 0);
    const donatedTotalAllocations = donatedKeys.reduce((sum, key) => sum + (key.allocationCount || 0), 0);
    const totalAllocations = adminTotalAllocations + donatedTotalAllocations;

    // Server-specific statistics
    const serverStats = serverUsage ? {
      totalServerAllocations: serverUsage.totalAllocations,
      totalServerApiCalls: serverUsage.totalApiCalls,
      successfulRequests: serverUsage.successfulRequests,
      failedRequests: serverUsage.failedRequests,
      averageResponseTime: serverUsage.averageResponseTime,
      lastUsed: serverUsage.lastUsed,
      serverUptime: Math.floor(process.uptime()),
      isOnline: serverUsage.isOnline
    } : {
      totalServerAllocations: 0,
      totalServerApiCalls: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastUsed: null,
      serverUptime: Math.floor(process.uptime()),
      isOnline: true
    };

    // Calculate success rate
    const totalRequests = serverStats.successfulRequests + serverStats.failedRequests;
    const successRate = totalRequests > 0 ? 
      ((serverStats.successfulRequests / totalRequests) * 100).toFixed(1) : '100.0';

    // Most recent API key usage
    const allKeys = [...adminKeys, ...donatedKeys];
    const mostRecentUsage = allKeys
      .filter(key => key.lastUsed)
      .sort((a, b) => new Date(b.lastUsed!).getTime() - new Date(a.lastUsed!).getTime())[0];

    const response = NextResponse.json({
      // Basic counts
      totalApiKeys: totalApiKeysCount + totalDonatedKeysCount,
      activeApiKeys: activeApiKeysCount + donatedApiKeysCount,
      donatedApiKeys: donatedApiKeysCount,
      totalUsers,
      
      // API call statistics
      totalApiCalls,
      adminApiCalls: adminTotalCalls,
      donatedApiCalls: donatedTotalCalls,
      
      // Allocation statistics
      totalAllocations,
      adminAllocations: adminTotalAllocations,
      donatedAllocations: donatedTotalAllocations,
      
      // Server statistics
      ...serverStats,
      successRate,
      
      // Usage metadata
      mostRecentUsage: mostRecentUsage ? {
        timestamp: mostRecentUsage.lastUsed,
        timeAgo: new Date().getTime() - new Date(mostRecentUsage.lastUsed!).getTime()
      } : null,
      
      // Current server info
      currentServerPort: getCurrentServerPort(),
      lastUpdated: new Date().toISOString()
    });
    
    return addCorsHeaders(response);
  } catch (error: any) {
    console.error('Admin stats error:', error);
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return addCorsHeaders(response);
  }
}
