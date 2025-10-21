import { ApiKey, DonatedApiKey, ServerUsage } from './models';

// Helper function to validate Gemini API key
export const validateGeminiApiKey = async (apiKey: string) => {
  const timestamp = new Date().toISOString();
  const maskedKey = `${apiKey.substring(0, 8)}...`;
  
  try {
    console.log(`[${timestamp}] 🧪 Testing API key ${maskedKey} with Gemini API...`);
    
    const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        "contents": [{
          "parts": [{ "text": "Test" }]
        }],
        "generationConfig": {
          "temperature": 0.1,
          "maxOutputTokens": 10
        }
      })
    });
    
    if (testResponse.ok) {
      const responseData = await testResponse.json();
      console.log(`[${timestamp}] ✅ API key ${maskedKey} validation successful`);
      return { isValid: true, error: null };
    } else {
      const errorData = await testResponse.json();
      const errorMsg = errorData.error?.message || `HTTP ${testResponse.status}: ${testResponse.statusText}`;
      console.log(`[${timestamp}] ❌ API key ${maskedKey} validation failed: ${errorMsg}`);
      return { 
        isValid: false, 
        error: errorMsg
      };
    }
  } catch (error: any) {
    const errorMsg = `Network error: ${error.message}`;
    console.log(`[${timestamp}] ❌ API key ${maskedKey} validation error: ${errorMsg}`);
    return { 
      isValid: false, 
      error: errorMsg
    };
  }
};

// Helper function to get API key using round-robin allocation with validation
export const getRoundRobinApiKey = async (): Promise<string> => {
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`[${timestamp}] 🔄 Starting round-robin API key allocation...`);
    
    // Get all active keys (both admin and donated) sorted by allocation count
    const adminKeys = await ApiKey.find({ status: 'active' })
      .sort({ allocationCount: 1, lastUsed: 1 })
      .lean();
    
    const donatedKeys = await DonatedApiKey.find({ status: 'active', isValidated: true })
      .sort({ allocationCount: 1, lastUsed: 1 })
      .lean();
    
    // Combine all keys and sort by allocation count
    const allKeys = [
      ...adminKeys.map(k => ({ ...k, source: 'admin' as const })),
      ...donatedKeys.map(k => ({ ...k, source: 'donated' as const }))
    ].sort((a, b) => {
      const aAllocation = (a as any).allocationCount || 0;
      const bAllocation = (b as any).allocationCount || 0;
      if (aAllocation !== bAllocation) {
        return aAllocation - bAllocation;
      }
      const aLastUsed = (a as any).lastUsed || new Date(0);
      const bLastUsed = (b as any).lastUsed || new Date(0);
      return aLastUsed.getTime() - bLastUsed.getTime();
    });
    
    if (allKeys.length === 0) {
      console.log(`[${timestamp}] ❌ No active API keys available`);
      throw new Error('No active API keys available');
    }
    
    // Find the key with minimum allocation count
    const minAllocationCount = (allKeys[0] as any).allocationCount || 0;
    const candidateKeys = allKeys.filter(key => (key as any).allocationCount === minAllocationCount);
    
    console.log(`[${timestamp}] 🎯 Found ${candidateKeys.length} keys with minimum allocation count: ${minAllocationCount}`);
    
    // Try each candidate key until we find a valid one
    for (const keyData of candidateKeys) {
      const maskedKey = `${(keyData as any).apiKey.substring(0, 8)}...`;
      console.log(`[${timestamp}] 🧪 Testing ${keyData.source} key ${maskedKey}...`);
      
      // Validate the API key
      const validation = await validateGeminiApiKey((keyData as any).apiKey);
      
      if (validation.isValid) {
        // Key is valid, update allocation count and return
        console.log(`[${timestamp}] ✅ Key ${maskedKey} is valid, allocating...`);
        
        if (keyData.source === 'admin') {
          await ApiKey.findByIdAndUpdate((keyData as any)._id, {
            $inc: { allocationCount: 1, usageCount: 1 },
            lastUsed: new Date(),
            lastValidated: new Date()
          });
        } else {
          await DonatedApiKey.findByIdAndUpdate((keyData as any)._id, {
            $inc: { allocationCount: 1, usageCount: 1 },
            lastUsed: new Date(),
            lastValidated: new Date()
          });
        }
        
        console.log(`[${timestamp}] 📊 Updated ${keyData.source} key allocation count to ${(keyData as any).allocationCount + 1}`);
        return (keyData as any).apiKey;
      } else {
        // Key is invalid, mark as deactivated
        console.log(`[${timestamp}] ❌ Key ${maskedKey} is invalid: ${validation.error}`);
        
        if (keyData.source === 'admin') {
          await ApiKey.findByIdAndUpdate((keyData as any)._id, {
            status: 'deactivated',
            isActive: false,
            validationError: validation.error,
            lastValidated: new Date()
          });
        } else {
          await DonatedApiKey.findByIdAndUpdate((keyData as any)._id, {
            status: 'deactivated',
            isActive: false,
            validationError: validation.error,
            lastValidated: new Date()
          });
        }
      }
    }
    
    // If we get here, all candidate keys were invalid
    console.log(`[${timestamp}] ❌ All candidate keys were invalid, trying next batch...`);
    
    // Try to find keys with the next lowest allocation count
    const remainingKeys = allKeys.filter(key => (key as any).allocationCount > minAllocationCount);
    
    if (remainingKeys.length === 0) {
      throw new Error('All API keys have been deactivated due to validation failures');
    }
    
    // Recursively try the next batch
    return await getRoundRobinApiKey();
    
  } catch (error: any) {
    console.error(`[${timestamp}] ❌ Error in round-robin allocation:`, error.message);
    throw new Error('Unable to allocate API key: ' + error.message);
  }
};

