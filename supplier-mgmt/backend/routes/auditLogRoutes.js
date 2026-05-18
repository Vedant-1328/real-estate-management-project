import { Router } from 'express';
import { query } from 'express-validator';
import { listAuditLogs } from '../controllers/auditLogController.js';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/rbac.js';
import { SUPER_ADMIN_ROLE } from '../utils/permissions.js';
import { validate } from '../middlewares/validate.js';

const router = Router();

router.use(authenticate);

router.use((req, res, next) => {
  if (req.user.roleName !== SUPER_ADMIN_ROLE) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
});

router.get(
  '/',
  checkPermission('audit_logs', 'view'),
  [
    query('module').optional().trim(),
    query('userId').optional().isInt({ min: 1 }).toInt(),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
  ],
  validate,
  listAuditLogs
);

export default router;
