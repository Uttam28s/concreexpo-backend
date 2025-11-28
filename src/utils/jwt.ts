import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/env';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Generate access token
 */
export const generateAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as SignOptions);
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as SignOptions);
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, config.jwt.secret) as JWTPayload;
  } catch (error) {
    return null;
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret) as JWTPayload;
  } catch (error) {
    return null;
  }
};

/**
 * Generate MSG91 OTP Widget JWT token
 * This token is used by MSG91 OTP widget to send and verify OTP
 */
export interface MSG91OTPPayload {
  phone: string;
  appointmentId?: string;
  visitId?: string;
  purpose: 'appointment' | 'worker_visit';
  expiresIn?: number; // in seconds, default 15 minutes
}

export const generateMSG91OTPToken = (payload: MSG91OTPPayload): string => {
  const expiresIn = payload.expiresIn || 15 * 60; // 15 minutes default
  
  return jwt.sign(
    {
      phone: payload.phone,
      appointmentId: payload.appointmentId,
      visitId: payload.visitId,
      purpose: payload.purpose,
    },
    config.jwt.secret, // Using same secret, or can use a separate one
    {
      expiresIn: `${expiresIn}s`,
    } as SignOptions
  );
};

/**
 * Verify MSG91 OTP Widget JWT token
 */
export const verifyMSG91OTPToken = (token: string): MSG91OTPPayload | null => {
  try {
    return jwt.verify(token, config.jwt.secret) as MSG91OTPPayload;
  } catch (error) {
    return null;
  }
};
