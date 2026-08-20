import { ApiResponse } from '@/lib/api-response';
import { withRequestContext, metricsCollector } from '@/lib/observability';
import { rateLimit } from '@/lib/rate-limiter';

export const GET = withRequestContext(async (request: Request) => {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               '127.0.0.1';
    const limitResult = rateLimit(`metrics:${ip}`, { limit: 10, windowMs: 60 * 1000 });
    if (!limitResult.success) {
      return new Response(
        JSON.stringify({ success: false, message: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const stats = metricsCollector.getMetrics();
    return ApiResponse.success(stats, 'Laporan metrik performa aplikasi berhasil diambil.');
  } catch (error: any) {
    return ApiResponse.error('Gagal mengambil laporan metrik.', error, 500);
  }
});
