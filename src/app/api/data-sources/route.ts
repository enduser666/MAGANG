import { NextResponse } from 'next/server';
import { withAuth } from '@/backend/lib/auth';

export const GET = withAuth(async (request, user) => {
  try {
    const driver = process.env.DB_DRIVER || 'sandbox';
    const sources = [];
    
    // Architecturally designed to support multiple sources in the future.
    // Currently returns the one configured source from environment.
    if (driver === 'mysql') {
      sources.push({
        id: process.env.DB_NAME || 'mysql_db',
        name: process.env.DB_NAME || 'mysql_db',
        driver: 'mysql'
      });
    } else {
      sources.push({
        id: 'sandbox',
        name: 'Sandbox',
        driver: 'sandbox'
      });
    }

    return NextResponse.json({ success: true, sources });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch data sources.' },
      { status: 500 }
    );
  }
});
