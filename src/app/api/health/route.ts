import { NextResponse } from 'next/server';
import { getDbClient } from '@/db';
import { ApiResponse } from '@/lib/api-response';
import { withRequestContext, metricsCollector } from '@/lib/observability';
import { rateLimit } from '@/lib/rate-limiter';
import fs from 'fs';
import path from 'path';

const processStartTime = Date.now();

export const GET = withRequestContext(async (request: Request) => {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               '127.0.0.1';
    const limitResult = rateLimit(`health:${ip}`, { limit: 10, windowMs: 60 * 1000 });
    if (!limitResult.success) {
      return new Response(
        JSON.stringify({ success: false, message: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
    // 1. Initialize database client
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    // 2. Inspect Database connectivity
    const dbStatus = await db.testConnection();

    // 3. Inspect Disk Write Capacity
    let diskWritable = false;
    let diskMessage = '';
    try {
      const testPath = path.join(process.cwd(), 'src/lib', '.health_temp');
      fs.writeFileSync(testPath, 'healthcheck');
      fs.unlinkSync(testPath);
      diskWritable = true;
      diskMessage = 'Disk is writable.';
    } catch (err: any) {
      diskWritable = false;
      diskMessage = err.message || 'Disk is not writable.';
    }

    // 4. Generate overall health status
    const isHealthy = dbStatus.success && diskWritable;
    const metrics = metricsCollector.getMetrics();

    const healthData = {
      status: isHealthy ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString(),
      uptime: (Date.now() - processStartTime) / 1000,
      database: {
        type: dbType,
        connected: dbStatus.success,
        message: dbStatus.message
      },
      storage: {
        writable: diskWritable,
        message: diskMessage
      },
      cache: {
        hits: metrics.cacheHitCount,
        misses: metrics.cacheMissCount
      }
    };

    if (!isHealthy) {
      return ApiResponse.error('Sistem mendeteksi adanya kegagalan komponen.', healthData, 503);
    }

    return ApiResponse.success(healthData, 'Semua layanan berfungsi dengan baik.');

  } catch (error: any) {
    return ApiResponse.error('Kesalahan fatal saat memproses pemeriksaan kesehatan.', error, 500);
  }
});
