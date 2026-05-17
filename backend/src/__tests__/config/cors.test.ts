import { describe, it, expect, afterEach } from '@jest/globals';
import express from 'express';
import cors from 'cors';
import request from 'supertest';
import { corsOptions } from '../../config/cors';

describe('CORS configuration', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCorsOrigin = process.env.CORS_ORIGIN;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalCorsOrigin === undefined) {
      delete process.env.CORS_ORIGIN;
    } else {
      process.env.CORS_ORIGIN = originalCorsOrigin;
    }
  });

  it('allows PATCH preflight requests for configured origins', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGIN = 'https://app.soundcheck.test';

    const app = express();
    app.use(cors(corsOptions));
    app.patch('/api/users/me', (_req, res) => res.json({ success: true }));

    const response = await request(app)
      .options('/api/users/me')
      .set('Origin', 'https://app.soundcheck.test')
      .set('Access-Control-Request-Method', 'PATCH');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('https://app.soundcheck.test');
    expect(response.headers['access-control-allow-methods']).toContain('PATCH');
  });

  it('allows requests with no origin', (done) => {
    const origin = corsOptions.origin;

    if (typeof origin !== 'function') {
      throw new Error('Expected function origin handler');
    }

    origin(undefined, (error, allow) => {
      expect(error).toBeNull();
      expect(allow).toBe(true);
      done();
    });
  });

  it('rejects production wildcard origins', (done) => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGIN = '*';
    const origin = corsOptions.origin;

    if (typeof origin !== 'function') {
      throw new Error('Expected function origin handler');
    }

    origin('https://app.soundcheck.test', (error, allow) => {
      expect(error?.message).toBe('Wildcard CORS not allowed in production');
      expect(allow).toBe(false);
      done();
    });
  });
});
