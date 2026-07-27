import Database from '../../config/database';
import { AuditService } from '../../services/AuditService';
import logger from '../../utils/logger';

jest.mock('../../config/database');
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

const db = { query: jest.fn() };
(Database.getInstance as jest.Mock).mockReturnValue(db);
const loggerMock = logger as unknown as { error: jest.Mock };

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockReset();
    service = new AuditService();
  });

  it.each([
    [{ 'x-forwarded-for': '203.0.113.1, 10.0.0.1' }, {}, '203.0.113.1'],
    [{ 'x-forwarded-for': ['203.0.113.2', '10.0.0.2'] }, {}, '203.0.113.2'],
    [{ 'x-real-ip': '203.0.113.3' }, {}, '203.0.113.3'],
    [{ 'x-real-ip': ['203.0.113.4'] }, {}, '203.0.113.4'],
    [{}, { remoteAddress: '203.0.113.5' }, '203.0.113.5'],
    [{}, {}, null],
  ])('logs JSON metadata with the resolved request IP %#', async (headers, socket, expectedIp) => {
    db.query.mockResolvedValueOnce({ rows: [] });

    await service.log('user-1', 'CREATE', 'checkins', 'checkin-1', { venueName: 'Test Hall' }, {
      headers: { ...headers, 'user-agent': 'SoundCheck-Test/1.0' },
      socket,
    } as any);

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO audit_logs'), [
      'user-1',
      'CREATE',
      'checkins',
      'checkin-1',
      JSON.stringify({ venueName: 'Test Hall' }),
      expectedIp,
      'SoundCheck-Test/1.0',
    ]);
  });

  it('uses null request context and default metadata when no request is provided', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    await service.log(null, 'LOGIN', 'users');

    expect(db.query).toHaveBeenCalledWith(expect.any(String), [
      null,
      'LOGIN',
      'users',
      null,
      '{}',
      null,
      null,
    ]);
  });

  it('maps all query filters, pagination, and result fields', async () => {
    const startDate = new Date('2026-07-01T00:00:00.000Z');
    const endDate = new Date('2026-07-31T23:59:59.999Z');
    const createdAt = new Date('2026-07-26T12:00:00.000Z');
    db.query.mockResolvedValueOnce({ rows: [{ count: '5' }] }).mockResolvedValueOnce({
      rows: [
        {
          id: 'audit-1',
          user_id: 'user-1',
          action: 'UPDATE',
          resource_type: 'users',
          resource_id: 'user-1',
          metadata: { updatedFields: ['bio'] },
          ip_address: '203.0.113.1',
          user_agent: 'SoundCheck-Test/1.0',
          created_at: createdAt,
        },
      ],
    });

    await expect(
      service.query({
        userId: 'user-1',
        action: 'UPDATE',
        resourceType: 'users',
        startDate,
        endDate,
        limit: 2,
        offset: 1,
      })
    ).resolves.toEqual({
      logs: [
        {
          id: 'audit-1',
          userId: 'user-1',
          action: 'UPDATE',
          resourceType: 'users',
          resourceId: 'user-1',
          metadata: { updatedFields: ['bio'] },
          ipAddress: '203.0.113.1',
          userAgent: 'SoundCheck-Test/1.0',
          createdAt,
        },
      ],
      total: 5,
      hasMore: true,
    });

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining(
        'WHERE user_id = $1 AND action = $2 AND resource_type = $3 AND created_at >= $4 AND created_at <= $5'
      ),
      ['user-1', 'UPDATE', 'users', startDate, endDate]
    );
    expect(db.query).toHaveBeenNthCalledWith(2, expect.stringContaining('LIMIT $6 OFFSET $7'), [
      'user-1',
      'UPDATE',
      'users',
      startDate,
      endDate,
      2,
      1,
    ]);
  });

  it('uses default query pagination and normalizes missing metadata', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ count: '1' }] }).mockResolvedValueOnce({
      rows: [
        {
          id: 'audit-2',
          user_id: null,
          action: 'LOGIN',
          resource_type: 'users',
          resource_id: null,
          metadata: null,
          ip_address: null,
          user_agent: null,
          created_at: new Date('2026-07-26T12:00:00.000Z'),
        },
      ],
    });

    const result = await service.query();

    expect(result.logs[0].metadata).toEqual({});
    expect(result.hasMore).toBe(false);
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('LIMIT $1 OFFSET $2'),
      [50, 0]
    );
  });

  it('returns user audit history through the filtered query contract', async () => {
    const log = {
      id: 'audit-3',
      userId: 'user-3',
      action: 'EXPORT' as const,
      resourceType: 'users',
      resourceId: 'user-3',
      metadata: {},
      ipAddress: null,
      userAgent: null,
      createdAt: new Date(),
    };
    const query = jest
      .spyOn(service, 'query')
      .mockResolvedValue({ logs: [log], total: 1, hasMore: false });

    await expect(service.getUserAuditHistory('user-3', 25)).resolves.toEqual([log]);
    expect(query).toHaveBeenCalledWith({ userId: 'user-3', limit: 25 });
  });

  it('maps every convenience event to the canonical audit action and resource', () => {
    const log = jest.spyOn(service, 'log').mockResolvedValue(undefined);
    const request = { headers: {}, socket: {} } as any;
    const scheduledAt = new Date('2026-08-01T12:00:00.000Z');

    service.logUserCreated('user-1', request);
    service.logProfileUpdated('user-1', ['bio', 'username'], request);
    service.logUserDeleted('user-1', scheduledAt, request);
    service.logDataExport('user-1', request);
    service.logLoginSuccess('user-1', 'password', request);
    service.logLoginFailure('user@example.com', 'invalid_password', request);
    service.logLogout('user-1', request);
    service.logSocialAuthLinked('user-1', 'google', request);
    service.logCheckinCreated('user-1', 'checkin-1', { eventId: 'event-1' }, request);
    service.logBadgeAwarded('user-1', 'badge-1', 'Night Owl', request);

    expect(log.mock.calls).toEqual([
      ['user-1', 'CREATE', 'users', 'user-1', {}, request],
      ['user-1', 'UPDATE', 'users', 'user-1', { updatedFields: ['bio', 'username'] }, request],
      ['user-1', 'DELETE', 'users', 'user-1', { scheduledAt: '2026-08-01T12:00:00.000Z' }, request],
      ['user-1', 'EXPORT', 'users', 'user-1', {}, request],
      ['user-1', 'LOGIN', 'users', 'user-1', { success: true, method: 'password' }, request],
      [
        null,
        'LOGIN',
        'users',
        null,
        {
          success: false,
          email: 'user@example.com',
          reason: 'invalid_password',
        },
        request,
      ],
      ['user-1', 'LOGOUT', 'refresh_tokens', null, {}, request],
      [
        'user-1',
        'PERMISSION_CHANGE',
        'users',
        'user-1',
        { provider: 'google', action: 'linked' },
        request,
      ],
      ['user-1', 'CREATE', 'checkins', 'checkin-1', { eventId: 'event-1' }, request],
      ['user-1', 'CREATE', 'user_badges', 'badge-1', { badgeName: 'Night Owl' }, request],
    ]);
  });

  it('keeps convenience logging fire-and-forget and reports failures', async () => {
    jest.spyOn(service, 'log').mockRejectedValue(new Error('audit database unavailable'));

    service.logLogout('user-1');
    await new Promise((resolve) => setImmediate(resolve));

    expect(loggerMock.error).toHaveBeenCalledWith(
      '[AuditService] Log failed',
      expect.objectContaining({ error: 'audit database unavailable' })
    );
  });
});
