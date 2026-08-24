import { Request, Response, NextFunction } from 'express';
import { dailyCheckinRateLimit } from '../../middleware/checkinRateLimit';

const mockQuery = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      query: (...args: unknown[]) => mockQuery(...args),
    }),
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

describe('dailyCheckinRateLimit', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockRequest = {
      user: { id: 'user-123' } as Request['user'],
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    mockNext = jest.fn();
  });

  it('calls next when the user has 9 check-ins in the rolling day', async () => {
    mockQuery.mockResolvedValue({ rows: [{ cnt: 9 }] });

    await dailyCheckinRateLimit(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("INTERVAL '1 day'"), [
      'user-123',
    ]);
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockStatus).not.toHaveBeenCalled();
  });

  it('returns 429 when the user has 10 check-ins in the rolling day', async () => {
    mockQuery.mockResolvedValue({ rows: [{ cnt: 10 }] });

    await dailyCheckinRateLimit(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockStatus).toHaveBeenCalledWith(429);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Daily check-in limit reached (10 per day)',
      },
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 429 fail-closed when the count query throws', async () => {
    mockQuery.mockRejectedValue(new Error('connection refused'));

    await dailyCheckinRateLimit(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockStatus).toHaveBeenCalledWith(429);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Unable to verify rate limit, please try again',
      },
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 401 when the request has no authenticated user', async () => {
    mockRequest.user = undefined;

    await dailyCheckinRateLimit(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    expect(mockNext).not.toHaveBeenCalled();
  });
});
