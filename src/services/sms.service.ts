import axios from 'axios';
import { config } from '../config/env';
import prisma from '../config/database';

const MSG91_BASE_URL = 'https://control.msg91.com/api/v5';

interface SendSMSParams {
  to: string;
  message: string;
  templateId?: string;
}

/**
 * Normalize phone number to ensure it has country code 91 for India
 * Handles various formats: 10-digit, with country code, with +, spaces, dashes, etc.
 * @param phone - Phone number in any format
 * @returns Normalized phone number with country code 91 (e.g., "918154831233")
 */
export const normalizePhoneNumber = (phone: string): string | null => {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  // Remove all non-digit characters (spaces, dashes, parentheses, +, etc.)
  let cleaned = phone.replace(/\D/g, '');

  // If empty after cleaning, return null
  if (!cleaned || cleaned.length === 0) {
    return null;
  }

  // Check if number already starts with country code 91
  if (cleaned.startsWith('91')) {
    // If it starts with 91, validate it's 12 digits (91 + 10 digits)
    if (cleaned.length === 12) {
      return cleaned;
    }
    // If it's longer than 12 digits, might have extra digits - take first 12
    if (cleaned.length > 12) {
      console.warn(`Phone number ${phone} has more than 12 digits after 91. Using first 12 digits.`);
      return cleaned.substring(0, 12);
    }
    // If it's less than 12 digits but starts with 91, it's invalid
    console.error(`Invalid phone number format: ${phone} (starts with 91 but has ${cleaned.length} digits)`);
    return null;
  }

  // If number is 10 digits, add country code 91
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }

  // If number is 11-13 digits but doesn't start with 91, it might be invalid
  // But we'll try to handle it - if it's 11 digits, might be 0 + 10 digits (remove leading 0)
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `91${cleaned.substring(1)}`;
  }

  // If it's already 12 digits but doesn't start with 91, it's likely invalid
  // But we'll add 91 anyway if it's exactly 10 digits after removing potential leading 0
  if (cleaned.length > 10 && cleaned.length <= 13) {
    // Try removing leading 0 if present
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return `91${cleaned.substring(1)}`;
    }
    // If it's 12 digits without 91, log warning but return as is (might be valid international format)
    console.warn(`Phone number ${phone} has ${cleaned.length} digits but doesn't start with 91. Using as is.`);
    return cleaned;
  }

  // Invalid length
  console.error(`Invalid phone number format: ${phone} (has ${cleaned.length} digits, expected 10 or 12)`);
  return null;
};

/**
 * Send SMS using MSG91
 */
export const sendSMS = async ({ to, message, templateId }: SendSMSParams): Promise<boolean> => {
  // Normalize phone number to ensure it has country code 91
  const normalizedPhone = normalizePhoneNumber(to);
  
  if (!normalizedPhone) {
    console.error(`Invalid phone number format: ${to}`);
    try {
      await prisma.sMSLog.create({
        data: {
          phone: to,
          message,
          status: 'failed',
          provider: 'msg91',
          error: 'Invalid phone number format',
        },
      });
    } catch (logError) {
      console.error('Failed to log SMS error:', logError);
    }
    return false;
  }

  try {
    // MSG91 expects without + symbol (already removed in normalizePhoneNumber)
    const cleanPhone = normalizedPhone;

    // If using template
    if (templateId || config.sms.msg91.templateId) {
      const response = await axios.post(
        `${MSG91_BASE_URL}/flow/`,
        {
          template_id: templateId || config.sms.msg91.templateId,
          sender: config.sms.msg91.senderId,
          short_url: '0',
          mobiles: cleanPhone,
          var1: message, // Message as variable for template
        },
        {
          headers: {
            'authkey': config.sms.msg91.authKey,
            'content-type': 'application/json',
          },
        }
      );

      // Log SMS in database (log normalized phone for consistency)
      await prisma.sMSLog.create({
        data: {
          phone: normalizedPhone,
          message,
          status: response.data.type === 'success' ? 'sent' : 'failed',
          provider: 'msg91',
          providerId: response.data.request_id || response.data.message_id,
        },
      });

      return response.data.type === 'success';
    } else {
      // Direct SMS without template
      const response = await axios.post(
        `${MSG91_BASE_URL}/flow/`,
        {
          sender: config.sms.msg91.senderId,
          route: config.sms.msg91.route,
          country: '91',
          sms: [
            {
              message: message,
              to: [cleanPhone],
            },
          ],
        },
        {
          headers: {
            'authkey': config.sms.msg91.authKey,
            'content-type': 'application/json',
          },
        }
      );

      // Log SMS in database (log normalized phone for consistency)
      await prisma.sMSLog.create({
        data: {
          phone: normalizedPhone,
          message,
          status: response.data.type === 'success' ? 'sent' : 'failed',
          provider: 'msg91',
          providerId: response.data.request_id || response.data.message_id,
        },
      });

      return response.data.type === 'success';
    }
  } catch (error: any) {
    // Log failed SMS (use normalized phone if available, otherwise original)
    const phoneToLog = normalizedPhone || to;
    await prisma.sMSLog.create({
      data: {
        phone: phoneToLog,
        message,
        status: 'failed',
        provider: 'msg91',
        error: error.response?.data?.message || error.message || 'Unknown error',
      },
    });

    console.error('MSG91 SMS sending failed:', {
      originalPhone: to,
      normalizedPhone: normalizedPhone,
      error: error.response?.data || error.message,
    });
    return false;
  }
};

