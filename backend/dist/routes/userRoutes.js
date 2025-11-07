"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserController_1 = require("../controllers/UserController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const userController = new UserController_1.UserController();
// Rate limiting for auth endpoints
const authRateLimit = (0, auth_1.rateLimit)(15 * 60 * 1000, 5); // 5 requests per 15 minutes
const generalRateLimit = (0, auth_1.rateLimit)(15 * 60 * 1000, 30); // 30 requests per 15 minutes
// Public routes (no authentication required)
router.post('/register', authRateLimit, userController.register);
router.post('/login', authRateLimit, userController.login);
// Protected routes (authentication required) - MUST come before /:username
router.get('/me', auth_1.authenticateToken, userController.getProfile);
router.put('/me', auth_1.authenticateToken, userController.updateProfile);
router.delete('/me', auth_1.authenticateToken, userController.deactivateAccount);
// Username and email availability check - MUST come before /:username
router.get('/check-username/:username', generalRateLimit, userController.checkUsername);
router.get('/check-email', generalRateLimit, userController.checkEmail); // Changed to query param
// Public user profiles - MUST be last as it's a catch-all
router.get('/:username', generalRateLimit, userController.getUserByUsername);
exports.default = router;
//# sourceMappingURL=userRoutes.js.map