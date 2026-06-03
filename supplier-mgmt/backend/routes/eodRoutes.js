import { Router } from 'express';
import {
  approveEodEntry,
  createEodEntry,
  deleteEodEntry,
  getEodEntry,
  listEodEntries,
  updateEodEntry,
} from '../controllers/eodController.js';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { auditLog } from '../middlewares/auditLog.js';
import {
  createEodRules,
  listEodRules,
  updateEodRules,
} from '../validators/eodValidators.js';

const router = Router();

router.use(authenticate);

const removedEodMessage =
  'This endpoint has been removed. Use GET /eod-entries with date filters instead.';

// Parse :id without treating "pending" as an integer (legacy URL → clear 404).
const parseEodIdParam = (req, res, next) => {
  const raw = String(req.params.id ?? '');
  if (raw === 'pending') {
    return res.status(404).json({ success: false, message: removedEodMessage });
  }
  const id = parseInt(raw, 10);
  if (Number.isNaN(id) || id < 1) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'id', message: 'Invalid id' }],
    });
  }
  req.params.id = id;
  next();
};

router.get('/', checkPermission('eod_entries', 'view'), listEodRules, validate, listEodEntries);
router.post('/', checkPermission('eod_entries', 'add'), createEodRules, validate, auditLog('eod_entries'), createEodEntry);
router.get('/:id', checkPermission('eod_entries', 'view'), parseEodIdParam, getEodEntry);
router.put(
  '/:id',
  checkPermission('eod_entries', 'edit'),
  parseEodIdParam,
  updateEodRules,
  validate,
  auditLog('eod_entries'),
  updateEodEntry
);
router.put(
  '/:id/approve',
  checkPermission('eod_entries', 'approve'),
  parseEodIdParam,
  approveEodEntry
);
router.delete(
  '/:id',
  checkPermission('eod_entries', 'delete'),
  parseEodIdParam,
  auditLog('eod_entries'),
  deleteEodEntry
);

export default router;
