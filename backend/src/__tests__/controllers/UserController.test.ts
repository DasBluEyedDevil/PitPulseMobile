import request from 'supertest';
import express from 'express';
import { UserController } from '../../controllers/UserController';
import { UserService } from '../../services/UserService';

// Mock the UserService
jest.mock('../../services/UserService');

const app = express();
app.use(express.json());

const userController = new UserController();
app.post('/register', userController.register);
app.post('/login', userController.login);
app.get('/me', userController.getProfile);

const mockUserService = UserService as jest.MockedClass<typeof UserService>;

describe('UserController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /register', () => {
    it('should register a user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPass123!',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
      };

      const mockUser = {
        id: 'user-123',
        email: userData.email,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        isVerified: false,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const mockCreateUser = jest.fn().mockResolvedValue(mockUser);
      mockUserService.prototype.createUser = mockCreateUser;

      const response = await request(app)
        .post('/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUser);
      expect(response.body.message).toBe('User registered successfully');
      expect(mockCreateUser).toHaveBeenCalledWith(userData);
    });

    it('should return error for missing required fields', async () => {
      const userData = {
        email: 'test@example.com',
        // Missing password and username
      };

      const response = await request(app)
        .post('/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Email, password, and username are required');
    });

    it('should return error for duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPass123!',
        username: 'testuser',
        firstName: 'Test',
      };

      const mockCreateUser = jest.fn().mockRejectedValue(new Error('Email already registered'));
      mockUserService.prototype.createUser = mockCreateUser;

      const response = await request(app)
        .post('/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Email already registered');
    });
  });

  describe('POST /login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPass123!',
      };

      const mockAuthResponse = {
        user: {
          id: 'user-123',
          email: loginData.email,
          username: 'testuser',
        },
        token: 'jwt-token-123',
      };

      const mockAuthenticateUser = jest.fn().mockResolvedValue(mockAuthResponse);
      mockUserService.prototype.authenticateUser = mockAuthenticateUser;

      const response = await request(app)
        .post('/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAuthResponse);
      expect(response.body.message).toBe('Login successful');
      expect(mockAuthenticateUser).toHaveBeenCalledWith(loginData);
    });

    it('should return error for missing credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        // Missing password
      };

      const response = await request(app)
        .post('/login')
        .send(loginData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Email and password are required');
    });

    it('should return error for invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      const mockAuthenticateUser = jest.fn().mockRejectedValue(new Error('Invalid email or password'));
      mockUserService.prototype.authenticateUser = mockAuthenticateUser;

      const response = await request(app)
        .post('/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid email or password');
    });
  });
});