/**
 * Send OTP using MSG91 OTP API (recommended for OTPs)
 */
export const sendOTPViaMSG91 = async (
  phone: string,
  otp: string,
  templateId?: string
): Promise<boolean> => {
  // Normalize phone number to ensure it has country code 91
  const normalizedPhone = normalizePhoneNumber(phone);
  
  if (!normalizedPhone) {
    console.error(`Invalid phone number format: ${phone}`);
    try {
      await prisma.sMSLog.create({
        data: {
          phone: phone,
          message: `OTP: ${otp}`,
          status: 'failed',
          provider: 'msg91',
          error: 'Invalid phone number format',
        },
      });
    } catch (logError) {
      console.error('Failed to log SMS error:', logError);
    }
    return false;
  }

  try {
    // MSG91 expects without + symbol (already removed in normalizePhoneNumber)
    const cleanPhone = normalizedPhone;

    if (templateId || config.sms.msg91.otpTemplateId) {
      // Use MSG91 OTP API with template
      const response = await axios.post(
        `${MSG91_BASE_URL}/otp`,
        {
          template_id: templateId || config.sms.msg91.otpTemplateId,
          mobile: cleanPhone,
          otp: otp,
        },
        {
          headers: {
            'authkey': config.sms.msg91.authKey,
            'content-type': 'application/json',
          },
        }
      );

      const isSuccess = response.data.type === 'success';

      await prisma.sMSLog.create({
        data: {
          phone: normalizedPhone,
          message: `OTP: ${otp}`,
          status: isSuccess ? 'sent' : 'failed',
          provider: 'msg91',
          providerId: response.data.request_id,
          error: isSuccess ? null : (response.data.message || 'Unknown error'),
        },
      });

      if (!isSuccess) {
        console.error(`MSG91 OTP API failed for ${normalizedPhone} (original: ${phone}):`, response.data);
      }

      return isSuccess;
    } else {
      // Fallback to regular SMS if no OTP template configured
      console.log(`No OTP template configured, using regular SMS for ${normalizedPhone} (original: ${phone})`);
      return await sendSMS({
        to: normalizedPhone,
        message: `Your OTP is: ${otp}. Valid for 15 minutes. Do not share with anyone.`
      });
    }
  } catch (error: any) {
    console.error('MSG91 OTP sending failed:', {
      originalPhone: phone,
      normalizedPhone: normalizedPhone,
      error: error.response?.data || error.message,
      status: error.response?.status,
    });

    // Log the error to database
    try {
      await prisma.sMSLog.create({
        data: {
          phone: normalizedPhone,
          message: `OTP: ${otp}`,
          status: 'failed',
          provider: 'msg91',
          error: error.response?.data?.message || error.message || 'Unknown error',
        },
      });
    } catch (logError) {
      console.error('Failed to log SMS error:', logError);
    }

    // Fallback to regular SMS
    return await sendSMS({
      to: normalizedPhone,
      message: `Your OTP is: ${otp}. Valid for 15 minutes. Do not share with anyone.`
    });
  }
};

/**
 * Send appointment notification to client
 */
export const sendAppointmentNotification = async (
  clientPhone: string,
  engineerName: string,
  date: string,
  time: string,
  location: string,
  companyName: string = 'Concreexpo'
): Promise<boolean> => {
  const message = `Appointment scheduled with ${engineerName} on ${date} at ${time}. Location: ${location}. You will receive an OTP after the visit for verification. - ${companyName}`;
  return sendSMS({ to: clientPhone, message });
};

/**
 * Send appointment notification to engineer
 */
