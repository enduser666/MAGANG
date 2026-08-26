const ADMIN_PUSAT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4uaXRqZW4iLCJyb2xlIjoiQURNSU5fUFVTQVQiLCJ1bml0SWQiOjEsInVuaXRLb2RlIjoiSVRKRU4iLCJhY2Nlc3NTY29wZSI6IkFMTF9VTklUUyIsImV4cCI6MTc4NjQzNDI5MX0.6mKBsSN7ZKdrFrrzwyAxddpyHyo2jYjTyWoKSTaA19Y";
const ADMIN_DJKN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsInVzZXJuYW1lIjoiYWRtaW4uZGprbiIsInJvbGUiOiJBRE1JTl9VTklUIiwidW5pdElkIjoyLCJ1bml0S29kZSI6IkRKS04iLCJhY2Nlc3NTY29wZSI6Ik9XTl9VTklUIiwiZXhwIjoxNzg2NDM0MjkxfQ.qPGhpkK3ZA9chOfdwOtJ5JBxtNM1qKDlSAJrvBA15Rc";

async function testFetchUnits(token, dbType = 'mysql') {
  const res = await fetch('http://localhost:3000/api/units', {
    headers: { 'x-db-type': dbType, 'Cookie': `session_token=${token}` }
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function testFetchAnalyticsBypass(token, unitId) {
  const res = await fetch(`http://localhost:3000/api/dashboard/analytics?tableName=lhp&unit_id=${unitId}`, {
    headers: { 'x-db-type': 'mysql', 'Cookie': `session_token=${token}` }
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function runTests() {
  console.log("=== API TESTS ===");
  
  // 1. Fetch as ADMIN_PUSAT
  console.log("\\n1. Fetching as ADMIN_PUSAT (ALL_UNITS)...");
  const unitsAll = await testFetchUnits(ADMIN_PUSAT_TOKEN, 'mysql');
  console.log(`Status: ${unitsAll.status}`);
  console.log(`Total units returned for ADMIN_PUSAT: ${unitsAll.data.data?.length}`);
  if (unitsAll.data.data) {
    const codes = unitsAll.data.data.map(u => u.kode_unit).join(', ');
    console.log(`Units: ${codes}`);
  }

  // 2. Fetch as ADMIN_UNIT DJKN
  console.log("\\n2. Fetching as ADMIN_UNIT DJKN (OWN_UNIT)...");
  const unitsOwn = await testFetchUnits(ADMIN_DJKN_TOKEN, 'mysql');
  console.log(`Status: ${unitsOwn.status}`);
  console.log(`Total units returned for ADMIN_UNIT: ${unitsOwn.data.data?.length}`);
  if (unitsOwn.data.data) {
    const codes = unitsOwn.data.data.map(u => u.kode_unit).join(', ');
    console.log(`Units: ${codes}`);
  }

  // 3. API Bypass test
  console.log("\\n3. API Bypass Test (Fetching unit_id=3 as DJKN)...");
  const bypass = await testFetchAnalyticsBypass(ADMIN_DJKN_TOKEN, '3');
  console.log(`Bypass Request Status: ${bypass.status}`);

  // 4. Mode Sandbox Test
  console.log("\\n4. Mode Sandbox Test for ADMIN_PUSAT...");
  const unitsSandbox = await testFetchUnits(ADMIN_PUSAT_TOKEN, 'sandbox');
  console.log(`Status: ${unitsSandbox.status}`);
  console.log(`Total units returned for SANDBOX: ${unitsSandbox.data.data?.length}`);
  if (unitsSandbox.data.data) {
    const codes = unitsSandbox.data.data.map(u => u.kode_unit).join(', ');
    console.log(`Sandbox Units: ${codes}`);
  }
}

runTests();
