function run() {
  const data = {
    success: true,
    data: [
      { id: 2, title: 'Laporan Baru' }
    ],
    meta: {
      metadata: {
        columns: [
          { name: 'title', type: 'string' }
        ]
      }
    }
  };

  let records = [];
  let columns = [];

  if (data.success) {
    records = data.data || [];
    const responseMeta = data.meta?.metadata || data.metadata;
    columns = responseMeta?.columns || [];
  }

  console.log('records.length:', records.length);
  console.log('columns.length:', columns.length);
}

run();
