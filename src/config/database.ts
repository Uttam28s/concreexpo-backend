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

// Test database connection and log status
async function testDatabaseConnection() {
  try {
    // Test connection by running a simple query
    await prisma.$queryRaw`SELECT 1`;
    
    // Get database info (PostgreSQL version)
    let dbVersion = 'unknown';
    try {
      const dbInfo = await prisma.$queryRaw<Array<{ version: string }>>`
        SELECT version() as version
      `;
      dbVersion = dbInfo[0]?.version?.split(' ')[0] || 'unknown';
    } catch (versionError) {
      // If version query fails, continue with connection test
      console.warn('[DB CONNECTION] Could not retrieve database version:', versionError);
    }
    
    // Extract database name from DATABASE_URL (safely)
    let databaseName = 'unknown';
    try {
      const dbUrl = process.env.DATABASE_URL || '';
      if (dbUrl.includes('@') && dbUrl.includes('/')) {
        const parts = dbUrl.split('@')[1]?.split('/');
        if (parts && parts.length > 1) {
          databaseName = parts[1]?.split('?')[0] || 'unknown';
        }
      }
    } catch (urlError) {
      // Ignore URL parsing errors
    }
    
    console.log('[DB CONNECTION] ✅ Database connected successfully', {
      timestamp: new Date().toISOString(),
      database: databaseName,
      version: dbVersion,
    });
    
    return true;
  } catch (error: any) {
    console.error('[DB CONNECTION ERROR] ❌ Failed to connect to database:', {
      error: error?.message || error,
      code: error?.code,
      name: error?.name,
      timestamp: new Date().toISOString(),
      databaseUrl: process.env.DATABASE_URL 
        ? `${process.env.DATABASE_URL.split('@')[0].split('://')[0]}://***@${process.env.DATABASE_URL.split('@')[1] || 'unknown'}`
        : 'not set',
    });
    
    // Log specific connection error codes
    if (error?.code === 'P1001') {
      console.error('[DB CONNECTION ERROR] Cannot reach database server. Check if:');
      console.error('  - Database server is running');
      console.error('  - DATABASE_URL is correct');
      console.error('  - Network/firewall allows connection');
    } else if (error?.code === 'P1000') {
      console.error('[DB CONNECTION ERROR] Authentication failed. Check:');
      console.error('  - Database username and password');
      console.error('  - DATABASE_URL credentials');
    } else if (error?.code === 'P1002') {
      console.error('[DB CONNECTION ERROR] Database connection timeout. Check:');
      console.error('  - Database server is accessible');
      console.error('  - Network connectivity');
    } else if (error?.code === 'P1008') {
      console.error('[DB CONNECTION ERROR] Operations timed out. Check:');
      console.error('  - Database server performance');
      console.error('  - Network latency');
    }
    
    return false;
  }
}

// Test connection on module load (only in non-serverless environments)
if (process.env.VERCEL !== '1') {
  // Test connection asynchronously without blocking
  testDatabaseConnection().catch((error) => {
    console.error('[DB CONNECTION] Failed to test connection:', error);
  });
}

export default prisma;

// Handle graceful shutdown
process.on('beforeExit', async () => {
  try {
    await prisma.$disconnect();
    console.log('[DB CONNECTION] ✅ Database disconnected gracefully', {
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[DB CONNECTION ERROR] Error disconnecting from database:', {
      error: error?.message || error,
      timestamp: new Date().toISOString(),
    });
  }
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

// Export connection test function for manual testing
export { testDatabaseConnection };