// Helper function to get current server port
export const getCurrentServerPort = () => {
  return process.env.PORT || 3000;
};

// Helper function to initialize server usage tracking
export const initializeServerUsageTracking = async () => {
  const currentPort = getCurrentServerPort();
  const serverUrl = `http://localhost:${currentPort}/api`;
  
  try {
    let serverUsage = await ServerUsage.findOne({ serverUrl });
    
    if (!serverUsage) {
      serverUsage = new ServerUsage({
        serverUrl,
        port: currentPort,
        isOnline: true
      });
      await serverUsage.save();
      console.log(`📊 Initialized usage tracking for server: ${serverUrl}`);
    } else {
      // Mark server as online when starting
      serverUsage.isOnline = true;
      await serverUsage.save();
      console.log(`📊 Resumed usage tracking for server: ${serverUrl}`);
    }
    
    return serverUsage;
  } catch (error) {
    console.error('Error initializing server usage tracking:', error);
  }
};

// Helper function to track API key allocation
export const trackApiKeyAllocation = async (responseTime = 0) => {
  const currentPort = getCurrentServerPort();
  const serverUrl = `http://localhost:${currentPort}/api`;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentHour = new Date();
  currentHour.setMinutes(0, 0, 0);
  
  try {
    let serverUsage = await ServerUsage.findOne({ serverUrl });
    
    if (!serverUsage) {
      serverUsage = new ServerUsage({
        serverUrl,
        port: currentPort,
        isOnline: true
      });
    }
    
    // Update overall stats
    serverUsage.totalAllocations += 1;
    serverUsage.totalApiCalls += 1;
    serverUsage.totalLoadHandled += 1;
    serverUsage.successfulRequests += 1;
    serverUsage.lastUsed = new Date();
    
    // Update average response time
    if (responseTime > 0) {
      const totalRequests = serverUsage.successfulRequests + serverUsage.failedRequests;
      serverUsage.averageResponseTime = 
        ((serverUsage.averageResponseTime * (totalRequests - 1)) + responseTime) / totalRequests;
    }
    
    // Update daily stats
    let dailyStat = serverUsage.dailyStats.find((stat: any) => 
      stat.date.getTime() === today.getTime()
    );
    
    if (!dailyStat) {
      dailyStat = {
        date: today,
        allocations: 0,
        apiCalls: 0,
        loadHandled: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0
      };
      serverUsage.dailyStats.push(dailyStat);
    }
    
    dailyStat.allocations += 1;
    dailyStat.apiCalls += 1;
    dailyStat.loadHandled += 1;
    dailyStat.successfulRequests += 1;
    if (responseTime > 0) {
      const dailyTotalRequests = dailyStat.successfulRequests + dailyStat.failedRequests;
      dailyStat.averageResponseTime = 
        ((dailyStat.averageResponseTime * (dailyTotalRequests - 1)) + responseTime) / dailyTotalRequests;
    }
    
    // Update hourly stats
    let hourlyStat = serverUsage.hourlyStats.find((stat: any) => 
      stat.timestamp.getTime() === currentHour.getTime()
    );
    
    if (!hourlyStat) {
      hourlyStat = {
        timestamp: currentHour,
        allocations: 0,
        apiCalls: 0,
        responseTime: responseTime
      };
      serverUsage.hourlyStats.push(hourlyStat);
    } else {
      hourlyStat.allocations += 1;
      hourlyStat.apiCalls += 1;
      if (responseTime > 0) {
        hourlyStat.responseTime = (hourlyStat.responseTime + responseTime) / 2;
      }
    }
    
    // Keep only last 30 days of daily stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    serverUsage.dailyStats = serverUsage.dailyStats.filter((stat: any) => stat.date >= thirtyDaysAgo);
    
    // Keep only last 24 hours of hourly stats
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    serverUsage.hourlyStats = serverUsage.hourlyStats.filter((stat: any) => stat.timestamp >= twentyFourHoursAgo);
    
    await serverUsage.save();
    
    console.log(`📈 Tracked allocation for ${serverUrl} - Total: ${serverUsage.totalAllocations}`);
    
  } catch (error) {
    console.error('Error tracking API key allocation:', error);
  }
};

// Helper function to track failed requests
export const trackFailedRequest = async (error: string | null = null) => {
  const currentPort = getCurrentServerPort();
  const serverUrl = `http://localhost:${currentPort}/api`;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  try {
    let serverUsage = await ServerUsage.findOne({ serverUrl });
    
    if (!serverUsage) {
      serverUsage = new ServerUsage({
        serverUrl,
        port: currentPort,
        isOnline: true
      });
    }
    
    serverUsage.failedRequests += 1;
    
    // Update daily stats
    let dailyStat = serverUsage.dailyStats.find((stat: any) => 
      stat.date.getTime() === today.getTime()
    );
    
    if (!dailyStat) {
      dailyStat = {
        date: today,
        allocations: 0,
        apiCalls: 0,
        loadHandled: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0
      };
      serverUsage.dailyStats.push(dailyStat);
    }
    
    dailyStat.failedRequests += 1;
    
    await serverUsage.save();
    
    console.log(`📉 Tracked failed request for ${serverUrl} - Total failures: ${serverUsage.failedRequests}`);
    
  } catch (error) {
    console.error('Error tracking failed request:', error);
  }
};

