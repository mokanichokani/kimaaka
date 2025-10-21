import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { ApiKey, DonatedApiKey, User } from '@/lib/models';
import { authenticateToken } from '@/lib/auth';
import { addCorsHeaders, handleCors } from '@/lib/cors';

interface Activity {
  type: string;
  action: string;
  details: string;
  timestamp: Date;
  source: string;
  keyId?: string;
  userId?: string;
}

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
    
    // Get recent activities from API keys and users
    const [recentApiKeys, recentDonatedKeys, recentUsers] = await Promise.all([
      ApiKey.find()
        .sort({ lastUsed: -1, createdAt: -1 })
        .limit(10)
        .select('apiKey status usageCount allocationCount lastUsed createdAt description keyName'),
      DonatedApiKey.find()
        .sort({ lastUsed: -1, createdAt: -1 })
        .limit(10)
        .select('apiKey status usageCount allocationCount lastUsed createdAt donorEmail'),
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('email createdAt lastLogin')
    ]);

    const activities: Activity[] = [];

    // Add API key activities
    recentApiKeys.forEach(key => {
      if (key.lastUsed) {
        activities.push({
          type: 'api_usage',
          action: `API key used: ${key.description || key.keyName || 'Admin Key'}`,
          details: `${key.usageCount || 0} calls, ${key.allocationCount || 0} allocations`,
          timestamp: key.lastUsed,
          source: 'admin_key',
          keyId: key._id
        });
      }
      
      // Add creation activity
      activities.push({
        type: 'key_created',
        action: `API key created: ${key.description || key.keyName || 'Admin Key'}`,
        details: `Status: ${key.status}`,
        timestamp: key.createdAt,
        source: 'admin_key',
        keyId: key._id
      });
    });

    // Add donated key activities
    recentDonatedKeys.forEach(key => {
      if (key.lastUsed) {
        activities.push({
          type: 'api_usage',
          action: `Donated API key used by ${key.donorEmail}`,
          details: `${key.usageCount || 0} calls, ${key.allocationCount || 0} allocations`,
          timestamp: key.lastUsed,
          source: 'donated_key',
          keyId: key._id
        });
      }
      
      // Add donation activity
      activities.push({
        type: 'key_donated',
        action: `API key donated by ${key.donorEmail}`,
        details: `Status: ${key.status}`,
        timestamp: key.createdAt,
        source: 'donated_key',
        keyId: key._id
      });
    });

    // Add user activities
    recentUsers.forEach(user => {
      activities.push({
        type: 'user_registered',
        action: `New user registered: ${user.email}`,
        details: `Last login: ${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}`,
        timestamp: user.createdAt,
        source: 'user',
        userId: user._id
      });
    });

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Limit to 20 most recent activities
    const recentActivities = activities.slice(0, 20);

    // Add relative time information
    const now = new Date();
    const activitiesWithTimeAgo = recentActivities.map(activity => ({
      ...activity,
      timeAgo: now.getTime() - new Date(activity.timestamp).getTime(),
      timeAgoText: getTimeAgoText(now.getTime() - new Date(activity.timestamp).getTime())
    }));

    const response = NextResponse.json(activitiesWithTimeAgo);
    return addCorsHeaders(response);
  } catch (error: any) {
    console.error('Recent activity error:', error);
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return addCorsHeaders(response);
  }
}

function getTimeAgoText(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}
