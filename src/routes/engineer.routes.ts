import { Router } from 'express';
import {
  getEngineers,
  getEngineer,
  createEngineer,
  updateEngineer,
  deleteEngineer,
  resetPassword,
} from '../controllers/engineer.controller';
import { authenticate, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// All engineer routes require authentication and admin access
router.use(authenticate, adminOnly);

router.get('/', getEngineers);
router.get('/:id', getEngineer);
router.post('/', createEngineer);
router.put('/:id', updateEngineer);
router.delete('/:id', deleteEngineer);
router.post('/:id/reset-password', resetPassword);

export default router;
