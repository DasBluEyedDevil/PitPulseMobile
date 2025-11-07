"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const venueRoutes_1 = __importDefault(require("./routes/venueRoutes"));
const bandRoutes_1 = __importDefault(require("./routes/bandRoutes"));
const reviewRoutes_1 = __importDefault(require("./routes/reviewRoutes"));
const badgeRoutes_1 = __importDefault(require("./routes/badgeRoutes"));
const database_1 = __importDefault(require("./config/database"));
// Load environment variables from .env file (development only)
// In production (Railway, etc.), environment variables are injected directly
if (process.env.NODE_ENV !== 'production') {
    dotenv_1.default.config();
    console.log('📄 Loaded .env file for development');
}
else {
    console.log('🚀 Using production environment variables');
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Security middleware
app.use((0, helmet_1.default)());
// CORS configuration - Allow mobile apps and web clients
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin)
            return callback(null, true);
        // In development, allow all origins
        if (process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }
        // In production, allow mobile apps (no origin) and whitelisted domains
        const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(o => o.trim());
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        // Allow for mobile apps which don't send origin
        callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false, // Set to false for mobile apps
};
app.use((0, cors_1.default)(corsOptions));
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
    });
}
// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const db = database_1.default.getInstance();
        const isDbHealthy = await db.healthCheck();
        const response = {
            success: true,
            data: {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                database: isDbHealthy ? 'connected' : 'disconnected',
            },
        };
        res.status(200).json(response);
    }
    catch (error) {
        const response = {
            success: false,
            error: 'Health check failed',
        };
        res.status(503).json(response);
    }
});
// API routes
app.use('/api/users', userRoutes_1.default);
app.use('/api/venues', venueRoutes_1.default);
app.use('/api/bands', bandRoutes_1.default);
app.use('/api/reviews', reviewRoutes_1.default);
app.use('/api/badges', badgeRoutes_1.default);
// Root endpoint
app.get('/', (req, res) => {
    const response = {
        success: true,
        data: {
            message: 'PitPulse API Server',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
        },
    };
    res.json(response);
});
// 404 handler
app.use('*', (req, res) => {
    const response = {
        success: false,
        error: `Route ${req.originalUrl} not found`,
    };
    res.status(404).json(response);
});
// Global error handler
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    const response = {
        success: false,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    };
    res.status(500).json(response);
});
// Start server
const startServer = async () => {
    try {
        // Log environment info (without exposing sensitive data)
        console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
        console.log('🔌 DATABASE_URL present:', !!process.env.DATABASE_URL);
        console.log('🔌 DB_HOST present:', !!process.env.DB_HOST);
        // Test database connection
        const db = database_1.default.getInstance();
        const isDbHealthy = await db.healthCheck();
        if (!isDbHealthy) {
            console.error('Database connection failed. Please check your database configuration.');
            process.exit(1);
        }
        console.log('✅ Database connection established');
        app.listen(PORT, () => {
            console.log(`🚀 PitPulse API Server running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            if (process.env.NODE_ENV === 'development') {
                console.log(`📖 API Documentation: http://localhost:${PORT}/`);
            }
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    const db = database_1.default.getInstance();
    await db.close();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    const db = database_1.default.getInstance();
    await db.close();
    process.exit(0);
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
startServer();
//# sourceMappingURL=index.js.map