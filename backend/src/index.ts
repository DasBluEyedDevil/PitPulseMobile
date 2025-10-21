import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes';
import venueRoutes from './routes/venueRoutes';
import bandRoutes from './routes/bandRoutes';
import reviewRoutes from './routes/reviewRoutes';
import badgeRoutes from './routes/badgeRoutes';
import Database from './config/database';
import { ApiResponse } from './types';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
a// CORS configuration - Allow mobile apps and web clients
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
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
app.use(cors(corsOptions));
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    const db = Database.getInstance();
    const isDbHealthy = await db.healthCheck();
    
    const response: ApiResponse = {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: isDbHealthy ? 'connected' : 'disconnected',
      },
    };
    
    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Health check failed',
    };
    res.status(503).json(response);
  }
});

// API routes
app.use('/api/users', userRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/bands', bandRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/badges', badgeRoutes);

// Root endpoint
app.get('/', (req, res) => {
  const response: ApiResponse = {
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
  const response: ApiResponse = {
    success: false,
    error: `Route ${req.originalUrl} not found`,
  };
  res.status(404).json(response);
});

// Global error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  
  const response: ApiResponse = {
    success: false,
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
  };
  
  res.status(500).json(response);
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const db = Database.getInstance();
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
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  const db = Database.getInstance();
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  const db = Database.getInstance();
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