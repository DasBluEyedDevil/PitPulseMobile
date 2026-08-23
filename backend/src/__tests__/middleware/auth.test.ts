import { Request, Response, NextFunction } from 'express';
import {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  requirePremium,
} from '../../middleware/auth';
import { AuthUtils } from '../../utils/auth';
import { getAuthUser } from '../../services/user/authUserCache';
import { User } from '../../types';

jest.mock('../../utils/auth');
jest.mock('../../services/user/authUserCache', () => ({
  getAuthUser: jest.fn(),
}));

const MockedAuthUtils = AuthUtils as jest.Mocked<typeof AuthUtils>;
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    isVerified: true,
    isActive: true,
    isAdmin: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockAdminUser: User = {
    ...mockUser,
    id: 'admin-123',
    isAdmin: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockRequest = {
      headers: {},
      params: {},
      body: {},
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    mockNext = jest.fn();
  });

  describe('authenticateToken', () => {
    it('should authenticate with valid token', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };

      MockedAuthUtils.extractTokenFromHeader.mockReturnValue('valid-token');
      MockedAuthUtils.verifyToken.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
      });

      mockGetAuthUser.mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        isActive: true,
        isAdmin: false,
        isPremium: false,
      });

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(MockedAuthUtils.extractTokenFromHeader).toHaveBeenCalledWith('Bearer valid-token');
      expect(MockedAuthUtils.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(mockGetAuthUser).toHaveBeenCalledWith('user-123');
      expect(mockRequest.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        isActive: true,
        isAdmin: false,
        isPremium: false,
      });
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should return 401 for missing token', async () => {
      mockRequest.headers = {};

      MockedAuthUtils.extractTokenFromHeader.mockReturnValue(null);

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Access token required' },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };

      MockedAuthUtils.extractTokenFromHeader.mockReturnValue('invalid-token');
      MockedAuthUtils.verifyToken.mockReturnValue(null);

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for inactive user', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };

      MockedAuthUtils.extractTokenFromHeader.mockReturnValue('valid-token');
      MockedAuthUtils.verifyToken.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
      });

      mockGetAuthUser.mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        isActive: false,
        isAdmin: false,
        isPremium: false,
      });

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not found or inactive' },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user not found', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };

      MockedAuthUtils.extractTokenFromHeader.mockReturnValue('valid-token');
      MockedAuthUtils.verifyToken.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
      });

      mockGetAuthUser.mockResolvedValue(null);

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not found or inactive' },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 on unexpected error', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };

      MockedAuthUtils.extractTokenFromHeader.mockReturnValue('valid-token');
      MockedAuthUtils.verifyToken.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
      });

      mockGetAuthUser.mockRejectedValue(new Error('Database error'));

      // Mock console.error to suppress error output in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Authentication failed' },
      });
      expect(mockNext).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('optionalAuth', () => {
    it('should attach user when valid token provided', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };

      MockedAuthUtils.extractTokenFromHeader.mockReturnValue('valid-token');
      MockedAuthUtils.verifyToken.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
      });

      mockGetAuthUser.mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        isActive: true,
        isAdmin: false,
        isPremium: false,
      });

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        isActive: true,
        isAdmin: false,
        isPremium: false,
      });
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should continue without user when no token provided', async () => {
      mockRequest.headers = {};

      MockedAuthUtils.extractTokenFromHeader.mockReturnValue(null);

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should continue without user when token is invalid', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };

      MockedAuthUtils.extractTokenFromHeader.mockReturnValue('invalid-token');
      MockedAuthUtils.verifyToken.mockReturnValue(null);

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should continue without user when user is inactive', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };

      MockedAuthUtils.extractTokenFromHeader.mockReturnValue('valid-token');
      MockedAuthUtils.verifyToken.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
      });

      mockGetAuthUser.mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        isActive: false,
        isAdmin: false,
        isPremium: false,
      });

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should continue without user on error', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };

      MockedAuthUtils.extractTokenFromHeader.mockReturnValue('valid-token');
      MockedAuthUtils.verifyToken.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
      });

      mockGetAuthUser.mockRejectedValue(new Error('Database error'));

      // Mock console.error to suppress error output in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('requireAdmin', () => {
    it('should allow admin user to proceed', () => {
      mockRequest.user = mockAdminUser;

      const middleware = requireAdmin();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should return 401 when user not authenticated', () => {
      mockRequest.user = undefined;

      const middleware = requireAdmin();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 for non-admin user', () => {
      mockRequest.user = mockUser; // Regular user, not admin

      const middleware = requireAdmin();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin privileges required' },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when isAdmin is undefined', () => {
      const userWithoutAdmin = { ...mockUser };
      delete userWithoutAdmin.isAdmin;
      mockRequest.user = userWithoutAdmin;

      const middleware = requireAdmin();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin privileges required' },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requirePremium', () => {
    it('should allow premium user to proceed', () => {
      mockRequest.user = { ...mockUser, isPremium: true };

      const middleware = requirePremium();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should return 401 when user not authenticated', () => {
      mockRequest.user = undefined;

      const middleware = requirePremium();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 for non-premium user', () => {
      mockRequest.user = mockUser;

      const middleware = requirePremium();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: { code: 'FORBIDDEN', message: 'SoundCheck Pro subscription required' },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
