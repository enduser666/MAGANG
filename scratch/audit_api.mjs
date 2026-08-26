async function testApi() {
  try {
    const resSandbox = await fetch('http://localhost:3000/api/units', {
      headers: { 'x-db-type': 'sandbox' }
    });
    const dataSandbox = await resSandbox.json();
    console.log("=== SANDBOX RESPONSE ===");
    console.log(dataSandbox);

    const resMysql = await fetch('http://localhost:3000/api/units', {
      headers: { 'x-db-type': 'mysql' }
    });
    const dataMysql = await resMysql.json();
    console.log("\\n=== MYSQL RESPONSE ===");
    console.log(dataMysql);
  } catch(e) {
    console.error(e);
  }
}
testApi();
