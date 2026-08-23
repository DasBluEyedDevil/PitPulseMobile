/**
 * Short-TTL auth user snapshot for authenticateToken / optionalAuth / WS verifyClient.
 *
 * Caller key is `user:{id}` (CacheKeys.user). setCache must never receive `cache:user:`.
 * Allowlist only — never persist email, names, DOB, profile image, or password hashes.
 */

import Database from '../../config/database';
import { CacheKeys, deleteCache, getCache, setCache } from '../../utils/cache';

export const AUTH_USER_CACHE_DEFAULT_TTL_SEC = 45;
export const AUTH_USER_CACHE_MAX_TTL_SEC = 60;

export const AUTH_USER_ALLOWLIST = ['id', 'isActive', 'isAdmin', 'isPremium', 'username'] as const;

export type AuthUser = {
  id: string;
  isActive: boolean;
  isAdmin: boolean;
  isPremium: boolean;
  username: string;
};

const AUTH_USER_SELECT = `
  SELECT id, username, is_active, is_admin, is_premium
  FROM users
  WHERE id = $1
`;

export function getAuthUserCacheTtlSec(): number {
  const raw = process.env.AUTH_USER_CACHE_TTL_SEC;
  if (raw === undefined || raw.trim() === '') {
    return AUTH_USER_CACHE_DEFAULT_TTL_SEC;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return AUTH_USER_CACHE_DEFAULT_TTL_SEC;
  }
  if (parsed === 0) {
    return 0;
  }
  return Math.min(parsed, AUTH_USER_CACHE_MAX_TTL_SEC);
}

export function projectAuthUser(value: unknown): AuthUser | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || record.id.length === 0) {
    return null;
  }
  if (typeof record.username !== 'string') {
    return null;
  }

  return {
    id: record.id,
    isActive: record.isActive === true,
    isAdmin: record.isAdmin === true,
    isPremium: record.isPremium === true,
    username: record.username,
  };
}

function authUserFromDbRow(row: Record<string, unknown> | undefined): AuthUser | null {
  if (!row || typeof row.id !== 'string' || row.id.length === 0) {
    return null;
  }

  return {
    id: row.id,
    isActive: row.is_active === true,
    isAdmin: row.is_admin === true,
    isPremium: row.is_premium === true,
    username: typeof row.username === 'string' ? row.username : '',
  };
}

export async function getAuthUser(userId: string): Promise<AuthUser | null> {
  const ttlSeconds = getAuthUserCacheTtlSec();
  const key = CacheKeys.user(userId);

  if (ttlSeconds > 0) {
    const cached = await getCache<unknown>(key);
    const projected = projectAuthUser(cached);
    if (projected) {
      return projected;
    }
  }

  const result = await Database.getInstance().query(AUTH_USER_SELECT, [userId]);
  const snapshot = authUserFromDbRow(result.rows[0]);
  if (!snapshot) {
    return null;
  }

  if (ttlSeconds > 0) {
    await setCache(key, snapshot, ttlSeconds);
  }

  return snapshot;
}

export async function invalidateAuthUserCache(userId: string): Promise<void> {
  await deleteCache(CacheKeys.user(userId));
}
