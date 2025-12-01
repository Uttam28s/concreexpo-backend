import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';

/**
 * User login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email },
      });
    } catch (dbError: any) {
      console.error('[DB ERROR] Failed to find user by email:', {
        email,
        error: {
          name: dbError?.name,
          code: dbError?.code,
          message: dbError?.message,
          meta: dbError?.meta,
        },
        timestamp: new Date().toISOString(),
      });
      
      // Re-throw Prisma errors to be handled by error middleware
      if (dbError instanceof Prisma.PrismaClientKnownRequestError) {
        throw dbError;
      }
      
      // For unknown database errors, throw generic error
      throw new Error('Database query failed');
    }

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      res.status(403).json({ error: 'Account is deactivated' });
      return;
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate tokens
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Set cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Send response
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    // Enhanced error logging for login
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('[DB ERROR] Login failed - Prisma error:', {
        code: error.code,
        message: error.message,
        meta: error.meta,
        timestamp: new Date().toISOString(),
      });
      
      // Handle specific Prisma error codes
      if (error.code === 'P1001' || error.code === 'P1002' || error.code === 'P1008') {
        // Connection errors
        res.status(503).json({ 
          error: 'Database connection error',
          message: 'Service temporarily unavailable' 
        });
        return;
      }
      
      if (error.code === 'P2000' || error.code === 'P2001' || error.code === 'P2011') {
        // Query execution errors
        res.status(500).json({ 
          error: 'Database query failed',
          message: 'An error occurred while processing your request' 
        });
        return;
      }
    } else {
      console.error('[ERROR] Login failed:', {
        error: error?.message || error,
        stack: error?.stack,
        timestamp: new Date().toISOString(),
      });
    }
    
    res.status(500).json({ error: 'Login failed' });
  }
};

/**
 * User logout
 */
export const logout = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

/**
 * Refresh access token
 */
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token required' });
      return;
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    // Generate new access token
    const accessToken = generateAccessToken(payload);

    // Set cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      message: 'Token refreshed',
      accessToken,
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
};

/**
 * Get current user
 */
export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        mobileNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

/**
 * Change password
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required' });
      return;
    }

    // Validate new password strength
    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      res.status(400).json({ error: validation.message });
      return;
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};
