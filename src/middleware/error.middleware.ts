import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Global error handler middleware
 */
export const errorHandler = (
  error: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', error);

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Enhanced logging for Prisma errors
    console.error('[PRISMA ERROR]', {
      code: error.code,
      message: error.message,
      meta: error.meta,
      timestamp: new Date().toISOString(),
    });

    // Unique constraint violation
    if (error.code === 'P2002') {
      res.status(409).json({
        error: 'Resource already exists',
        details: error.meta?.target,
      });
      return;
    }

    // Foreign key constraint failed
    if (error.code === 'P2003') {
      res.status(400).json({
        error: 'Invalid reference',
        details: error.meta?.field_name,
      });
      return;
    }

    // Record not found
    if (error.code === 'P2025') {
      res.status(404).json({
        error: 'Resource not found',
      });
      return;
    }

    // Connection/query errors
    if (error.code === 'P1001' || error.code === 'P1002' || error.code === 'P1008') {
      console.error('[DB CONNECTION ERROR] Database connection failed:', {
        code: error.code,
        message: error.message,
        timestamp: new Date().toISOString(),
      });
      res.status(503).json({
        error: 'Database connection error',
        message: 'Service temporarily unavailable',
      });
      return;
    }

    // Query execution errors
    if (error.code === 'P2000' || error.code === 'P2001' || error.code === 'P2011') {
      console.error('[DB QUERY ERROR] Query execution failed:', {
        code: error.code,
        message: error.message,
        meta: error.meta,
        timestamp: new Date().toISOString(),
      });
      res.status(500).json({
        error: 'Database query failed',
        message: 'An error occurred while processing your request',
      });
      return;
    }
  }

  // Prisma client initialization errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error('[DB INIT ERROR] Prisma client initialization failed:', {
      errorCode: error.errorCode,
      message: error.message,
      timestamp: new Date().toISOString(),
    });
    res.status(503).json({
      error: 'Database initialization error',
      message: 'Service temporarily unavailable',
    });
    return;
  }

  // Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    console.error('[DB VALIDATION ERROR] Prisma validation failed:', {
      message: error.message,
      timestamp: new Date().toISOString(),
    });
    res.status(400).json({
      error: 'Invalid request data',
      message: 'The provided data is invalid',
    });
    return;
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    res.status(400).json({
      error: 'Validation failed',
      details: error.message,
    });
    return;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: 'Invalid token',
    });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      error: 'Token expired',
    });
    return;
  }

  // Default error
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
  });
};

/**
 * 404 handler
 */
export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    error: 'Route not found',
  });
};
