import { ModerationService } from '../../services/ModerationService';

const mockFeedService = {
  invalidateUserFeedCache: jest.fn(),
  invalidateEventFeedCache: jest.fn(),
};

jest.mock('../../services/FeedService', () => ({
  FeedService: jest.fn(() => mockFeedService),
}));
jest.mock('../../utils/logger', () => ({
  logDebug: jest.fn(),
  logError: jest.fn(),
  logHttp: jest.fn(),
  logInfo: jest.fn(),
  logWarn: jest.fn(),
}));

const pendingRow = {
  id: 'moderation-1',
  content_type: 'photo',
  content_id: 'checkin-1',
  source: 'auto_safesearch',
  report_id: null,
  safesearch_results: { adult: 'LIKELY' },
  status: 'pending_review',
  reviewed_by: null,
  reviewed_at: null,
  action_taken: null,
  created_at: '2026-07-26T12:00:00.000Z',
};

describe('ModerationService', () => {
  const db = { query: jest.fn() };
  let service: ModerationService;

  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockReset();
    mockFeedService.invalidateUserFeedCache.mockResolvedValue(undefined);
    mockFeedService.invalidateEventFeedCache.mockResolvedValue(undefined);
    service = new ModerationService(db as any);
  });

  it('creates and maps a SafeSearch moderation item', async () => {
    db.query.mockResolvedValueOnce({ rows: [pendingRow] });

    await expect(
      service.createModerationItem({
        contentType: 'photo',
        contentId: 'checkin-1',
        source: 'auto_safesearch',
        safesearchResults: { adult: 'LIKELY' },
      })
    ).resolves.toEqual({
      id: 'moderation-1',
      contentType: 'photo',
      contentId: 'checkin-1',
      source: 'auto_safesearch',
      reportId: undefined,
      safesearchResults: { adult: 'LIKELY' },
      status: 'pending_review',
      reviewedBy: undefined,
      reviewedAt: undefined,
      actionTaken: undefined,
      createdAt: '2026-07-26T12:00:00.000Z',
    });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO moderation_items'), [
      'photo',
      'checkin-1',
      'auto_safesearch',
      null,
      JSON.stringify({ adult: 'LIKELY' }),
    ]);
  });

  it('stores report-backed items without synthetic SafeSearch data', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        {
          ...pendingRow,
          source: 'user_report',
          report_id: 'report-1',
          safesearch_results: null,
        },
      ],
    });

    await service.createModerationItem({
      contentType: 'comment',
      contentId: 'comment-1',
      source: 'user_report',
      reportId: 'report-1',
    });

    expect(db.query).toHaveBeenCalledWith(expect.any(String), [
      'comment',
      'comment-1',
      'user_report',
      'report-1',
      null,
    ]);
  });

  it.each([
    ['checkin', 'UPDATE checkins SET is_hidden = true'],
    ['photo', 'UPDATE checkins SET is_hidden = true'],
    ['comment', 'UPDATE checkin_comments SET is_hidden = true'],
  ] as const)('auto-hides %s content and schedules cache invalidation', async (type, query) => {
    db.query.mockResolvedValue({ rows: [] });
    const invalidate = jest
      .spyOn(service as any, 'invalidateFeedCachesForContent')
      .mockResolvedValue(undefined);

    await service.autoHideContent(type, 'content-1');

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining(query), ['content-1']);
    expect(invalidate).toHaveBeenCalledWith(type, 'content-1');
  });

  it('does not issue content updates for user or unknown moderation types', async () => {
    await service.autoHideContent('user', 'user-1');
    await service.autoHideContent('unknown' as any, 'unknown-1');

    expect(db.query).not.toHaveBeenCalled();
  });

  it('returns paginated pending items and a numeric total', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [pendingRow] })
      .mockResolvedValueOnce({ rows: [{ count: '7' }] });

    await expect(service.getPendingItems(3, 2)).resolves.toEqual({
      items: [expect.objectContaining({ id: 'moderation-1', contentType: 'photo' })],
      total: 7,
    });
    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("WHERE status = 'pending_review'"),
      [2, 4]
    );
  });

  it('returns null for a missing item and a mapped item when present', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [pendingRow] });

    await expect(service.getItemById('missing')).resolves.toBeNull();
    await expect(service.getItemById('moderation-1')).resolves.toEqual(
      expect.objectContaining({ id: 'moderation-1', contentId: 'checkin-1' })
    );
  });

  it('rejects review of a missing moderation item', async () => {
    jest.spyOn(service, 'getItemById').mockResolvedValue(null);

    await expect(service.reviewItem('missing', 'admin-1', 'removed')).rejects.toMatchObject({
      message: 'Moderation item not found: missing',
      statusCode: 404,
    });
  });

  it('unhides approved content after recording the review', async () => {
    jest.spyOn(service, 'getItemById').mockResolvedValue({
      id: 'moderation-1',
      contentType: 'photo',
      contentId: 'checkin-1',
      source: 'auto_safesearch',
      status: 'pending_review',
      createdAt: '2026-07-26T12:00:00.000Z',
    });
    db.query.mockResolvedValueOnce({
      rows: [
        {
          ...pendingRow,
          status: 'reviewed',
          action_taken: 'approved',
          reviewed_by: 'admin-1',
        },
      ],
    });
    const invalidate = jest
      .spyOn(service as any, 'invalidateFeedCachesForContent')
      .mockResolvedValue(undefined);

    await expect(service.reviewItem('moderation-1', 'admin-1', 'approved')).resolves.toEqual(
      expect.objectContaining({ actionTaken: 'approved', reviewedBy: 'admin-1' })
    );

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('UPDATE moderation_items'),
      ['admin-1', 'approved', 'moderation-1']
    );
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE checkins SET is_hidden = false'),
      ['checkin-1']
    );
    expect(invalidate).toHaveBeenCalledWith('photo', 'checkin-1');
  });

  it('actions related reports when content is removed', async () => {
    jest.spyOn(service, 'getItemById').mockResolvedValue({
      id: 'moderation-1',
      contentType: 'comment',
      contentId: 'comment-1',
      source: 'user_report',
      status: 'pending_review',
      createdAt: '2026-07-26T12:00:00.000Z',
    });
    db.query.mockResolvedValueOnce({
      rows: [
        {
          ...pendingRow,
          content_type: 'comment',
          content_id: 'comment-1',
          status: 'reviewed',
          action_taken: 'removed',
        },
      ],
    });

    await service.reviewItem('moderation-1', 'admin-1', 'removed');

    expect(db.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("UPDATE reports SET status = 'actioned'"),
      ['comment', 'comment-1']
    );
  });

  it('records a warning without changing content or reports', async () => {
    jest.spyOn(service, 'getItemById').mockResolvedValue({
      id: 'moderation-1',
      contentType: 'photo',
      contentId: 'checkin-1',
      source: 'auto_safesearch',
      status: 'pending_review',
      createdAt: '2026-07-26T12:00:00.000Z',
    });
    db.query.mockResolvedValueOnce({
      rows: [{ ...pendingRow, status: 'reviewed', action_taken: 'user_warned' }],
    });

    await service.reviewItem('moderation-1', 'admin-1', 'user_warned');

    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('invalidates follower, author, and event feeds for hidden check-ins', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ user_id: 'author-1', event_id: 'event-1' }] })
      .mockResolvedValueOnce({
        rows: [{ follower_id: 'follower-1' }, { follower_id: 'follower-2' }],
      });

    await (service as any).invalidateFeedCachesForContent('checkin', 'checkin-1');

    expect(mockFeedService.invalidateUserFeedCache.mock.calls).toEqual([
      ['follower-1'],
      ['follower-2'],
      ['author-1'],
    ]);
    expect(mockFeedService.invalidateEventFeedCache).toHaveBeenCalledWith('event-1');
  });

  it('resolves comment parents before invalidating feeds', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ checkin_id: 'checkin-2' }] })
      .mockResolvedValueOnce({ rows: [{ user_id: 'author-2', event_id: null }] })
      .mockResolvedValueOnce({ rows: [] });

    await (service as any).invalidateFeedCachesForContent('comment', 'comment-1');

    expect(mockFeedService.invalidateUserFeedCache).toHaveBeenCalledWith('author-2');
    expect(mockFeedService.invalidateEventFeedCache).not.toHaveBeenCalled();
  });

  it('does nothing when moderated content cannot be resolved to a check-in', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    await (service as any).invalidateFeedCachesForContent('photo', 'missing');

    expect(mockFeedService.invalidateUserFeedCache).not.toHaveBeenCalled();
    expect(mockFeedService.invalidateEventFeedCache).not.toHaveBeenCalled();
  });
});
