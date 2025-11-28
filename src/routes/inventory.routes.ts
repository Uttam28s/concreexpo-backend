import { Router } from 'express';
import {
  stockIn,
  stockOut,
  getStock,
  getTransactions,
  getDashboardStats,
  getUsageReport,
  getBySiteReport,
  getBalanceReport,
} from '../controllers/inventory.controller';
import { authenticate, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// All inventory routes require authentication
router.use(authenticate);

// Stock management (Admin and Engineer can both use)
router.post('/stock-in', stockIn);
router.post('/stock-out', stockOut);

// Data retrieval
router.get('/stock', getStock);
router.get('/transactions', getTransactions);
router.get('/dashboard/stats', getDashboardStats);

// Reports (Admin only)
router.get('/reports/usage', adminOnly, getUsageReport);
router.get('/reports/by-site', adminOnly, getBySiteReport);
router.get('/reports/balance', adminOnly, getBalanceReport);

export default router;
