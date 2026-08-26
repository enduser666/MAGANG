async function login(username, password) {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  const setCookie = res.headers.get('set-cookie') || '';
  const tokenMatch = setCookie.match(/session_token=([^;]+)/);
  const cookieStr = tokenMatch ? "session_token=" + tokenMatch[1] : '';
  return { success: data.success, data, cookie: cookieStr };
}

async function fetchMe(cookie) {
  const res = await fetch('http://localhost:3000/api/auth/me', {
    headers: { 'Cookie': cookie }
  });
  return await res.json();
}

async function fetchUnits(cookie) {
  const res = await fetch('http://localhost:3000/api/units', {
    headers: { 'Cookie': cookie, 'x-db-type': 'mysql' }
  });
  return await res.json();
}

async function testBypass(cookie, targetUnitId) {
  const res = await fetch(`http://localhost:3000/api/dashboard/analytics?tableName=lhp&unit_id=${targetUnitId}`, {
    headers: { 'Cookie': cookie, 'x-db-type': 'mysql' }
  });
  return res.status;
}

async function logout(cookie) {
  const res = await fetch('http://localhost:3000/api/auth/logout', {
    method: 'POST',
    headers: { 'Cookie': cookie }
  });
  return await res.json();
}

async function testAccount(username, targetUnitIdForBypass) {
  console.log(`\n--- Testing ${username} ---`);
  const auth = await login(username, 'sidata2024');
  if (!auth.success) {
    console.log("LOGIN FAILED:", auth.data);
    return;
  }
  console.log("LOGIN SUCCESS. Cookie:", auth.cookie ? "Received" : "Missing");

  const me = await fetchMe(auth.cookie);
  if (me.success && me.data) {
    console.log(`/api/auth/me -> Role: ${me.data.role}, Scope: ${me.data.accessScope}, UnitId: ${me.data.unitId}, UnitKode: ${me.data.unitKode}`);
  }

  const units = await fetchUnits(auth.cookie);
  if (units.success) {
    console.log(`/api/units -> Total: ${units.data.length}, Units: ${units.data.map(u => u.kode_unit).join(', ')}`);
  }

  if (targetUnitIdForBypass) {
    const bypassStatus = await testBypass(auth.cookie, targetUnitIdForBypass);
    console.log(`Bypass attempt to Unit ID ${targetUnitIdForBypass} returned HTTP ${bypassStatus} (Safe if 200 but restricted by backend, or 403)`);
  }

  const lo = await logout(auth.cookie);
  console.log(`Logout -> ${lo.message}`);
}

async function runTests() {
  await testAccount('superadmin', 2);
  await testAccount('admin.dja', 2);
  await testAccount('admin.setjen', 3);
}

runTests();
