const mysql = require('mysql2/promise');
const crypto = require('crypto');

// Function from src/lib/auth.ts to hash password
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

const targetAccounts = [
  { username: 'superadmin', role: 'ADMIN_PUSAT', access_scope: 'ALL_UNITS', unit_kode: null },
  { username: 'admin.itjen', role: 'ADMIN_UNIT', access_scope: 'OWN_UNIT', unit_kode: 'ITJEN' },
  { username: 'admin.djkn', role: 'ADMIN_UNIT', access_scope: 'OWN_UNIT', unit_kode: 'DJKN' },
  { username: 'admin.djp', role: 'ADMIN_UNIT', access_scope: 'OWN_UNIT', unit_kode: 'DJP' },
  { username: 'admin.djbc', role: 'ADMIN_UNIT', access_scope: 'OWN_UNIT', unit_kode: 'DJBC' },
  { username: 'admin.dja', role: 'ADMIN_UNIT', access_scope: 'OWN_UNIT', unit_kode: 'DJA' },
  { username: 'admin.djpb', role: 'ADMIN_UNIT', access_scope: 'OWN_UNIT', unit_kode: 'DJPB' },
  { username: 'admin.djpk', role: 'ADMIN_UNIT', access_scope: 'OWN_UNIT', unit_kode: 'DJPK' },
  { username: 'admin.bppk', role: 'ADMIN_UNIT', access_scope: 'OWN_UNIT', unit_kode: 'BPPK' },
  { username: 'admin.djppr', role: 'ADMIN_UNIT', access_scope: 'OWN_UNIT', unit_kode: 'DJPPR' },
  { username: 'admin.bkf', role: 'ADMIN_UNIT', access_scope: 'OWN_UNIT', unit_kode: 'BKF' },
  { username: 'admin.setjen', role: 'ADMIN_UNIT', access_scope: 'OWN_UNIT', unit_kode: 'SETJEN' }
];

require('dotenv').config({path: '.env.local'});
async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });
  console.log("=== SEEDING USERS ===");

  // 1. Fetch units
  const [units] = await conn.query('SELECT id, kode_unit FROM sys_units');
  const unitMap = {};
  for (const u of units) {
    unitMap[u.kode_unit] = u.id;
  }

  // 2. Fetch existing users
  const [existingUsers] = await conn.query('SELECT id, username, role, access_scope, unit_id FROM sys_users');
  const existingMap = {};
  for (const u of existingUsers) {
    existingMap[u.username] = u;
  }

  for (const target of targetAccounts) {
    const unitId = target.unit_kode ? unitMap[target.unit_kode] : null;
    if (target.unit_kode && !unitId) {
      console.log(`[SKIPPED] Unit ${target.unit_kode} not found in database for ${target.username}.`);
      continue;
    }

    if (existingMap[target.username]) {
      const u = existingMap[target.username];
      // Update role/scope/unit if different, but NOT password
      if (u.role !== target.role || u.access_scope !== target.access_scope || u.unit_id !== unitId) {
        await conn.query(
          'UPDATE sys_users SET role = ?, access_scope = ?, unit_id = ?, updated_at = NOW() WHERE id = ?',
          [target.role, target.access_scope, unitId, u.id]
        );
        console.log(`[UPDATED] ${target.username}: Role -> ${target.role}, Scope -> ${target.access_scope}, Unit -> ${target.unit_kode || 'NULL'} (Password unchanged)`);
      } else {
        console.log(`[KEPT] ${target.username} already matches target config.`);
      }
    } else {
      // Create new user
      const defaultPassword = 'sidata2024';
      const hash = hashPassword(defaultPassword);
      await conn.query(
        'INSERT INTO sys_users (username, password_hash, unit_id, role, access_scope, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())',
        [target.username, hash, unitId, target.role, target.access_scope]
      );
      console.log(`[CREATED] ${target.username} created with role ${target.role} and scope ${target.access_scope}.`);
    }
  }

  console.log("=== DONE ===");
  conn.end();
}
run();
