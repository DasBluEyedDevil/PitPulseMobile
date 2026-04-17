import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OAuthStateError, SocialAuthService } from '../services/SocialAuthService';
import { AuditService } from '../services/AuditService';
import { ApiResponse } from '../types';
import { logError, logInfo } from '../utils/logger';
import { rateLimit } from '../middleware/auth';

const router = Router();
const socialAuthService = new SocialAuthService();
const auditService = new AuditService();

// Validation schemas (32-byte hex state from GET /api/auth/social/state)
const oauthStateSchema = z.string().length(64, 'OAuth state must be a 64-character hex string');

const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'ID token is required'),
  state: oauthStateSchema,
});

const appleAuthSchema = z.object({
  identityToken: z.string().min(1, 'Identity token is required'),
  state: oauthStateSchema,
  fullName: z
    .object({
      givenName: z.string().optional(),
      familyName: z.string().optional(),
    })
    .optional(),
});

/**
 * GET /api/auth/social/state
 * Returns a one-time CSRF state (stored in Redis, 5 min TTL). Required for Google/Apple sign-in.
 */
router.get('/state', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const state = await socialAuthService.generateOAuthState();
    const response: ApiResponse = {
      success: true,
      data: { state },
    };
    res.status(200).json(response);
  } catch (error) {
    if (error instanceof OAuthStateError) {
      const response: ApiResponse = {
        success: false,
        error: error.message,
      };
      res.status(503).json(response);
      return;
    }
    next(error);
  }
});

/**
 * POST /api/auth/social/google
 * Authenticate with Google ID token
 *
 * Request body:
 * - idToken: string - The Google ID token from mobile client
 *
 * Response:
 * - user: User object
 * - token: JWT access token
 * - refreshToken: Refresh token for token renewal
 * - isNewUser: boolean - Whether this is a newly created account
 */
router.post(
  '/google',
  rateLimit(15 * 60 * 1000, 5), // 5 attempts per 15 minutes
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const validation = googleAuthSchema.safeParse(req.body);
      if (!validation.success) {
        const response: ApiResponse = {
          success: false,
          error: validation.error.errors[0]?.message || 'Invalid request',
        };
        res.status(400).json(response);
        return;
      }

      const { idToken, state } = validation.data;

      // Verify the Google token
      const profile = await socialAuthService.verifyGoogleToken(idToken, state);
      if (!profile) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid or expired Google token',
        };
        res.status(401).json(response);
        return;
      }

      // Authenticate or create user
      const result = await socialAuthService.authenticateOrCreate(profile);

      logInfo('Google social auth successful', {
        userId: result.user.id,
        isNewUser: result.isNewUser,
      });

      // Audit log: social auth login success
      auditService.logLoginSuccess(result.user.id, 'google', req);

      // If this is a linking to existing account (not new user but first time with this provider)
      if (!result.isNewUser) {
        auditService.logSocialAuthLinked(result.user.id, 'google', req);
      }

      const response: ApiResponse = {
        success: true,
        data: {
          user: result.user,
          token: result.token,
          refreshToken: result.refreshToken,
          isNewUser: result.isNewUser,
        },
      };

      res.status(result.isNewUser ? 201 : 200).json(response);
    } catch (error: any) {
      logError('Google social auth failed', { error: error.message });

      // Handle known error messages
      if (error.message === 'Account is deactivated') {
        const response: ApiResponse = {
          success: false,
          error: 'Account is deactivated',
        };
        res.status(403).json(response);
        return;
      }

      if (error.message === 'Email is required for new social sign-in') {
        const response: ApiResponse = {
          success: false,
          error: 'Email is required for new social sign-in',
        };
        res.status(400).json(response);
        return;
      }

      // API-063: Return 401 for auth failures instead of falling through to 500
      const statusCode =
        error instanceof Error &&
        (error.message.includes('token') ||
          error.message.includes('auth') ||
          error.message.includes('Authentication'))
          ? 401
          : 500;
      const response: ApiResponse = {
        success: false,
        error: statusCode === 401 ? 'Authentication failed' : 'An unexpected error occurred',
      };
      res.status(statusCode).json(response);
    }
  }
);

/**
 * POST /api/auth/social/apple
 * Authenticate with Apple identity token
 *
 * Request body:
 * - identityToken: string - The Apple identity token from mobile client
 * - fullName: { givenName?: string, familyName?: string } - Optional, only on first sign-in
 *
 * Response:
 * - user: User object
 * - token: JWT access token
 * - refreshToken: Refresh token for token renewal
 * - isNewUser: boolean - Whether this is a newly created account
 */
router.post(
  '/apple',
  rateLimit(15 * 60 * 1000, 5), // 5 attempts per 15 minutes
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const validation = appleAuthSchema.safeParse(req.body);
      if (!validation.success) {
        const response: ApiResponse = {
          success: false,
          error: validation.error.errors[0]?.message || 'Invalid request',
        };
        res.status(400).json(response);
        return;
      }

      const { identityToken, fullName, state } = validation.data;

      // Verify the Apple token
      const profile = await socialAuthService.verifyAppleToken(identityToken, fullName, state);
      if (!profile) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid or expired Apple token',
        };
        res.status(401).json(response);
        return;
      }

      // Authenticate or create user
      const result = await socialAuthService.authenticateOrCreate(profile);

      logInfo('Apple social auth successful', {
        userId: result.user.id,
        isNewUser: result.isNewUser,
      });

      // Audit log: social auth login success
      auditService.logLoginSuccess(result.user.id, 'apple', req);

      // If this is a linking to existing account (not new user but first time with this provider)
      if (!result.isNewUser) {
        auditService.logSocialAuthLinked(result.user.id, 'apple', req);
      }

      const response: ApiResponse = {
        success: true,
        data: {
          user: result.user,
          token: result.token,
          refreshToken: result.refreshToken,
          isNewUser: result.isNewUser,
        },
      };

      res.status(result.isNewUser ? 201 : 200).json(response);
    } catch (error: any) {
      logError('Apple social auth failed', { error: error.message });

      // Handle known error messages
      if (error.message === 'Account is deactivated') {
        const response: ApiResponse = {
          success: false,
          error: 'Account is deactivated',
        };
        res.status(403).json(response);
        return;
      }

      if (error.message === 'Email is required for new social sign-in') {
        const response: ApiResponse = {
          success: false,
          error: 'Email is required for new social sign-in',
        };
        res.status(400).json(response);
        return;
      }

      // API-063: Return 401 for auth failures instead of falling through to 500
      const statusCode =
        error instanceof Error &&
        (error.message.includes('token') ||
          error.message.includes('auth') ||
          error.message.includes('Authentication'))
          ? 401
          : 500;
      const appleResponse: ApiResponse = {
        success: false,
        error: statusCode === 401 ? 'Authentication failed' : 'An unexpected error occurred',
      };
      res.status(statusCode).json(appleResponse);
    }
  }
);

export default router;
