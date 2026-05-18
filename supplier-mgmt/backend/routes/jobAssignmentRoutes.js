import { Router } from 'express';
import {
  createAssignment,
  deleteAssignment,
  getAssignment,
  getEffectiveRateForAssignment,
  listAssignments,
  updateAssignment,
  updateAssignmentStatus,
} from '../controllers/jobAssignmentController.js';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { auditLog } from '../middlewares/auditLog.js';
import {
  createAssignmentRules,
  effectiveRateRules,
  idParam,
  listAssignmentsRules,
  updateAssignmentRules,
  updateStatusRules,
} from '../validators/jobAssignmentValidators.js';

const router = Router();

router.use(authenticate);

router.get(
  '/effective-rate',
  checkPermission('job_assignments', 'view'),
  effectiveRateRules,
  validate,
  getEffectiveRateForAssignment
);
router.get(
  '/',
  checkPermission('job_assignments', 'view'),
  listAssignmentsRules,
  validate,
  listAssignments
);
router.post(
  '/',
  checkPermission('job_assignments', 'add'),
  createAssignmentRules,
  validate,
  auditLog('job_assignments'),
  createAssignment
);
router.get('/:id', checkPermission('job_assignments', 'view'), idParam, validate, getAssignment);
router.put(
  '/:id',
  checkPermission('job_assignments', 'edit'),
  updateAssignmentRules,
  validate,
  auditLog('job_assignments'),
  updateAssignment
);
router.put(
  '/:id/status',
  checkPermission('job_assignments', 'edit'),
  updateStatusRules,
  validate,
  updateAssignmentStatus
);
router.delete(
  '/:id',
  checkPermission('job_assignments', 'delete'),
  idParam,
  validate,
  auditLog('job_assignments'),
  deleteAssignment
);

export default router;