export const sendAppointmentNotificationToEngineer = async (
  engineerPhone: string,
  clientName: string,
  date: string,
  time: string,
  location: string,
  purpose: string,
  companyName: string = 'Concreexpo'
): Promise<boolean> => {
  const message = `New appointment: Client ${clientName}, Date: ${date} ${time}, Location: ${location}, Purpose: ${purpose}. Check dashboard for details. - ${companyName}`;
  return sendSMS({ to: engineerPhone, message });
};

/**
 * Send OTP for visit verification
 */
export const sendVisitOTP = async (
  clientPhone: string,
  otp: string,
  engineerName: string,
  companyName: string = 'Concreexpo'
): Promise<boolean> => {
  try {
    // Normalize phone number to ensure it has country code 91
    const normalizedPhone = normalizePhoneNumber(clientPhone);
    
    if (!normalizedPhone) {
      console.error(`Invalid phone number format: ${clientPhone}`);
      await prisma.sMSLog.create({
        data: {
          phone: clientPhone,
          message: `OTP: ${otp}`,
          status: 'failed',
          provider: 'msg91',
          error: 'Invalid phone number format',
        },
      });
      return false;
    }

    console.log(`Attempting to send OTP to ${normalizedPhone} (original: ${clientPhone})`);

    const message = `Your OTP for visit verification with ${engineerName} is: ${otp}. Valid for 15 minutes. Share this with the engineer. - ${companyName}`;

    // Try using MSG91 OTP API first, fallback to regular SMS
    const otpSent = await sendOTPViaMSG91(normalizedPhone, otp);
    console.log('365 otpSent :', otpSent, 'normalizedPhone :', normalizedPhone, 'clientPhone :', clientPhone);
    // If OTP API fails, try regular SMS with custom message
    if (!otpSent) {
      console.log(`OTP API failed, trying regular SMS for ${normalizedPhone}`);
      const smsSent = await sendSMS({ to: normalizedPhone, message });
      
      if (!smsSent) {
        console.error(`Both OTP API and regular SMS failed for ${normalizedPhone}`);
        // Log to database for debugging
        try {
          await prisma.sMSLog.create({
            data: {
              phone: normalizedPhone,
              message: `OTP: ${otp}`,
              status: 'failed',
              provider: 'msg91',
              error: 'Both OTP API and regular SMS failed',
            },
          });
        } catch (logError) {
          console.error('Failed to log SMS error:', logError);
        }
      }
      
      return smsSent;
    }

    return otpSent;
  } catch (error: any) {
    console.error('Error in sendVisitOTP:', {
      clientPhone,
      error: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    
    // Log to database for debugging
    try {
      await prisma.sMSLog.create({
        data: {
          phone: clientPhone,
          message: `OTP: ${otp}`,
          status: 'failed',
          provider: 'msg91',
          error: error.message || 'Unknown error in sendVisitOTP',
        },
      });
    } catch (logError) {
      console.error('Failed to log SMS error:', logError);
    }
    
    return false;
  }
};

/**
 * Send OTP for worker count verification (to client)
 */
export const sendWorkerCountOTPToClient = async (
  clientPhone: string,
  otp: string,
  siteName: string,
  date: string,
  companyName: string = 'Concreexpo'
): Promise<boolean> => {
  const message = `Worker count verification for ${siteName} on ${date}. Your OTP is: ${otp}. Valid for 24 hours. - ${companyName}`;

  // Try using MSG91 OTP API first
  const otpSent = await sendOTPViaMSG91(clientPhone, otp);

  if (!otpSent) {
    return sendSMS({ to: clientPhone, message });
  }

  return otpSent;
};

/**
 * Send OTP for worker count verification (to admin)
 */
export const sendWorkerCountOTPToAdmin = async (
  adminPhone: string,
  otp: string,
  engineerName: string,
  clientName: string,
  date: string,
  companyName: string = 'Concreexpo'
): Promise<boolean> => {
  const message = `Worker visit created by ${engineerName} for ${clientName} on ${date}. Verification OTP: ${otp}. - ${companyName}`;
  return sendSMS({ to: adminPhone, message });
};

/**
 * Check MSG91 balance (useful for monitoring)
 */
export const checkMSG91Balance = async (): Promise<any> => {
  try {
    const response = await axios.get(
      `${MSG91_BASE_URL}/balance`,
      {
        headers: {
          'authkey': config.sms.msg91.authKey,
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Failed to check MSG91 balance:', error.response?.data || error.message);
    return null;
  }
};
