import { signToken } from '../src/backend/lib/auth';

const adminPusat = signToken({
  userId: 1,
  username: 'admin.itjen',
  role: 'ADMIN_PUSAT',
  unitId: 1,
  unitKode: 'ITJEN',
  accessScope: 'ALL_UNITS'
});

const adminDjkn = signToken({
  userId: 2,
  username: 'admin.djkn',
  role: 'ADMIN_UNIT',
  unitId: 2,
  unitKode: 'DJKN',
  accessScope: 'OWN_UNIT'
});

console.log('---TOKENS---');
console.log('ADMIN_PUSAT=' + adminPusat);
console.log('ADMIN_DJKN=' + adminDjkn);
