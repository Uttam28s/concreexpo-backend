import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { testDatabaseConnection } from './config/database';

const app: Application = express();

// Trust proxy - required when behind a reverse proxy (e.g., Vercel, Railway)
// Trust only the first proxy (Railway's load balancer) for security
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Root health check (for Railway/load balancer health checks)
app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Concreexpo API is running' });
});

// Health check endpoint (not rate limited)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Concreexpo API is running' });
});

// Rate limiting
// Configure to work properly behind Railway's proxy
// Skip rate limiting for health checks
const limiter = rateLimit({
  windowMs: config.rateLimit.window,
  max: config.rateLimit.max,
  message: 'Too many requests, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/';
  },
});
app.use('/api/', limiter);

// Routes
app.use('/api', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Only start the server if not in serverless environment (Vercel)
// Vercel will handle the serverless function execution
if (process.env.VERCEL !== '1') {
  // Test database connection before starting server
  testDatabaseConnection()
    .then((connected) => {
      if (!connected) {
        console.warn('[WARNING] Server starting despite database connection failure');
      }
      
      // Start server for local development or standalone deployments (Railway, etc.)
      // Bind to 0.0.0.0 to accept connections from any network interface
      app.listen(config.port, '0.0.0.0', () => {
        console.log(`🚀 Server is running on port ${config.port}`);
        console.log(`📝 Environment: ${config.nodeEnv}`);
        console.log(`🌐 Frontend URL: ${config.frontendUrl}`);
      });
    })
    .catch((error) => {
      console.error('[ERROR] Failed to test database connection:', error);
      // Still start server, but log the error
      app.listen(config.port, '0.0.0.0', () => {
        console.log(`🚀 Server is running on port ${config.port} (with database connection issues)`);
        console.log(`📝 Environment: ${config.nodeEnv}`);
        console.log(`🌐 Frontend URL: ${config.frontendUrl}`);
      });
    });
} else {
  // Running on Vercel serverless platform
  // Test connection asynchronously (won't block function execution)
  console.log('🚀 Running on Vercel serverless platform');
  testDatabaseConnection().catch((error) => {
    console.error('[ERROR] Database connection test failed:', error);
  });
}

export default app;
