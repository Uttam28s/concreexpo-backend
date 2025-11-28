import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/jwt';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Authentication middleware
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get token from header or cookie
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : req.cookies?.accessToken;

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Verify token
    const payload = verifyAccessToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Attach user to request
    req.user = payload;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Authorization middleware - Admin only
 */
export const adminOnly = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};

/**
 * Authorization middleware - Engineer only
 */
export const engineerOnly = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'ENGINEER') {
    res.status(403).json({ error: 'Engineer access required' });
    return;
  }
  next();
};

/**
 * Authorization middleware - Admin or Engineer
 */
export const adminOrEngineer = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ENGINEER') {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  next();
};
