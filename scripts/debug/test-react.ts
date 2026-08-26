import { NextResponse } from 'next/server';

function createMockResponse() {
  const data = [
    { id: 2, title: 'Laporan Baru' },
    { id: 1, title: 'Proposal' }
  ];
  
  const meta = {
    name: 'test_collab_table',
    columns: [{ name: 'title', type: 'string' }]
  };

  const responseMeta = {
    metadata: meta,
    pagination: { page: 1, limit: 15, total: 2, totalPages: 1 },
    rows: data,
    totalRows: 2,
    totalPages: 1,
    currentPage: 1
  };

  // Simulate ApiResponse.success
  return {
    success: true,
    data,
    message: 'Table records fetched successfully',
    error: null,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: 'test',
      ...responseMeta
    }
  };
}

function simulateReact() {
  const data = createMockResponse();

  let records = [];
  let metadata = null;
  let columns = [];
  let totalPages = 1;
  let totalRecords = 0;

  if (data.success) {
    records = data.data || [];
    const responseMeta = data.meta?.metadata || data.metadata;
    const responsePagination = data.meta?.pagination || data.pagination;
    
    metadata = responseMeta;
    columns = responseMeta?.columns || [];
    totalPages = responsePagination?.totalPages || 1;
    totalRecords = responsePagination?.total || 0;
  }

  console.log('RECORDS:', records);
  console.log('COLUMNS:', columns);
  console.log('RECORDS LENGTH:', records.length);
  console.log('COLUMNS LENGTH:', columns.length);
}

simulateReact();
