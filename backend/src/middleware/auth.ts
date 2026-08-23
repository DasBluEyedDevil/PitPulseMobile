import { Request, Response, NextFunction } from 'express';
import { getAuthUser } from '../services/user/authUserCache';
import { User } from '../types';
import { AuthUtils } from '../utils/auth';
import logger from '../utils/logger';
import {
  buildIpRateLimitKey,
  checkRateLimit,
  getRedis,
  resolveIpRateLimitScope,
} from '../utils/redisRateLimiter';
import { setUser as sentrySetUser } from '../utils/sentry';
import { buildErrorResponseForStatus } from './validate';

export interface AuthenticatedRequest extends Request {
  user: User;
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json(buildErrorResponseForStatus(401, 'Access token required'));
      return;
    }

    const payload = AuthUtils.verifyToken(token);
    if (!payload) {
      res.status(401).json(buildErrorResponseForStatus(401, 'Invalid or expired token'));
      return;
    }

    const user = await getAuthUser(payload.userId);

    if (!user || !user.isActive) {
      res.status(401).json(buildErrorResponseForStatus(401, 'User not found or inactive'));
      return;
    }

    req.user = user as User;
    // Enrich Sentry error context with authenticated user
    sentrySetUser({ id: user.id, username: user.username });

    next();
  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json(buildErrorResponseForStatus(500, 'Authentication failed'));
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthUtils.extractTokenFromHeader(authHeader);

    if (token) {
      const payload = AuthUtils.verifyToken(token);
      if (payload) {
        const user = await getAuthUser(payload.userId);

        if (user && user.isActive) {
          req.user = user as User;
          sentrySetUser({ id: user.id, username: user.username });
        }
      }
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Continue without authentication
    next();
  }
};

/**
 * Middleware to require admin privileges
 */
export const requireAdmin = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json(buildErrorResponseForStatus(401, 'Authentication required'));
      return;
    }

    if (!user.isAdmin) {
      res.status(403).json(buildErrorResponseForStatus(403, 'Admin privileges required'));
      return;
    }

    next();
  };
};

/**
 * Middleware to require premium subscription
 */
export const requirePremium = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json(buildErrorResponseForStatus(401, 'Authentication required'));
      return;
    }

    if (!user.isPremium) {
      res
        .status(403)
        .json(buildErrorResponseForStatus(403, 'SoundCheck Pro subscription required'));
      return;
    }

    next();
  };
};

/**
 * Rate limiting middleware
 *
 * Uses Redis when available for distributed rate limiting across instances.
 * Falls back to bounded in-memory limits when Redis is unavailable so auth
 * endpoints fail degraded instead of taking the API offline.
 */
const inMemoryRateLimitStore = new Map<string, { count: number; resetTime: number }>();

// INF-018: Cap in-memory rate limit map to prevent unbounded memory growth.
// At 10,000 entries (~1KB each), the map uses ~10MB -- acceptable for the
// fallback case. If this limit is reached, expired entries are purged first.
const MAX_RATE_LIMIT_ENTRIES = 10_000;

// Sensitive endpoints worth surfacing when Redis-backed limits degrade.
const CRITICAL_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/revoke',
  '/auth/social/google',
  '/auth/social/apple',
  '/upload',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/revoke',
  '/api/auth/social/google',
  '/api/auth/social/apple',
  '/api/users/login',
  '/api/users/register',
  '/api/tokens/refresh',
  '/api/tokens/revoke',
  '/api/upload',
];

/**
 * Check if endpoint is sensitive.
 */
function isCriticalEndpoint(path: string): boolean {
  return CRITICAL_ENDPOINTS.some((endpoint) => path.startsWith(endpoint));
}

function requestPathForRateLimit(req: Request): string {
  const rawPath = req.originalUrl || req.path || '';
  return rawPath.split('?')[0] || req.path;
}

/**
 * In-memory rate limit check (fallback when Redis unavailable).
 *
 * Keys are the same shape as Redis (`rate_limit:${scope}:${ip}:${windowMs}`)
 * so login cannot share a counter with /api/bands.
 *
 * At MAX_RATE_LIMIT_ENTRIES after purge: auth/login fail-closed (429);
 * non-critical routes may fail-open without tracking (KD-16).
 */
function checkInMemoryRateLimit(
  storeKey: string,
  windowMs: number,
  maxRequests: number,
  failClosed: boolean
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const clientData = inMemoryRateLimitStore.get(storeKey);

  if (!clientData || now > clientData.resetTime) {
    const resetTime = now + windowMs;
    // Enforce max size before adding new entries
    if (
      inMemoryRateLimitStore.size >= MAX_RATE_LIMIT_ENTRIES &&
      !inMemoryRateLimitStore.has(storeKey)
    ) {
      // Purge expired entries first
      for (const [key, data] of inMemoryRateLimitStore.entries()) {
        if (now > data.resetTime) {
          inMemoryRateLimitStore.delete(key);
        }
      }
      if (inMemoryRateLimitStore.size >= MAX_RATE_LIMIT_ENTRIES) {
        if (failClosed) {
          return { allowed: false, remaining: 0, resetAt: resetTime };
        }
        // Non-auth GET/browse: fail-open for memory safety (A-013 / KD-16)
        return { allowed: true, remaining: maxRequests - 1, resetAt: resetTime };
      }
    }
    inMemoryRateLimitStore.set(storeKey, {
      count: 1,
      resetTime,
    });
    return { allowed: true, remaining: maxRequests - 1, resetAt: resetTime };
  }

  if (clientData.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: clientData.resetTime };
  }

  clientData.count++;
  return {
    allowed: true,
    remaining: maxRequests - clientData.count,
    resetAt: clientData.resetTime,
  };
}

