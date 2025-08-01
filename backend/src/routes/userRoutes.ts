import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticateToken, rateLimit } from '../middleware/auth';

const router = Router();
const userController = new UserController();

// Rate limiting for auth endpoints
const authRateLimit = rateLimit(15 * 60 * 1000, 5); // 5 requests per 15 minutes
const generalRateLimit = rateLimit(15 * 60 * 1000, 30); // 30 requests per 15 minutes

// Public routes (no authentication required)
router.post('/register', authRateLimit, userController.register);
router.post('/login', authRateLimit, userController.login);

// Username and email availability check
router.get('/check-username/:username', generalRateLimit, userController.checkUsername);
router.get('/check-email/:email', generalRateLimit, userController.checkEmail);

// Public user profiles
router.get('/:username', generalRateLimit, userController.getUserByUsername);

// Protected routes (authentication required)
router.get('/me', authenticateToken, userController.getProfile);
router.put('/me', authenticateToken, userController.updateProfile);
router.delete('/me', authenticateToken, userController.deactivateAccount);

export default router;