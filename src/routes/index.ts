import { Router } from 'express';
import authRoutes from './auth.routes';
import clientRoutes from './client.routes';
import engineerRoutes from './engineer.routes';
import materialRoutes from './material.routes';
import appointmentRoutes from './appointment.routes';
import inventoryRoutes from './inventory.routes';
import workerVisitRoutes from './workerVisit.routes';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Concreexpo API is running' });
});

// Routes
router.use('/auth', authRoutes);
router.use('/clients', clientRoutes);
router.use('/engineers', engineerRoutes);
router.use('/materials', materialRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/worker-visits', workerVisitRoutes);

export default router;