function setRateLimitHeaders(
  res: Response,
  maxRequests: number,
  remaining: number,
  resetAt: number
): void {
  res.setHeader('X-RateLimit-Limit', maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining).toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000).toString());
}

function sendRateLimitExceeded(res: Response, context?: { scope: string; path: string }): void {
  if (context) {
    logger.warn('Rate limit exceeded', { scope: context.scope, path: context.path });
  }
  res
    .status(429)
    .json(buildErrorResponseForStatus(429, 'Too many requests, please try again later'));
}

export const rateLimit = (windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
    const requestPath = requestPathForRateLimit(req);
    const isCritical = isCriticalEndpoint(requestPath) || isCriticalEndpoint(req.path);
    const scope = resolveIpRateLimitScope(requestPath);
    const key = buildIpRateLimitKey(scope, clientIP, windowMs);

    try {
      // Try Redis first
      if (getRedis()) {
        const result = await checkRateLimit(key, maxRequests, windowMs);

        setRateLimitHeaders(res, maxRequests, result.remaining, result.resetAt);

        if (!result.allowed) {
          sendRateLimitExceeded(res, { scope, path: requestPath });
          return;
        }

        next();
        return;
      }

      if (isCritical) {
        logger.warn('Redis rate limiting unavailable for sensitive endpoint, using fallback', {
          path: requestPath,
          scope,
        });
      }

      const result = checkInMemoryRateLimit(key, windowMs, maxRequests, isCritical);
      setRateLimitHeaders(res, maxRequests, result.remaining, result.resetAt);

      if (!result.allowed) {
        sendRateLimitExceeded(res, { scope, path: requestPath });
        return;
      }

      next();
    } catch (error) {
      logger.error('Rate limit error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (isCritical) {
        logger.warn('Redis rate limiting failed for sensitive endpoint, using fallback', {
          path: requestPath,
          scope,
        });
      }

      // Redis-throw is not fail-open on login: in-memory still tracks,
      // and overflow on critical paths fail-closes (429).
      const result = checkInMemoryRateLimit(key, windowMs, maxRequests, isCritical);
      setRateLimitHeaders(res, maxRequests, result.remaining, result.resetAt);
      if (!result.allowed) {
        sendRateLimitExceeded(res, { scope, path: requestPath });
        return;
      }

      next();
    }
  };
};

/** Test-only: empty the process-local IP limiter fallback store. */
export function resetInMemoryRateLimitStoreForTests(): void {
  inMemoryRateLimitStore.clear();
}

/** Test-only: fill the fallback store with `count` unexpired entries. */
export function seedInMemoryRateLimitStoreForTests(count: number): void {
  const resetTime = Date.now() + 60 * 60 * 1000;
  inMemoryRateLimitStore.clear();
  for (let i = 0; i < count; i += 1) {
    inMemoryRateLimitStore.set(`__seed:${i}`, { count: 1, resetTime });
  }
}

export const IN_MEMORY_RATE_LIMIT_MAX_ENTRIES = MAX_RATE_LIMIT_ENTRIES;

/**
 * Clean up expired in-memory rate limit entries
 */
export const cleanupRateLimit = (): void => {
  const now = Date.now();
  for (const [key, data] of inMemoryRateLimitStore.entries()) {
    if (now > data.resetTime) {
      inMemoryRateLimitStore.delete(key);
    }
  }
};

// Clean up in-memory store every 5 minutes
setInterval(cleanupRateLimit, 5 * 60 * 1000).unref();

/**
 * Timing attack prevention middleware
 * SEC-007/CFR-015: Add random jitter to enumeration endpoint responses
 * to prevent timing-based username/email enumeration attacks.
 *
 * Adds a random delay between 50-150ms to ensure both "available" and
 * "unavailable" responses take similar time.
 */
export const addJitter = (minMs: number = 50, maxMs: number = 150) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;

    // Store original end function
    const originalEnd = res.end.bind(res);

    // Override end to add delay before sending response
    res.end = function (_chunk?: any, _encoding?: any, _cb?: any): Response {
      const args = arguments;

      setTimeout(() => {
        originalEnd.apply(res, args as any);
      }, delay);

      return res;
    } as any;

    // Also wrap json/send for cases where end isn't called directly
    const originalJson = res.json.bind(res);
    res.json = function (body: any): Response {
      setTimeout(() => {
        originalJson(body);
      }, delay);
      return res;
    };

    const originalSend = res.send.bind(res);
    res.send = function (body: any): Response {
      setTimeout(() => {
        originalSend(body);
      }, delay);
      return res;
    };

    next();
  };
};
