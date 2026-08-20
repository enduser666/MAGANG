import { AsyncLocalStorage } from 'node:async_hooks';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { AppError } from './errors';

export interface RequestContext {
  requestId: string;
  userId?: string;
  startTime: number;
  endpoint: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export class Logger {
  private static getContext() {
    return requestContextStorage.getStore();
  }

  private static formatLog(level: 'INFO' | 'WARN' | 'ERROR' | 'AUDIT', message: string, meta: any = null) {
    const store = this.getContext();
    const payload: any = {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: store?.requestId || 'N/A',
      endpoint: store?.endpoint || 'N/A',
      userId: store?.userId || 'anonymous',
      executionTimeMs: store ? Date.now() - store.startTime : 0
    };
    if (meta) {
      if (meta instanceof Error) {
        payload.error = {
          message: meta.message,
          stack: meta.stack,
          name: meta.name
        };
      } else {
        payload.meta = meta;
      }
    }
    return JSON.stringify(payload);
  }

  public static info(message: string, meta: any = null) {
    console.log(this.formatLog('INFO', message, meta));
  }

  public static warn(message: string, meta: any = null) {
    console.warn(this.formatLog('WARN', message, meta));
  }

  public static error(message: string, meta: any = null, error: any = null) {
    console.error(this.formatLog('ERROR', message, error || meta));
  }

  public static audit(action: string, details: string, user: string, status: 'SUCCESS' | 'FAILED' = 'SUCCESS') {
    console.log(this.formatLog('AUDIT', `${action}: ${details}`, { action, details, user, status }));
  }
}

class MetricsCollector {
  private totalRequests = 0;
  private totalDuration = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private startTime = Date.now();

  public recordRequest(duration: number) {
    this.totalRequests++;
    this.totalDuration += duration;
  }

  public recordCacheHit() {
    this.cacheHits++;
  }

  public recordCacheMiss() {
    this.cacheMisses++;
  }

  public getMetrics() {
    return {
      totalRequests: this.totalRequests,
      averageRequestDurationMs: this.totalRequests > 0 ? this.totalDuration / this.totalRequests : 0,
      cacheHitCount: this.cacheHits,
      cacheMissCount: this.cacheMisses,
      memoryUsage: process.memoryUsage(),
      uptimeSeconds: (Date.now() - this.startTime) / 1000,
      timestamp: new Date().toISOString()
    };
  }
}

export const metricsCollector = new MetricsCollector();

export function withRequestContext(handler: (request: Request, ...args: any[]) => Promise<Response>) {
  return async (request: Request, ...args: any[]) => {
    const startTime = Date.now();
    const clientRequestId = request.headers.get('x-request-id');
    const requestId = clientRequestId || crypto.randomUUID();
    const url = new URL(request.url);

    const context: RequestContext = {
      requestId,
      startTime,
      endpoint: url.pathname
    };

    return requestContextStorage.run(context, async () => {
      try {
        const response = await handler(request, ...args);
        const duration = Date.now() - startTime;
        metricsCollector.recordRequest(duration);

        Logger.info(`Request completed: ${request.method} ${url.pathname} (${response.status})`, {
          method: request.method,
          status: response.status,
          durationMs: duration
        });

        response.headers.set('x-request-id', requestId);
        return response;
      } catch (err: any) {
        const duration = Date.now() - startTime;
        metricsCollector.recordRequest(duration);

        const appErr = AppError.from(err);
        Logger.error(`Request failed: ${request.method} ${url.pathname} (${appErr.statusCode})`, appErr);

        const errorString = appErr instanceof Error ? appErr.message : String(appErr);
        const res = NextResponse.json({
          success: false,
          data: null,
          message: appErr.message,
          error: errorString,
          meta: {
            timestamp: new Date().toISOString(),
            requestId
          }
        }, { status: appErr.statusCode });
        res.headers.set('x-request-id', requestId);
        return res;
      }
    });
  };
}
