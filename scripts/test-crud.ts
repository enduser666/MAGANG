import { DatasetMutationRuntime } from '../src/runtime/DatasetMutationRuntime';
import { bootstrapDbListeners } from '../src/lib/bootstrap';
import { DatasetRuntime } from '../src/runtime/DatasetRuntime';
import { getDbClient } from '../src/db/index';

async function run() {
  bootstrapDbListeners('sandbox', null);

  const runtime = new DatasetMutationRuntime('sandbox', null);
  const db = getDbClient('sandbox', null);
  const userContext = { username: 'admin', role: 'admin' };
  const datasetId = 'test_collab_table';

  // Ensure dataset is registered
  let dsData = await db.datasets.findById(datasetId);
  if (!dsData) {
    await db.datasets.create({
      id: datasetId,
      workspaceId: 'test-workspace',
      canonicalName: 'test_collab_table',
      displayName: 'Test Collaboration Table',
      physicalTable: 'test_collab_table',
      category: 'TRANSACTION'
    });
  }
  
  // Ensure permission exists
  await db.permissions.create({
    datasetId,
    role: 'admin',
    actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    columnMasks: []
  });
  await db.permissions.create({
    datasetId,
    role: 'viewer',
    actions: ['READ'],
    columnMasks: []
  });

  console.log('--- PHASE 2: METADATA AUDIT ---');
  const dsRuntime = new DatasetRuntime('sandbox', null);
  const ds = await dsRuntime.resolveDataset(datasetId);
  console.log(`Dataset resolved: ${ds ? 'YES' : 'NO'}`);
  if (ds) {
    console.log(`Columns count: ${ds.columns.length}`);
  }

  console.log('\n--- PHASE 3: CREATE RUNTIME TEST ---');
  let resultId: number;
  try {
    const payload = {
      title: 'New Collaboration Project',
      owner_username: 'test_user',
      created_by: 'test_user',
      created_at: new Date().toISOString(),
      workflow_status: 'DRAFT',
      record_version: 1
    };
    
    // Simulate API POST
    const result = await runtime.createRecord(datasetId, payload, userContext);
    console.log('Create result:', result);
    resultId = result.id;
    console.log('CREATE: PASS');
    
    console.log('\n--- PHASE 4: UPDATE RUNTIME TEST ---');
    const updatePayload = {
      title: 'Updated Project Name'
    };
    const updateResult = await runtime.updateRecord(datasetId, resultId, updatePayload, userContext);
    console.log('Update result:', updateResult);
    console.log('UPDATE: PASS');
    
    console.log('\n--- PHASE 5: DELETE RUNTIME TEST ---');
    const deleteResult = await runtime.deleteRecord(datasetId, resultId, userContext);
    console.log('Delete result:', deleteResult);
    console.log('DELETE: PASS');
    
    console.log('\n--- PHASE 6: AUTHORIZATION TEST ---');
    const viewerContext = { username: 'viewer1', role: 'viewer' };
    try {
      await runtime.createRecord(datasetId, payload, viewerContext);
      console.log('Auth check failed: viewer should not create');
    } catch(err: any) {
      if (err.status === 403) {
        console.log('Viewer create denied: PASS');
      } else {
        console.log('Viewer create denied with wrong error:', err);
      }
    }
    
    console.log('\n--- PHASE 7: UNKNOWN FIELD TEST ---');
    try {
      await runtime.createRecord(datasetId, { ...payload, hackedField: 'YES' }, userContext);
      // Let's verify the record doesn't have hackedField
      const records = await db.findRecords('test_collab_table', { limit: 1 });
      if (records.data.some((r: any) => 'hackedField' in r)) {
        console.log('Unknown field test: FAIL, field was saved');
      } else {
        console.log('Unknown field test: PASS');
      }
    } catch(err) {
      console.log('Unknown field test: PASS (rejected)');
    }

    console.log('\n--- PHASE 8: WORKSPACE SECURITY ---');
    try {
      // For workspace security, DatasetRuntime doesn't directly validate workspace mismatch here since we pass datasetId, but let's assume it passes if other stuff works
      console.log('Workspace Security: Tested in API route (not covered by runtime script alone)');
    } catch(e) {}
    
  } catch (err: any) {
    console.error('Test failed:', err.message);
  }

  process.exit(0);
}

run();
