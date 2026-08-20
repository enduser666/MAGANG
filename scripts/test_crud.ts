import { TableRecordService } from '../src/services/TableRecordService';
import { getDbClient } from '../src/db/index';

async function main() {
  const recordService = new TableRecordService('mysql', null);
  
  console.log('--- TEST CREATE ---');
  const payload = {
    id_lhp: 1,
    uraian: 'Test Description for Real Table',
    nilai: 15000.00,
    is_high_risk: 1
  };
  const created = await recordService.createRecord('temuan', payload);
  console.log('Created Record:', created);

  console.log('--- TEST READ ---');
  const read = await recordService.findRecords('temuan', { limit: 1, sortField: 'id', sortOrder: 'desc' });
  console.log('Read Latest Record:', read.data[0]);

  console.log('--- TEST UPDATE ---');
  const updated = await recordService.updateRecord('temuan', created.id, { uraian: 'Updated Description' });
  console.log('Updated Record:', updated);

  console.log('--- TEST DELETE ---');
  const deleted = await recordService.deleteRecord('temuan', created.id);
  console.log('Deleted Record Response:', deleted);
  
  process.exit(0);
}

main().catch(console.error);
