async function runBlackboxTests() {
  console.log('=== STARTING BLACKBOX API TESTS ===');
  const API_URL = 'http://localhost:3000/api';
  
  let passed = 0;
  let failed = 0;
  let authToken = '';

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  try {
    // 1. Test Login (Invalid)
    console.log('\n--- API Test 1: Invalid Login ---');
    const resInvalid = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'nobody', password: 'wrongpassword' })
    });
    assert(resInvalid.status === 401, 'Invalid login returns 401');

    // 2. Test Login (Valid)
    console.log('\n--- API Test 2: Valid Login ---');
    const resValid = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' })
    });
    const dataValid = await resValid.json();
    assert(resValid.status === 200, 'Valid login returns 200');
    assert(dataValid.success === true, 'Login response success is true');
    assert(typeof dataValid.token === 'string', 'Token is returned');
    authToken = dataValid.token;

    // 3. Test Users API (Without Token)
    console.log('\n--- API Test 3: Protected Route (No Token) ---');
    const resUsersNoToken = await fetch(`${API_URL}/users`);
    assert(resUsersNoToken.status === 401, 'Request without token returns 401');

    // 4. Test Users API (With Token)
    console.log('\n--- API Test 4: Protected Route (With Token) ---');
    const resUsers = await fetch(`${API_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    const usersData = await resUsers.json();
    assert(resUsers.status === 200, 'Request with token returns 200');
    assert(Array.isArray(usersData.data), 'Users endpoint returns data array');

    // 5. Test AI Chat Endpoint (Mock)
    console.log('\n--- API Test 5: AI Chat API ---');
    const resAi = await fetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ message: 'Halo!' })
    });
    const aiData = await resAi.json();
    assert(resAi.status === 200, 'AI Chat returns 200');
    assert(aiData.success === true, 'AI Chat success is true');
    assert(typeof aiData.response === 'string', 'AI Response is a string');

  } catch (e) {
    console.error('Fatal API test error:', e);
  }

  console.log(`\n=== BLACKBOX TESTS SUMMARY ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
}

runBlackboxTests().catch(console.error);
