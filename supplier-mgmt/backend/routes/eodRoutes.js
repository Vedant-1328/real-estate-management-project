import { Router } from 'express';
import {
  approveEodEntry,
  createEodEntry,
  deleteEodEntry,
  getEodEntry,
  listEodEntries,
  listPending,
  updateEodEntry,
} from '../controllers/eodController.js';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { auditLog } from '../middlewares/auditLog.js';
import {
  createEodRules,
  idParam,
  listEodRules,
  updateEodRules,
} from '../validators/eodValidators.js';

const router = Router();

router.use(authenticate);

router.get('/pending', checkPermission('eod_entries', 'view'), listPending);
router.get('/', checkPermission('eod_entries', 'view'), listEodRules, validate, listEodEntries);
router.post('/', checkPermission('eod_entries', 'add'), createEodRules, validate, auditLog('eod_entries'), createEodEntry);
router.get('/:id', checkPermission('eod_entries', 'view'), idParam, validate, getEodEntry);
router.put('/:id', checkPermission('eod_entries', 'edit'), updateEodRules, validate, auditLog('eod_entries'), updateEodEntry);
router.put(
  '/:id/approve',
  checkPermission('eod_entries', 'approve'),
  idParam,
  validate,
  approveEodEntry
);
router.delete('/:id', checkPermission('eod_entries', 'delete'), idParam, validate, auditLog('eod_entries'), deleteEodEntry);

export default router;
