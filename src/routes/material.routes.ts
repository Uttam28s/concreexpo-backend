import { Router } from 'express';
import {
  getMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  deleteMaterial,
} from '../controllers/material.controller';
import { authenticate, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// All material routes require authentication
router.use(authenticate);

router.get('/', getMaterials);
router.get('/:id', getMaterial);
router.post('/', adminOnly, createMaterial);
router.put('/:id', adminOnly, updateMaterial);
router.delete('/:id', adminOnly, deleteMaterial);

export default router;
