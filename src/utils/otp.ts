import { config } from '../config/env';

/**
 * Generate a random OTP code
 */
export const generateOTP = (length: number = config.otp.length): string => {
  const digits = '0123456789';
  let otp = '';

  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }

  return otp;
};

/**
 * Calculate OTP expiry time
 */
export const getOTPExpiry = (minutes: number = config.otp.expiryMinutes): Date => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + minutes);
  return expiry;
};

/**
 * Calculate OTP expiry time for worker visits (in hours)
 */
export const getWorkerVisitOTPExpiry = (hours: number = config.otp.workerVisitExpiryHours): Date => {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry;
};

/**
 * Verify if OTP has expired
 */
export const isOTPExpired = (expiryDate: Date): boolean => {
  return new Date() > expiryDate;
};
