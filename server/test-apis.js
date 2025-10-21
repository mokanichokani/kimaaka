#!/usr/bin/env node

const BASE_URL = 'https://kimaaka-server.vercel.app';

async function testEndpoint(method, endpoint, data = null, headers = {}) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const result = await response.json();
    
    console.log(`✅ ${method} ${endpoint} - Status: ${response.status}`);
    if (response.status >= 400) {
      console.log(`   Error: ${result.error || 'Unknown error'}`);
    }
    return { success: response.ok, data: result, status: response.status };
  } catch (error) {
    console.log(`❌ ${method} ${endpoint} - Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Testing Next.js API Server...\n');
  
  // Test 1: Health Check
  console.log('1. Testing Health Check...');
  await testEndpoint('GET', '/api/health');
  
  // Test 2: API Key Request (might fail if no keys in DB)
  console.log('\n2. Testing API Key Request...');
  await testEndpoint('GET', '/api/gemini-key');
  
  // Test 3: User Signup
  console.log('\n3. Testing User Signup...');
  const signupResult = await testEndpoint('POST', '/api/signup', {
    email: 'test@example.com',
    password: 'password123'
  });
  
  // Test 4: User Login
  console.log('\n4. Testing User Login...');
  const loginResult = await testEndpoint('POST', '/api/login', {
    email: 'test@example.com',
    password: 'password123'
  });
  
  let authToken = null;
  if (loginResult.success && loginResult.data.token) {
    authToken = loginResult.data.token;
    console.log('   Token received for further tests');
  }
  
  // Test 5: Token Verification
  if (authToken) {
    console.log('\n5. Testing Token Verification...');
    await testEndpoint('GET', '/api/verify', null, {
      'Authorization': `Bearer ${authToken}`
    });
  }
  
  // Test 6: Admin Login (using default admin)
  console.log('\n6. Testing Admin Login...');
  const adminLoginResult = await testEndpoint('POST', '/api/admin/auth/login', {
    username: 'admin',
    password: 'admin123'
  });
  
  let adminToken = null;
  if (adminLoginResult.success && adminLoginResult.data.token) {
    adminToken = adminLoginResult.data.token;
    console.log('   Admin token received for further tests');
  }
  
  // Test 7: Admin Stats
  if (adminToken) {
    console.log('\n7. Testing Admin Stats...');
    await testEndpoint('GET', '/api/admin/stats', null, {
      'Authorization': `Bearer ${adminToken}`
    });
  }
  
  // Test 8: Admin API Keys
  if (adminToken) {
    console.log('\n8. Testing Admin API Keys...');
    await testEndpoint('GET', '/api/admin/api-keys', null, {
      'Authorization': `Bearer ${adminToken}`
    });
  }
  
  // Test 9: Donate API Key (will fail without valid Gemini key)
  console.log('\n9. Testing Donate API Key...');
  await testEndpoint('POST', '/api/donate-key', {
    apiKey: 'test-key-123',
    donorEmail: 'test@example.com'
  });
  
  console.log('\n🎉 API Testing Complete!');
  console.log('\nNote: Some tests may fail if:');
  console.log('- No API keys are in the database');
  console.log('- MongoDB is not running');
  console.log('- Admin user is not set up');
  console.log('- Invalid Gemini API keys are used');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🔍 Checking if server is running...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Server is not running at https://kimaaka-server.vercel.app');
    console.log('Please start the server with: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Server is running, starting tests...\n');
  await runTests();
}

main().catch(console.error);

