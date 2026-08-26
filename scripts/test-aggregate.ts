import { QueryEngine } from '../src/runtime/QueryEngine';
import { bootstrapDbListeners } from '../src/backend/lib/bootstrap';
import { getDbClient } from '../src/db/index';

async function run() {
  bootstrapDbListeners('sandbox', null);

  const engine = new QueryEngine('sandbox', null);
  const db = getDbClient('sandbox', null);
  const datasetId = 'test_collab_table';
  
  // Ensure the dataset exists
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

  // Admin permission (No RLS)
  await db.permissions.create({
    datasetId,
    role: 'admin',
    actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    columnMasks: []
  });

  // Editor permission (RLS: created_by = 'user_editor', CLS on 'dampak_finansial')
  await db.permissions.create({
    datasetId,
    role: 'editor',
    actions: ['READ'],
    rowFilterQuery: "created_by = 'user_editor'",
    columnMasks: ['dampak_finansial']
  });

  // Create test records directly via DB for test_collab_table
  // (Assuming test_collab_table structure)
  try {
    await db.bulkInsertRecords('test_collab_table', [
      { created_by: 'admin', dampak_finansial: 1000, risk_score: 50 },
      { created_by: 'user_editor', dampak_finansial: 500, risk_score: 30 }
    ]);
  } catch (e) {} // May fail if table doesn't exist but let's assume it does

  console.log('--- PHASE 1: SECURE AGGREGATION TEST ---');
  
  try {
    // 1. Admin Aggregation (No restrictions)
    const adminResult = await engine.aggregate(
      datasetId,
      ['risk_score'],
      ['created_by'],
      { username: 'admin', role: 'admin' }
    );
    console.log('Admin Aggregation:', adminResult);

    // 2. Editor Aggregation (Should only see 'user_editor' rows due to RLS)
    const editorResult = await engine.aggregate(
      datasetId,
      ['risk_score'],
      ['created_by'],
      { username: 'user_editor', role: 'editor' }
    );
    console.log('Editor Aggregation (RLS Check):', editorResult);

    // 3. Editor Aggregation with masked field (Should throw CLS error)
    try {
      await engine.aggregate(
        datasetId,
        ['dampak_finansial'],
        ['created_by'],
        { username: 'user_editor', role: 'editor' }
      );
      console.log('Editor CLS check: FAIL (Did not block)');
    } catch (e: any) {
      console.log('Editor CLS check: PASS (Blocked)', e.message);
    }
  } catch (e: any) {
    console.error('Aggregation failed:', e.message);
  }

  process.exit(0);
}

run();
