import { GET } from '../../src/app/api/dashboard/analytics/route';
import { NextRequest } from 'next/server';
import { requestContextStorage } from '../../src/lib/observability';

async function run() {
  const req = new NextRequest('http://localhost:3000/api/dashboard/analytics');
  
  // Provide empty context to avoid errors in ApiResponse
  requestContextStorage.run({ requestId: 'test', startTime: Date.now(), endpoint: '/api/dashboard/analytics' }, async () => {
    // Mock user to bypass auth
    const mockUser = { accessScope: 'ALL_UNITS', unitId: null, unitKode: null };
    const res = await GET(req, mockUser as any);
    const json = await res.json();
    
    console.log('--- EXACT JSON RESPONSE ---');
    console.log(JSON.stringify(json, null, 2));

    console.log('--- unitFindingsData ---');
    console.log(JSON.stringify(json.data?.unitFindingsData || [], null, 2));
    console.log('--- jenisData ---');
    console.log(JSON.stringify(json.data?.jenisData || [], null, 2));
  });
}
run().catch(console.error);
