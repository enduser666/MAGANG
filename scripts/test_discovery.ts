import { getDbClient } from '../src/db/index';
async function main() {
  const db = getDbClient('mysql', null);
  const datasets = await db.datasets.findMany();
  console.log(JSON.stringify(datasets, null, 2));
  process.exit(0);
}
main().catch(console.error);
