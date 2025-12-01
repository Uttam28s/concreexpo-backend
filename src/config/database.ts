import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

// Enhanced query logging with error detection
prisma.$on('query', (e: any) => {
  // Log slow queries in production
  if (process.env.NODE_ENV === 'production' && e.duration > 1000) {
    console.warn('[DB] Slow query detected:', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
      target: e.target,
      timestamp: new Date().toISOString(),
    });
  }
  
  // In development, queries are already logged by Prisma
  if (process.env.NODE_ENV === 'development') {
    console.log('[DB QUERY]', {
      query: e.query,
      duration: `${e.duration}ms`,
    });
  }
});

// Enhanced error logging for database operations
prisma.$on('error', (e: any) => {
  console.error('[DB ERROR] Database error occurred:', {
    message: e.message,
    target: e.target,
    timestamp: new Date().toISOString(),
  });
});

// Enhanced warning logging
prisma.$on('warn', (e: any) => {
  console.warn('[DB WARN] Database warning:', {
    message: e.message,
    target: e.target,
    timestamp: new Date().toISOString(),
  });
});

export default prisma;

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Handle uncaught Prisma connection errors
process.on('unhandledRejection', (reason: any) => {
  if (reason?.code?.startsWith('P') || reason?.name?.includes('Prisma')) {
    console.error('[DB CONNECTION ERROR] Unhandled Prisma error:', {
      error: reason?.message || reason,
      code: reason?.code,
      name: reason?.name,
      stack: reason?.stack,
      timestamp: new Date().toISOString(),
    });
  }
});
