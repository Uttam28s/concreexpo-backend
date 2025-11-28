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
