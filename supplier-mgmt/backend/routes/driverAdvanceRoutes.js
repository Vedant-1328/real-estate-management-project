import { Router } from 'express';
import {
  createDriverAdvance,
  deleteDriverAdvance,
  getDriverSalarySummary,
  listDriverAdvances,
  processDriverSalary,
  updateDriverAdvance,
} from '../controllers/driverAdvanceController.js';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import {
  advanceBodyRules,
  idParam,
  listAdvanceRules,
  processSalaryRules,
  salarySummaryRules,
  updateAdvanceRules,
} from '../validators/driverAdvanceValidators.js';
import { auditLog } from '../middlewares/auditLog.js';

const router = Router();

router.use(authenticate);

router.get(
  '/salary-summary',
  checkPermission('driver_advances', 'view'),
  salarySummaryRules,
  validate,
  getDriverSalarySummary
);
router.post(
  '/process-salary',
  checkPermission('driver_advances', 'approve'),
  processSalaryRules,
  validate,
  auditLog('driver_advances'),
  processDriverSalary
);
router.get('/', checkPermission('driver_advances', 'view'), listAdvanceRules, validate, listDriverAdvances);
router.post('/', checkPermission('driver_advances', 'add'), advanceBodyRules, validate, auditLog('driver_advances'), createDriverAdvance);
router.put('/:id', checkPermission('driver_advances', 'edit'), updateAdvanceRules, validate, auditLog('driver_advances'), updateDriverAdvance);
router.delete('/:id', checkPermission('driver_advances', 'delete'), idParam, validate, auditLog('driver_advances'), deleteDriverAdvance);

export default router;
