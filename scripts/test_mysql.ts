import { MySQLAdapter } from '../src/db/adapters/MySQLAdapter';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  try {
    console.log("Starting MySQLAdapter verification...");
    const adapter = new MySQLAdapter();

    // 1. Connection test
    const connTest = await adapter.testConnection();
    console.log("1. Connection Test:", connTest);
    if (!connTest.success) throw new Error("Connection failed");

    // 2. List tables
    const tables = await adapter.listTables();
    console.log("2. List Tables:", tables.map(t => t.name));

    // 3. Metadata discovery
    const lhpMeta = await adapter.getTableMetadata('lhp');
    console.log("3. Metadata Discovery (lhp):");
    lhpMeta?.columns.forEach((c: any) => console.log(`   - ${c.name} (${c.type}) PK:${c.isPrimaryKey} Edit:${c.isEditable} Options:${c.options}`));

    // 4. Find Records
    const temuanRes = await adapter.findRecords('temuan', { limit: 10 });
    console.log(`4. Find Records (temuan): total=${temuanRes.total} count=${temuanRes.data.length}`);
    console.log("   Data:", temuanRes.data);

    // 5. Search
    const searchRes = await adapter.findRecords('temuan', { search: 'Pajak' });
    console.log(`5. Search (temuan for 'Pajak'): found=${searchRes.total}`);

    // 6. Sorting & Pagination
    const sortRes = await adapter.findRecords('lhp', { sortField: 'tanggal', sortOrder: 'DESC', limit: 1 });
    console.log("6. Sorting & Pagination:", sortRes.data);

    // 7. Create record
    const newLhp = await adapter.createRecord('lhp', { nomor_lhp: 'LHP-TEST-99', instansi: 'Test', tanggal: '2026-08-01', status: 'Proses' });
    console.log("7. Create Record:", newLhp);

    // 8. Update record
    const updatedLhp = await adapter.updateRecord('lhp', newLhp.id, { instansi: 'Test Updated' });
    console.log("8. Update Record:", updatedLhp);

    // 9. Delete record
    const deleted = await adapter.deleteRecord('lhp', newLhp.id);
    console.log("9. Delete Record:", deleted ? "Success" : "Failed");

    console.log("Verification finished successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Verification failed:", err);
    process.exit(1);
  }
}

main();
