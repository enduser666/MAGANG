import { NextResponse } from 'next/server';
import { requestContextStorage } from './observability';

export interface ApiResponsePayload<T = any> {
  success: boolean;
  data: T | null;
  message: string;
  error: string | null;
  meta: Record<string, any>;
}

export class ApiResponse {
  static success<T = any>(
    data: T, 
    message = 'Operasi berhasil dilakukan', 
    meta: Record<string, any> = {}
  ): NextResponse<ApiResponsePayload<T>> {
    const store = requestContextStorage.getStore();
    return NextResponse.json({
      success: true,
      data,
      message,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: store?.requestId || undefined,
        ...meta
      }
    });
  }

  static error(
    message: string, 
    error: any = null, 
    status = 500, 
    meta: Record<string, any> = {}
  ): NextResponse<ApiResponsePayload<null>> {
    const store = requestContextStorage.getStore();
    const errorString = error instanceof Error ? error.message : String(error || message);
    return NextResponse.json({
      success: false,
      data: null,
      message,
      error: errorString,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: store?.requestId || undefined,
        ...meta
      }
    }, { status });
  }
}
