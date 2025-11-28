import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // SMS (MSG91)
  sms: {
    provider: process.env.SMS_PROVIDER || 'msg91',
    msg91: {
      authKey: process.env.MSG91_AUTH_KEY!,
      senderId: process.env.MSG91_SENDER_ID || 'CNCEXP',
      route: process.env.MSG91_ROUTE || '4', // 4 = Transactional
      templateId: process.env.MSG91_TEMPLATE_ID,
      otpTemplateId: process.env.MSG91_OTP_TEMPLATE_ID,
    },
  },

  // Admin
  admin: {
    email: process.env.ADMIN_EMAIL!,
    password: process.env.ADMIN_PASSWORD!,
    phone: process.env.ADMIN_PHONE!,
  },

  // Rate Limiting
  rateLimit: {
    window: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    otpMax: parseInt(process.env.OTP_RATE_LIMIT_MAX || '5', 10),
  },

  // OTP
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '15', 10),
    length: parseInt(process.env.OTP_LENGTH || '6', 10),
    workerVisitExpiryHours: parseInt(process.env.WORKER_VISIT_OTP_EXPIRY_HOURS || '24', 10),
  },
};
