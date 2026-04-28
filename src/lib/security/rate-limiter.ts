/**
 * Simple in-memory rate limiter
 * For production, use Redis-based rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((entry, key) => {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  });
}, 60000); // Clean every minute

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
}

export const RATE_LIMITS = {
  // Auth endpoints - stricter limits
  AUTH_SIGNIN: { windowMs: 15 * 60 * 1000, maxRequests: 5 },  // 5 attempts per 15 min
  AUTH_SIGNUP: { windowMs: 60 * 60 * 1000, maxRequests: 5 },  // 5 signups per hour
  AUTH_FORGOT_PASSWORD: { windowMs: 60 * 60 * 1000, maxRequests: 3 },  // 3 per hour
  AUTH_RESET_PASSWORD: { windowMs: 15 * 60 * 1000, maxRequests: 5 },  // 5 per 15 min
  
  // API endpoints - more lenient
  API_GENERAL: { windowMs: 60 * 1000, maxRequests: 60 },  // 60 per minute
  API_CREATE_POST: { windowMs: 60 * 60 * 1000, maxRequests: 10 },  // 10 posts per hour
  API_SEND_MESSAGE: { windowMs: 60 * 1000, maxRequests: 30 },  // 30 messages per minute
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param endpoint - The endpoint being rate limited
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${endpoint}:${identifier}`;
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);
  
  // Reset if window has passed
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
  }
  
  entry.count++;
  rateLimitStore.set(key, entry);
  
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const allowed = entry.count <= config.maxRequests;
  
  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
  };
}

/**
 * Get client IP from request
 */
export function getClientIP(request: Request): string {
  // Check various headers for the real IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback
  return 'unknown';
}

/**
 * Rate limit middleware helper
 */
export function rateLimitResponse(result: RateLimitResult) {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetTime.toString(),
        'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
      },
    }
  );
}

