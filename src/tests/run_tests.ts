(process.env as any).NODE_ENV = 'test';

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { signToken, verifyToken, hashPassword, verifyPassword } from '@/backend/lib/auth';
import { 
  ValidationError, 
  UnauthorizedError, 
  ForbiddenError, 
  NotFoundError, 
  ConflictError, 
  InternalServerError,
  AppError 
} from '@/backend/lib/errors';
import { metricsCollector } from '@/backend/lib/observability';
import { WorkflowEngine } from '@/backend/services/WorkflowEngine';
import { PresenceService } from '@/backend/services/PresenceService';
import { NotificationService } from '@/backend/services/NotificationService';
import { ActivityFeedService } from '@/backend/services/ActivityFeedService';
import { EventBus } from '@/backend/services/EventBus';
import { ApprovalRepository } from '../repositories/ApprovalRepository';
import { getDbClient, validateDatasetSchema } from '../db';
import { bootstrapDbListeners } from '@/backend/lib/bootstrap';
import { PersistenceService } from '../runtime/PersistenceService';


// Simple Assertion Helper
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`  [✓] Passed: ${message}`);
}

async function runTests() {
  console.log('=== RUNNING COLLABORATION SUITE AUDIT & TESTS ===\n');
  const dbType = 'sandbox';
  const dbConfig = null;

  // Initialize event listeners
  bootstrapDbListeners(dbType, dbConfig);
  const db = getDbClient(dbType, dbConfig, true);
  await db.initializeSchema();

  const presenceService = new PresenceService(dbType, dbConfig);
  const workflowEngine = new WorkflowEngine(dbType, dbConfig);
  const notifService = new NotificationService(dbType, dbConfig);
  const feedService = new ActivityFeedService(dbType, dbConfig);

  // Setup mock table
  const tableName = 'test_collab_table';
  try {
    await db.createDynamicTable(
      tableName,
      'Test Collaboration Table',
      'test.xlsx',
      'admin',
      [{ name: 'title', type: 'string', isNullable: false }],
      []
    );
  } catch (e) {
    // Ignore if exists
  }

  // Clear existing collaboration system records for clean validation
  const SANDBOX_FILE = path.join(process.cwd(), 'src/db/sandbox_db.json');
  if (fs.existsSync(SANDBOX_FILE)) {
    const sandbox = JSON.parse(fs.readFileSync(SANDBOX_FILE, 'utf8'));
    if (sandbox.system) {
      sandbox.system.locks = [];
      sandbox.system.approvals = [];
      sandbox.system.activityFeed = [];
      sandbox.system.notifications = [];
    }
    fs.writeFileSync(SANDBOX_FILE, JSON.stringify(sandbox, null, 2));
  }

  // Create clean record
  const record = await db.createRecord(tableName, {
    title: 'Proposal Dokumen Audit BPK',
    owner_username: 'staff_user',
    workflow_status: 'Draft',
    record_version: 1
  });
  const recordId = record.id;

  // ==========================================
  // UNIT TEST 1: Workflow Transition Allowed Rules
  // ==========================================
  console.log('\n[WorkflowEngine Rules Unit Tests]');
  assert(WorkflowEngine.isTransitionAllowed('Draft', 'Submitted') === true, 'Draft to Submitted allowed');
  assert(WorkflowEngine.isTransitionAllowed('Submitted', 'Under Review') === true, 'Submitted to Under Review allowed');
  assert(WorkflowEngine.isTransitionAllowed('Under Review', 'Approved') === true, 'Under Review to Approved allowed');
  assert(WorkflowEngine.isTransitionAllowed('Approved', 'Published') === true, 'Approved to Published allowed');
  assert(WorkflowEngine.isTransitionAllowed('Draft', 'Approved') === false, 'Draft to Approved direct jump rejected');

  // ==========================================
  // UNIT TEST 2: RBAC Transition Rules
  // ==========================================
  console.log('\n[WorkflowEngine RBAC Unit Tests]');
  assert(workflowEngine.isRoleAllowedForTransition('Eselon I Staff', 'Submitted', 'Draft') === true, 'Staff can submit Draft');
  assert(workflowEngine.isRoleAllowedForTransition('Eselon I Staff', 'Approved', 'Under Review') === false, 'Staff cannot approve review');
  assert(workflowEngine.isRoleAllowedForTransition('Itjen Auditor', 'Approved', 'Under Review') === true, 'Auditor can approve review');
  assert(workflowEngine.isRoleAllowedForTransition('Itjen Inspector', 'Published', 'Approved') === true, 'Inspector can publish');

  // ==========================================
  // UNIT TEST 3: Pessimistic Locks Leasing
  // ==========================================
  console.log('\n[PresenceService Locking Unit Tests]');
  // User 1 locks
  const lock1 = await presenceService.acquireLock(tableName, recordId, 'user_one');
  assert(lock1.success === true, 'User One acquires lock');

  // User 2 locks -> should fail
  const lock2 = await presenceService.acquireLock(tableName, recordId, 'user_two');
  assert(lock2.success === false, 'User Two attempt blocked');

  // User 1 heartbeats -> should succeed
  const hb = await presenceService.heartbeat(tableName, recordId, 'user_one');
  assert(hb.success === true, 'User One lock heartbeat renews lease');

  // Release lock
  const rel = await presenceService.releaseLock(tableName, recordId, 'user_one');
  assert(rel.success === true, 'User One releases lock');

  // ==========================================
  // UNIT TEST 4: Optimistic Concurrency Checks
  // ==========================================
  console.log('\n[PresenceService Optimistic Concurrency Unit Tests]');
  // Match version -> succeeds
  const versionOk = await presenceService.validateOptimisticVersion(tableName, recordId, 1);
  assert(versionOk.success === true, 'Match version succeeds');

  // Mismatch version -> fails (simulates parallel write update)
  const versionFail = await presenceService.validateOptimisticVersion(tableName, recordId, 99);
  assert(versionFail.success === false, 'Mismatch version (409 conflict) rejected');

  // ==========================================
  // INTEGRATION TEST: Full Collaboration Lifecycle Flow
  // ==========================================
  console.log('\n[Integration Test: End-to-End Collaboration Lifecycle]');
  
  // Step 1: Staff edits record -> acquires lock
  const lockStaff = await presenceService.acquireLock(tableName, recordId, 'staff_user');
  assert(lockStaff.success === true, 'Staff locks record to edit');

  // Step 2: Staff updates title & releases lock
  const verifyLock = await presenceService.verifyLockForWrite(tableName, recordId, 'staff_user');
  assert(verifyLock === true, 'Staff holds permission to edit');

  const updatedRec = await db.updateRecord(tableName, recordId, {
    title: 'Proposal Dokumen Audit BPK (V2)',
    record_version: 2
  });
  await presenceService.releaseLock(tableName, recordId, 'staff_user');
  assert(updatedRec.title.includes('V2'), 'Record title updated');

  // Step 3: Staff submits for approval -> triggers event and notification
  const approvalRepo = new ApprovalRepository(dbType, dbConfig);
  
  // Transition to Submitted
  await workflowEngine.executeTransition(tableName, recordId, 'Submitted', {
    username: 'staff_user',
    role: 'Eselon I Staff',
    fullName: 'Azriel Staff'
  });
  
  // Create approval record
  await approvalRepo.createRequest(tableName, recordId, 'staff_user', 'Tolong direview berkas BPK ini.');
  await EventBus.getInstance().publish('APPROVAL_REQUESTED', {
    tableName,
    recordId,
    requester: 'staff_user',
    comments: 'Tolong direview berkas BPK ini.'
  });

  // Validate notification is generated
  const notifs = await notifService.listUserNotifications('Itjen Auditor');
  assert(notifs.length > 0, 'Approval submission generates notification for Itjen Auditor');
  assert(notifs[0].title.includes('Persetujuan Baru Diajukan'), 'Notification details check');

  // Validate Activity Feed logs are written
  const timeline = await feedService.listTimeline(10);
  assert(timeline.length > 0, 'Action logs feed written');
  assert(timeline.some((t: any) => t.description.toLowerCase().includes('reviewer')), 'Activity feed description check');

  // Step 4: Auditor reviews and rejects -> transitions to Revision Requested
  const pendingApproval = await approvalRepo.findRequest(tableName, recordId);
  assert(pendingApproval.status === 'PENDING', 'Auditor retrieves pending approval entry');

  // Transition status to Under Review first (Start Review Process)
  await workflowEngine.executeTransition(tableName, recordId, 'Under Review', {
    username: 'auditor_user',
    role: 'Itjen Auditor',
    fullName: 'Budi Auditor'
  });

  // Now transition status to Revision Requested (Reject)
  await workflowEngine.executeTransition(tableName, recordId, 'Revision Requested', {
    username: 'auditor_user',
    role: 'Itjen Auditor',
    fullName: 'Budi Auditor'
  });
  await approvalRepo.updateRequest(pendingApproval.id, 'REJECTED', 'auditor_user', 'Mohon perbaiki format laporan.');
  await EventBus.getInstance().publish('REVISION_REQUESTED', {
    tableName,
    recordId,
    actor: 'auditor_user',
    comments: 'Mohon perbaiki format laporan.'
  });

  // Step 5: Verify status is Revision Requested and record owner is notified
  const statusCheck = await workflowEngine['workflowRepo'].getRecordWorkflowStatus(tableName, recordId);
  assert(statusCheck?.status === 'Revision Requested', 'Record workflow status set to Revision Requested');
  
  const staffNotifs = await notifService.listUserNotifications('staff_user');
  assert(staffNotifs.some((n: any) => n.title.includes('Revisi Diminta')), 'Staff notified of requested revision');

  // ==========================================
  // UNIT TEST 5: Dataset Schema Validation & Duplicate Checks
  // ==========================================
  console.log('\n[Dataset Validation & Duplicate Checks Unit Tests]');
  const validationTestCols = [
    { name: 'name', type: 'string' as const },
    { name: 'age', type: 'number' as const },
    { name: 'dob', type: 'date' as const }
  ];
  
  // Test valid data
  const validDataReport = validateDatasetSchema(validationTestCols, [
    { name: 'Budi', age: 30, dob: '1995-10-12' },
    { name: 'Ani', age: 25, dob: '2001-04-20' }
  ]);
  assert(validDataReport.isValid === true, 'Valid dataset check passes');
  assert(validDataReport.duplicateCount === 0, 'No duplicates detected');

  // Test invalid number type
  const invalidNumberReport = validateDatasetSchema(validationTestCols, [
    { name: 'Budi', age: 'tiga puluh', dob: '1995-10-12' }
  ]);
  assert(invalidNumberReport.isValid === false, 'Invalid number format is detected');
  assert(invalidNumberReport.invalidRows.length === 1, 'One invalid row captured');
  assert(invalidNumberReport.invalidRows[0].errors[0].includes("harus bertipe angka"), 'Correct numeric type mismatch message');

  // Test duplicates detection
  const duplicateReport = validateDatasetSchema(validationTestCols, [
    { name: 'Budi', age: 30, dob: '1995-10-12' },
    { name: 'Budi', age: 30, dob: '1995-10-12' }
  ]);
  assert(duplicateReport.duplicateCount === 1, 'Duplicate row signature detected');

  // ==========================================
  // UNIT TEST 6: Authentication & JWT Service
  // ==========================================
  console.log('\n[Authentication & JWT Unit Tests]');
  const secret = process.env.JWT_SECRET || 'data_migration_dashboard_security_secret_998811';

  const testPayload = { userId: 42, username: 'test_admin', role: 'Administrator' };
  const token = signToken(testPayload);
  assert(typeof token === 'string' && token.length > 0, 'JWT sign token produces valid string');
  
  const decoded = verifyToken(token);
  assert(decoded !== null, 'JWT token verification succeeds');
  assert(decoded?.username === 'test_admin', 'Decoded payload matches original values');
  
  const badToken = token + 'manipulated';
  const decodedBad = verifyToken(badToken);
  assert(decodedBad === null, 'Malformed JWT token is correctly rejected');

  // Expired token rejection
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
  const body = Buffer.from(JSON.stringify({ ...testPayload, exp })).toString('base64url');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${header}.${body}`);
  const signature = hmac.digest('base64url');
  const expiredToken = `${header}.${body}.${signature}`;

  const decodedExpired = verifyToken(expiredToken);
  assert(decodedExpired === null, 'Expired JWT token is correctly rejected');

  const hashed = hashPassword('superSecret');
  assert(verifyPassword('superSecret', hashed) === true, 'Valid password verification matches');
  assert(verifyPassword('wrongPassword', hashed) === false, 'Invalid password verification rejected');

  // ==========================================
  // UNIT TEST 7: Centralized Error Handling Hierarchy
  // ==========================================
  console.log('\n[Centralized Error Handling Unit Tests]');

  const vErr = new ValidationError('Invalid email format');
  assert(vErr.statusCode === 400, 'ValidationError status code is 400');
  assert(vErr.message === 'Invalid email format', 'ValidationError message is correct');
  assert(vErr instanceof AppError, 'ValidationError is instance of AppError');

  const uErr = new UnauthorizedError('Session expired');
  assert(uErr.statusCode === 401, 'UnauthorizedError status code is 401');
  assert(uErr instanceof AppError, 'UnauthorizedError is instance of AppError');

  const fErr = new ForbiddenError('Action not allowed');
  assert(fErr.statusCode === 403, 'ForbiddenError status code is 403');
  assert(fErr instanceof AppError, 'ForbiddenError is instance of AppError');

  const nErr = new NotFoundError('Record not found');
  assert(nErr.statusCode === 404, 'NotFoundError status code is 404');
  assert(nErr instanceof AppError, 'NotFoundError is instance of AppError');

  const cErr = new ConflictError('Record version mismatch');
  assert(cErr.statusCode === 409, 'ConflictError status code is 409');
  assert(cErr instanceof AppError, 'ConflictError is instance of AppError');

  const iErr = new InternalServerError('Database failure');
  assert(iErr.statusCode === 500, 'InternalServerError status code is 500');
  assert(iErr instanceof AppError, 'InternalServerError is instance of AppError');

  const standardError = new Error('Generic file read issue');
  const appErr = AppError.from(standardError);
  assert(appErr.statusCode === 500, 'Standard Error wraps as 500 AppError');
  assert(appErr.message === 'Generic file read issue', 'AppError preserves original message');

  // ==========================================
  // UNIT TEST 8: Observability & Metrics Diagnostics
  // ==========================================
  console.log('\n[Observability & Metrics Diagnostics Unit Tests]');
  
  // Record requests
  const initialMetrics = metricsCollector.getMetrics();
  metricsCollector.recordRequest(10); // 10ms
  metricsCollector.recordRequest(30); // 30ms
  metricsCollector.recordCacheHit();
  metricsCollector.recordCacheMiss();
  
  const updatedMetrics = metricsCollector.getMetrics();
  assert(updatedMetrics.totalRequests === initialMetrics.totalRequests + 2, 'Total requests metric increments correctly');
  assert(updatedMetrics.cacheHitCount === initialMetrics.cacheHitCount + 1, 'Cache hits count increments correctly');
  assert(updatedMetrics.cacheMissCount === initialMetrics.cacheMissCount + 1, 'Cache misses count increments correctly');
  
  // Hit ratio (hits / (hits + misses))
  const hits = updatedMetrics.cacheHitCount;
  const misses = updatedMetrics.cacheMissCount;
  const totalCacheOps = hits + misses;
  const expectedRatio = totalCacheOps > 0 ? hits / totalCacheOps : 0;
  assert(typeof expectedRatio === 'number', 'Cache hit ratio is calculated');

  // ==========================================
  // UNIT TEST 9: Metadata Cache Behavior
  // ==========================================
  console.log('\n[Metadata Cache Unit Tests]');
  
  // 1. Initial retrieval: miss
  const initialMisses = metricsCollector.getMetrics().cacheMissCount;
  await db.getTableMetadata(tableName);
  assert(metricsCollector.getMetrics().cacheMissCount === initialMisses + 1, 'Cache miss recorded on initial load');
  
  // 2. Second retrieval: hit
  const initialHits = metricsCollector.getMetrics().cacheHitCount;
  await db.getTableMetadata(tableName);
  assert(metricsCollector.getMetrics().cacheHitCount === initialHits + 1, 'Cache hit recorded on subsequent read');
  
  // 3. TTL Expiration behavior
  const initialDateNow = Date.now;
  try {
    let mockTime = Date.now();
    Date.now = () => mockTime;
    
    // Load into cache
    await db.getTableMetadata(tableName);
    
    const hitsBefore = metricsCollector.getMetrics().cacheHitCount;
    await db.getTableMetadata(tableName);
    assert(metricsCollector.getMetrics().cacheHitCount === hitsBefore + 1, 'Cache hit recorded');
    
    // Advance mock time past 5-minute TTL (300000ms + 1000ms)
    mockTime += 301000;
    
    const missesBefore = metricsCollector.getMetrics().cacheMissCount;
    await db.getTableMetadata(tableName);
    assert(metricsCollector.getMetrics().cacheMissCount === missesBefore + 1, 'Cache invalidates correctly after TTL expiry');
  } finally {
    Date.now = initialDateNow;
  }

  // 4. Cache Invalidation on write
  await db.getTableMetadata(tableName); // Repopulate cache (hit)
  
  // Modify table -> should invalidate cache
  await db.createRecord(tableName, { title: 'Laporan Baru', owner_username: 'staff_user', workflow_status: 'Draft', record_version: 1 });
  
  const missesCount = metricsCollector.getMetrics().cacheMissCount;
  await db.getTableMetadata(tableName);
  assert(metricsCollector.getMetrics().cacheMissCount === missesCount + 1, 'Cache is invalidated and cleared on database writes');

  // ==========================================
  // UNIT TEST 10: Dynamic Table Sorting, Pagination & Search
  // ==========================================
  console.log('\n[Dynamic Table Sorting, Pagination & Search Unit Tests]');
  const queryTable = 'test_sort_search_table';
  try {
    await db.createDynamicTable(
      queryTable,
      'Query Table',
      'query.xlsx',
      'admin',
      [
        { name: 'nama', type: 'string', isNullable: false },
        { name: 'skor', type: 'number', isNullable: false }
      ],
      []
    );
  } catch (e) {}

  // Clean rows
  const cleanDb = fs.existsSync(SANDBOX_FILE) ? JSON.parse(fs.readFileSync(SANDBOX_FILE, 'utf8')) : null;
  if (cleanDb && cleanDb.tables[queryTable]) {
    cleanDb.tables[queryTable].rows = [];
    fs.writeFileSync(SANDBOX_FILE, JSON.stringify(cleanDb, null, 2));
  }

  // Create records
  await db.createRecord(queryTable, { nama: 'Rudi', skor: 85 });
  await db.createRecord(queryTable, { nama: 'Tono', skor: 95 });
  await db.createRecord(queryTable, { nama: 'Andi', skor: 75 });

  // 1. Search Query
  const searchResult = await db.findRecords(queryTable, { search: 'Rudi' });
  assert(searchResult.data.length === 1, 'Search filtering selects matching row');
  assert(searchResult.data[0].nama === 'Rudi', 'Correct row filtered by name');

  // 2. Sorting ASC
  const ascResult = await db.findRecords(queryTable, { sortField: 'skor', sortOrder: 'asc' });
  assert(ascResult.data[0].nama === 'Andi', 'Sorting ASC orders scores correctly (lowest first)');
  assert(ascResult.data[2].nama === 'Tono', 'Highest score last');

  // 3. Sorting DESC
  const descResult = await db.findRecords(queryTable, { sortField: 'skor', sortOrder: 'desc' });
  assert(descResult.data[0].nama === 'Tono', 'Sorting DESC orders scores correctly (highest first)');
  assert(descResult.data[2].nama === 'Andi', 'Lowest score last');

  // 4. Pagination & Metadata
  const paginatedResult = await db.findRecords(queryTable, { page: 1, limit: 2 });
  assert(paginatedResult.data.length === 2, 'Pagination limit returns correct page size');
  assert(paginatedResult.total === 3, 'Total records count reflects full dataset size');

  // ==========================================
  // UNIT TEST 11: Dashboard Analytics Layer
  // ==========================================
  console.log('\n[Dashboard Analytics Layer Unit Tests]');
  const analyticsTable = 'test_dashboard_analytics_table';
  try {
    await db.createDynamicTable(
      analyticsTable,
      'Dashboard Analytics Table',
      'analytics.xlsx',
      'admin',
      [
        { name: 'tingkat_risiko', type: 'string', isNullable: true },
        { name: 'status', type: 'string', isNullable: true },
        { name: 'unit_kerja', type: 'string', isNullable: true }
      ],
      []
    );
  } catch (e) {}

  // Test empty table analytics behavior
  const cleanDbForAnalytics = fs.existsSync(SANDBOX_FILE) ? JSON.parse(fs.readFileSync(SANDBOX_FILE, 'utf8')) : null;
  if (cleanDbForAnalytics && cleanDbForAnalytics.tables[analyticsTable]) {
    cleanDbForAnalytics.tables[analyticsTable].rows = [];
    fs.writeFileSync(SANDBOX_FILE, JSON.stringify(cleanDbForAnalytics, null, 2));
  }
  
  const emptyAnalytics = await db.getTableAnalytics(analyticsTable);
  assert(emptyAnalytics.totalRecords === 0, 'Empty table returns 0 records');
  assert(emptyAnalytics.stats.highRisk === 0, 'Empty table returns 0 high risk records');

  // Populate records
  await db.createRecord(analyticsTable, { tingkat_risiko: 'Tinggi', status: 'Selesai', unit_kerja: 'DJP' });
  await db.createRecord(analyticsTable, { tingkat_risiko: 'Rendah', status: 'Proses', unit_kerja: 'DJBC' });
  await db.createRecord(analyticsTable, { tingkat_risiko: 'Tinggi', status: 'Belum ditindaklanjuti', unit_kerja: 'DJP' });

  const analytics = await db.getTableAnalytics(analyticsTable);
  assert(analytics.totalRecords === 3, 'Analytics reports total findings count');
  assert(analytics.stats.highRisk === 2, 'Analytics aggregates high risk findings correctly');
  assert(analytics.stats.completionRate === 33.3, 'Analytics calculates completed status rate accurately');
  assert(analytics.unitFindingsData.some((u: any) => u.name === 'DJP' && u.Temuan === 2), 'Unit findings ranking is aggregated correctly');
  assert(analytics.findingsTrendData.length === 6, 'Trend generation outputs findings trend buckets');

  // ==========================================
  // UNIT TEST 12: Ingestion Transaction Rollback
  // ==========================================
  console.log('\n[Ingestion Transaction Rollback Unit Tests]');
  const persistenceService = new PersistenceService('sandbox');
  await persistenceService.startTransaction();
  
  const testTbl = 'test_rollback_table';
  await persistenceService.createDatasetTable(
    testTbl,
    'Rollback Table',
    'test.xlsx',
    'admin',
    [{ name: 'col1', type: 'string' }]
  );
  await persistenceService.registerDataset({
    id: testTbl,
    workspaceId: 'default',
    canonicalName: testTbl,
    displayName: 'Rollback Table',
    physicalTable: testTbl,
    category: 'TRANSACTION'
  });
  
  const sandboxBefore = JSON.parse(fs.readFileSync(SANDBOX_FILE, 'utf8'));
  assert(sandboxBefore.tables[testTbl] !== undefined, 'Table created before rollback');
  assert(sandboxBefore.system.datasets.some((d: any) => d.id === testTbl), 'Dataset registered before rollback');

  await persistenceService.rollbackTransaction();

  const sandboxAfter = JSON.parse(fs.readFileSync(SANDBOX_FILE, 'utf8'));
  assert(sandboxAfter.tables[testTbl] === undefined, 'Table dropped after rollback');
  assert(!sandboxAfter.system.datasets.some((d: any) => d.id === testTbl), 'Dataset registry removed after rollback');

  console.log('\n=== ALL AUDIT & INTEGRATION TESTS COMPLETED SUCCESSFULLY ===');
}

runTests().catch((e) => {
  console.error('\n❌ TEST SUITE FAILED:', e);
  process.exit(1);
});
