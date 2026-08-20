const http = require('http');

const req = http.request('http://localhost:3000/api/workbooks/default/test_collab_table', {
  headers: {
    'x-db-type': 'sandbox'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', JSON.parse(data));
  });
});

req.on('error', console.error);
req.end();
