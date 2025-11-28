import { Router } from 'express';
import {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  getClientTypes,
  createClientType,
} from '../controllers/client.controller';
import { authenticate, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// All client routes require authentication
router.use(authenticate);

// Client type routes (order matters - /types must come before /:id)
router.get('/types', getClientTypes);
router.post('/types', adminOnly, createClientType);

// Client routes
router.get('/', getClients);
router.get('/:id', getClient);
router.post('/', adminOnly, createClient);
router.put('/:id', adminOnly, updateClient);
router.delete('/:id', adminOnly, deleteClient);

export default router;
