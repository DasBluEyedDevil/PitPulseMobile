import { CorsOptions } from 'cors';
import { logError, logWarn } from '../utils/logger';

export const corsOptions: CorsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // In production, require explicit CORS_ORIGIN configuration
    const corsOrigin = process.env.CORS_ORIGIN;
    if (!corsOrigin) {
      logError('CORS: CORS_ORIGIN not configured, rejecting request from:', { origin });
      return callback(new Error('CORS not configured'), false);
    }
    if (corsOrigin === '*') {
      if (process.env.NODE_ENV === 'production') {
        logError('CORS: Wildcard origin not allowed in production');
        return callback(new Error('Wildcard CORS not allowed in production'), false);
      }
      return callback(null, true);
    }

    const allowedOrigins = corsOrigin.split(',').map((o) => o.trim());
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Reject unknown origins in production
    logWarn('CORS: Rejected origin:', { origin });
    callback(new Error('Not allowed by CORS'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
};
