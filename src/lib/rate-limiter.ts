/**
 * Simple in-memory rate limiter for development and staging environments.
 * 
 * NOTE: For production deployments, this store MUST be replaced with a distributed
 * database/cache backend like Redis or Memcached. In-memory tracking does not scale
 * across multiple serverless execution environments or container replicas and will
 * be reset on instance restarts.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

export interface RateLimiterOptions {
  limit: number;      // Maximum requests allowed within time window
  windowMs: number;   // Time window size in milliseconds
}

export interface RateLimiterResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

export function rateLimit(key: string, options: RateLimiterOptions): RateLimiterResult {
  const now = Date.now();
  const record = memoryStore.get(key);

  // If no record or time window has elapsed, initialize/reset request tracking
  if (!record || now > record.resetTime) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + options.windowMs
    };
    memoryStore.set(key, newRecord);
    return {
      success: true,
      limit: options.limit,
      remaining: options.limit - 1,
      resetTime: newRecord.resetTime
    };
  }

  // If requests exceed configuration limit, reject further actions
  if (record.count >= options.limit) {
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      resetTime: record.resetTime
    };
  }

  // Increment count
  record.count += 1;
  memoryStore.set(key, record);

  return {
    success: true,
    limit: options.limit,
    remaining: options.limit - record.count,
    resetTime: record.resetTime
  };
}
