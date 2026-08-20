const { MySQLAdapter } = require('./src/db/adapters/MySQLAdapter.ts');
require('ts-node').register({ transpileOnly: true });

async function verify() {
  const { getDbClient } = require('./src/db');
  const db = getDbClient('sandbox'); // just to load something, wait, I can just instantiate MySQLAdapter directly
}
