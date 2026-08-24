import { MySQLAdapter } from './src/db/adapters/MySQLAdapter';

async function run() {
  const adapter = new MySQLAdapter();
  
  // Minimal mapping for test
  const mapping = {
    finding_type: 'jenis_pemeriksaan',
    status: 'status_rekomendasi',
    finding: 'kode_temuan'
  };

  try {
    const res = await adapter.getTableAnalytics('sidata_test', undefined, 'DYNAMIC_FLAT_TABLE', mapping);
    console.log(JSON.stringify(res.jenisData, null, 2));
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}

run();
