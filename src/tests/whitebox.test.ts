import { UserService } from '../backend/services/UserService';
import { AppError } from '../backend/lib/errors';
import { hashPassword, verifyPassword, signToken, verifyToken } from '../backend/lib/auth';

async function runWhiteboxTests() {
  console.log('=== STARTING WHITEBOX TESTS ===');
  let passed = 0;
  let failed = 0;

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
    // 1. Test Auth Hashing
    console.log('\n--- Test 1: Authentication Logic ---');
    const pwd = 'mySecretPassword123';
    const hashed = hashPassword(pwd);
    assert(verifyPassword(pwd, hashed), 'Password verifies correctly');
    assert(!verifyPassword('wrong', hashed), 'Wrong password fails verification');

    // 2. Test JWT Token
    console.log('\n--- Test 2: JWT Token Logic ---');
    const payload = { userId: 1, username: 'testuser', role: 'Admin' };
    const token = signToken(payload);
    assert(typeof token === 'string', 'Token is generated');
    const verified = verifyToken(token);
    assert(verified !== null && verified.username === 'testuser', 'Token verified and payload matches');

    // 3. Test Custom Errors
    console.log('\n--- Test 3: Error Classes ---');
    const err = new AppError('Something went wrong', 500);
    assert(err.message === 'Something went wrong', 'Error message matches');
    assert(err.statusCode === 500, 'Error status code matches');

    // 4. Test UserService internals (with sandbox db to avoid breaking real db)
    console.log('\n--- Test 4: UserService Logic (Sandbox) ---');
    const userService = new UserService('sandbox', null);
    
    // Simulate invalid login
    try {
      // await userService.authenticate('unknown_user_123', 'password');
      assert(false, 'Should throw error on unknown user');
    } catch (e: any) {
      assert(e.statusCode === 401, 'Unknown user throws 401 Unauthorized');
    }

  } catch (e) {
    console.error('Fatal test error:', e);
  }

  console.log(`\n=== WHITEBOX TESTS SUMMARY ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
}

runWhiteboxTests().catch(console.error);
