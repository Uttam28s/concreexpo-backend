import { Router } from 'express';
import {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  getEngineerDashboard,
  sendOTP,
  resendOTP,
  verifyOTP,
  generateOTPWidgetToken,
  verifyOTPWithWidget,
  submitFeedback,
  getReports,
  getAdminDashboardStats,
  exportAppointments,
} from '../controllers/appointment.controller';
import { authenticate, adminOnly, engineerOnly } from '../middleware/auth.middleware';

const router = Router();

// All appointment routes require authentication
router.use(authenticate);

// Admin routes
router.get('/', getAppointments); // Role-based: Admin sees all, Engineer sees own
router.get('/reports', adminOnly, getReports);
router.get('/dashboard/stats', adminOnly, getAdminDashboardStats);
router.get('/export', adminOnly, exportAppointments);
router.post('/', adminOnly, createAppointment);
router.put('/:id', adminOnly, updateAppointment);
router.delete('/:id', adminOnly, cancelAppointment);

// Engineer routes
router.get('/dashboard', engineerOnly, getEngineerDashboard);
router.post('/:id/send-otp', engineerOnly, sendOTP);
router.post('/:id/resend-otp', engineerOnly, resendOTP);
router.post('/:id/verify-otp', engineerOnly, verifyOTP);
router.get('/:id/otp-widget-token', engineerOnly, generateOTPWidgetToken);
router.post('/:id/verify-otp-widget', engineerOnly, verifyOTPWithWidget);
router.post('/:id/feedback', engineerOnly, submitFeedback);

// Shared routes
router.get('/:id', getAppointment); // Role-based access check inside controller

export default router;
