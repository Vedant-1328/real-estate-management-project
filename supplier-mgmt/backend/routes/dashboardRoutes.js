import { Router } from 'express';
import { getSummary } from '../controllers/dashboardController.js';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/rbac.js';

const router = Router();

router.get(
  '/summary',
  authenticate,
  checkPermission('dashboard', 'view'),
  getSummary
);

export default router;
