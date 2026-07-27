import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { statusToErrorCode, validate } from '../../middleware/validate';
import {
  createUserSchema,
  loginUserSchema,
  updateProfileSchema,
  checkEmailSchema,
  checkUsernameSchema,
} from '../../utils/validationSchemas';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: any;
  let mockJson: any;
  let mockStatus: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockRequest = {
      body: {},
      query: {},
      params: {},
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    mockNext = jest.fn();
  });

  describe('validate factory function', () => {
    it('should call next() when validation passes', async () => {
      const schema = z.object({
        body: z.object({
          name: z.string(),
        }),
      });

      mockRequest.body = { name: 'Test' };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should return 400 with error details when validation fails', async () => {
      const schema = z.object({
        body: z.object({
          name: z.string(),
          age: z.number(),
        }),
      });

      mockRequest.body = { name: 123, age: 'invalid' };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      const responseData = mockJson.mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('VALIDATION_ERROR');
      expect(responseData.error.message).toBe('Validation failed');
      expect(responseData.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: expect.stringContaining('body.name') }),
          expect.objectContaining({ field: expect.stringContaining('body.age') }),
        ])
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate query parameters', async () => {
      const schema = z.object({
        query: z.object({
          page: z.string().regex(/^\d+$/),
        }),
      });

      mockRequest.query = { page: 'abc' };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      const responseData = mockJson.mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('VALIDATION_ERROR');
      expect(responseData.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: expect.stringContaining('query.page') }),
        ])
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate route parameters', async () => {
      const schema = z.object({
        params: z.object({
          id: z.string().uuid(),
        }),
      });

      mockRequest.params = { id: 'not-a-uuid' };

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      const responseData = mockJson.mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('VALIDATION_ERROR');
      expect(responseData.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: expect.stringContaining('params.id') }),
        ])
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 on unexpected non-Zod errors', async () => {
      const schema = {
        parseAsync: jest
          .fn<() => Promise<unknown>>()
          .mockRejectedValue(new Error('Unexpected error')),
      } as unknown as z.ZodType<unknown>;

      const middleware = validate(schema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(500);
      const responseData = mockJson.mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('INTERNAL_ERROR');
      expect(responseData.error.message).toBe('Internal server error');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('maps HTTP statuses to canonical error codes', () => {
      expect(statusToErrorCode(400)).toBe('BAD_REQUEST');
      expect(statusToErrorCode(401)).toBe('UNAUTHORIZED');
      expect(statusToErrorCode(403)).toBe('FORBIDDEN');
      expect(statusToErrorCode(404)).toBe('NOT_FOUND');
      expect(statusToErrorCode(409)).toBe('CONFLICT');
      expect(statusToErrorCode(422)).toBe('VALIDATION_ERROR');
      expect(statusToErrorCode(429)).toBe('RATE_LIMITED');
      expect(statusToErrorCode(500)).toBe('INTERNAL_ERROR');
      expect(statusToErrorCode(503)).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('createUserSchema validation', () => {
    it('should pass with valid registration data', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'SecureP@ss1',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
      };

      const middleware = validate(createUserSchema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should pass with minimal required registration data', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'SecureP@ss1',
        username: 'testuser',
      };

      const middleware = validate(createUserSchema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should reject invalid email', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        password: 'SecureP@ss1',
        username: 'testuser',
      };

      const middleware = validate(createUserSchema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      const responseData = mockJson.mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('VALIDATION_ERROR');
      expect(responseData.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining('Invalid email') }),
        ])
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject password without uppercase', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'securep@ss1',
        username: 'testuser',
      };

      const middleware = validate(createUserSchema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      const responseData = mockJson.mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('VALIDATION_ERROR');
      expect(responseData.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining('uppercase') }),
        ])
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject password without special character', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'SecurePass1',
        username: 'testuser',
      };

      const middleware = validate(createUserSchema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      const responseData = mockJson.mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('VALIDATION_ERROR');
      expect(responseData.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining('special character') }),
        ])
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject short password', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'Sh0rt!',
        username: 'testuser',
      };

      const middleware = validate(createUserSchema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      const responseData = mockJson.mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('VALIDATION_ERROR');
      expect(responseData.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining('at least 8 characters') }),
        ])
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject short username', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'SecureP@ss1',
        username: 'ab',
      };

      const middleware = validate(createUserSchema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      const responseData = mockJson.mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('VALIDATION_ERROR');
      expect(responseData.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining('at least 3 characters') }),
        ])
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject username with invalid characters', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'SecureP@ss1',
        username: 'test user!',
      };

      const middleware = validate(createUserSchema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      const responseData = mockJson.mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('VALIDATION_ERROR');
      expect(responseData.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('letters, numbers, dots, hyphens, and underscores'),
          }),
        ])
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('loginUserSchema validation', () => {
    it('should pass with valid login data', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'anypassword',
      };

      const middleware = validate(loginUserSchema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should reject invalid email', async () => {
      mockRequest.body = {
        email: 'not-an-email',
        password: 'password',
      };

      const middleware = validate(loginUserSchema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject empty password', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: '',
      };

      const middleware = validate(loginUserSchema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      const responseData = mockJson.mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('VALIDATION_ERROR');
      expect(responseData.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining('Password is required') }),
        ])
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject missing password field', async () => {
      mockRequest.body = {
        email: 'test@example.com',
      };

      const middleware = validate(loginUserSchema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('updateProfileSchema validation', () => {
    it('should pass with valid profile update data', async () => {
      mockRequest.body = {
        firstName: 'Updated',
        lastName: 'Name',
        bio: 'This is my bio',
        location: 'New York',
      };

      const middleware = validate(updateProfileSchema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should pass with empty body (all optional)', async () => {
      mockRequest.body = {};

      const middleware = validate(updateProfileSchema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should reject bio exceeding max length', async () => {
      mockRequest.body = {
        bio: 'a'.repeat(501),
      };

      const middleware = validate(updateProfileSchema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      const responseData = mockJson.mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('VALIDATION_ERROR');
      expect(responseData.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining('less than 500 characters') }),
        ])
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should accept profileImageUrl in body (legacy clients may send it alongside profile edits)', async () => {
      mockRequest.body = {
        profileImageUrl: 'https://example.com/image.jpg',
      };

      const middleware = validate(updateProfileSchema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should reject non-URL profileImageUrl', async () => {
      mockRequest.body = {
        profileImageUrl: 'not-a-url',
      };

      const middleware = validate(updateProfileSchema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('checkEmailSchema validation', () => {
    it('should pass with valid email in query', async () => {
      mockRequest.query = {
        email: 'test@example.com',
      };

      const middleware = validate(checkEmailSchema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should reject invalid email in query', async () => {
      mockRequest.query = {
        email: 'invalid-email',
      };

      const middleware = validate(checkEmailSchema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      const responseData = mockJson.mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('VALIDATION_ERROR');
      expect(responseData.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: expect.stringContaining('Invalid email') }),
        ])
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject missing email query parameter', async () => {
      mockRequest.query = {};

      const middleware = validate(checkEmailSchema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('checkUsernameSchema validation', () => {
    it('should pass with valid username in params', async () => {
      mockRequest.params = {
        username: 'validuser',
      };

      const middleware = validate(checkUsernameSchema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should reject short username in params', async () => {
      mockRequest.params = {
        username: 'ab',
      };

      const middleware = validate(checkUsernameSchema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject missing username param', async () => {
      mockRequest.params = {};

      const middleware = validate(checkUsernameSchema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Multiple validation errors', () => {
    it('should return all validation errors at once', async () => {
      mockRequest.body = {
        email: 'invalid',
        password: 'short',
        username: 'a',
      };

      const middleware = validate(createUserSchema);
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      const responseData = mockJson.mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('VALIDATION_ERROR');
      expect(responseData.error.message).toBe('Validation failed');
      expect(responseData.error.details.length).toBeGreaterThan(1);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
