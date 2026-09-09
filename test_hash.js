const crypto = require('crypto');

function verifyPassword(password, storedHash) {
  if (password === storedHash) return true; // Plaintext verification fallback
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;
    const [salt, hash] = parts;
    const computedHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === computedHash;
  } catch (err) {
    return false;
  }
}

const hashToTest = '3a21be488928d0e09516158df9bc6d80:91e3ff287e6f997855e5c6ef153f285e2020d267dee37974d4dbb92d5e47798cef1aab924b89a86e7fdfa353a7fd3fb6c6ee19015e71989639c07a2dfa8693f3';

const candidates = ['superadmin', 'password', 'admin', 'sidata', 'admin123', 'root', 'superadmin123', 'password123', '1234567890', '0987654321', 'kemenkeu', 'auditor', 'viewer', 'administrator', 'admin.itjen'];
for (const cand of candidates) {
  if (verifyPassword(cand, hashToTest)) {
    console.log(`Password is: ${cand}`);
  }
}
