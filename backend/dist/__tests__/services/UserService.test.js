"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const UserService_1 = require("../../services/UserService");
const database_1 = __importDefault(require("../../config/database"));
const auth_1 = require("../../utils/auth");
// Mock dependencies
jest.mock('../../config/database');
jest.mock('../../utils/auth');
const mockDb = {
    query: jest.fn(),
};
database_1.default.getInstance.mockReturnValue(mockDb);
describe('UserService', () => {
    let userService;
    beforeEach(() => {
        userService = new UserService_1.UserService();
        jest.clearAllMocks();
    });
    describe('createUser', () => {
        it('should create a user successfully', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'TestPass123!',
                username: 'testuser',
                firstName: 'Test',
                lastName: 'User',
            };
            const mockHashedPassword = 'hashedPassword123';
            const mockUserResult = {
                id: 'user-123',
                email: userData.email,
                username: userData.username,
                first_name: userData.firstName,
                last_name: userData.lastName,
                bio: null,
                profile_image_url: null,
                location: null,
                date_of_birth: null,
                is_verified: false,
                is_active: true,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
            };
            auth_1.AuthUtils.validateEmail.mockReturnValue(true);
            auth_1.AuthUtils.validateUsername.mockReturnValue({ isValid: true, errors: [] });
            auth_1.AuthUtils.validatePassword.mockReturnValue({ isValid: true, errors: [] });
            auth_1.AuthUtils.hashPassword.mockResolvedValue(mockHashedPassword);
            // Mock database calls for checking existing users
            mockDb.query
                .mockResolvedValueOnce({ rows: [] }) // findByEmail - no existing user
                .mockResolvedValueOnce({ rows: [] }) // findByUsername - no existing user
                .mockResolvedValueOnce({ rows: [mockUserResult] }); // create user
            const result = await userService.createUser(userData);
            expect(result).toEqual({
                id: 'user-123',
                email: userData.email,
                username: userData.username,
                firstName: userData.firstName,
                lastName: userData.lastName,
                bio: null,
                profileImageUrl: null,
                location: null,
                dateOfBirth: null,
                isVerified: false,
                isActive: true,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            });
        });
        it('should throw error for invalid email', async () => {
            const userData = {
                email: 'invalid-email',
                password: 'TestPass123!',
                username: 'testuser',
                firstName: 'Test',
            };
            auth_1.AuthUtils.validateEmail.mockReturnValue(false);
            await expect(userService.createUser(userData)).rejects.toThrow('Invalid email format');
        });
        it('should throw error for existing email', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'TestPass123!',
                username: 'testuser',
                firstName: 'Test',
            };
            auth_1.AuthUtils.validateEmail.mockReturnValue(true);
            auth_1.AuthUtils.validateUsername.mockReturnValue({ isValid: true, errors: [] });
            auth_1.AuthUtils.validatePassword.mockReturnValue({ isValid: true, errors: [] });
            // Mock existing user found
            mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'existing-user' }] });
            await expect(userService.createUser(userData)).rejects.toThrow('Email already registered');
        });
    });
    describe('authenticateUser', () => {
        it('should authenticate user successfully', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'TestPass123!',
            };
            const mockUser = {
                id: 'user-123',
                email: loginData.email,
                password_hash: 'hashedPassword',
                username: 'testuser',
                first_name: 'Test',
                last_name: 'User',
                is_active: true,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
            };
            const mockToken = 'jwt-token-123';
            mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });
            auth_1.AuthUtils.comparePassword.mockResolvedValue(true);
            auth_1.AuthUtils.generateToken.mockReturnValue(mockToken);
            const result = await userService.authenticateUser(loginData);
            expect(result).toEqual({
                user: expect.objectContaining({
                    id: 'user-123',
                    email: loginData.email,
                    username: 'testuser',
                }),
                token: mockToken,
            });
        });
        it('should throw error for invalid credentials', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'WrongPassword',
            };
            mockDb.query.mockResolvedValueOnce({ rows: [] }); // No user found
            await expect(userService.authenticateUser(loginData)).rejects.toThrow('Invalid email or password');
        });
        it('should throw error for inactive user', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'TestPass123!',
            };
            const mockUser = {
                id: 'user-123',
                email: loginData.email,
                password_hash: 'hashedPassword',
                is_active: false,
            };
            mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });
            await expect(userService.authenticateUser(loginData)).rejects.toThrow('Account is deactivated');
        });
    });
    describe('findById', () => {
        it('should find user by ID', async () => {
            const userId = 'user-123';
            const mockUser = {
                id: userId,
                email: 'test@example.com',
                username: 'testuser',
                first_name: 'Test',
                last_name: 'User',
                bio: null,
                profile_image_url: null,
                location: null,
                date_of_birth: null,
                is_verified: false,
                is_active: true,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
            };
            mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });
            const result = await userService.findById(userId);
            expect(result).toEqual({
                id: userId,
                email: 'test@example.com',
                username: 'testuser',
                firstName: 'Test',
                lastName: 'User',
                bio: null,
                profileImageUrl: null,
                location: null,
                dateOfBirth: null,
                isVerified: false,
                isActive: true,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            });
        });
        it('should return null for non-existent user', async () => {
            const userId = 'non-existent';
            mockDb.query.mockResolvedValueOnce({ rows: [] });
            const result = await userService.findById(userId);
            expect(result).toBeNull();
        });
    });
});
//# sourceMappingURL=UserService.test.js.map