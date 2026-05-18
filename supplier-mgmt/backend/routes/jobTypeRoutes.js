import { Router } from 'express';
import {
  createJobType,
  deleteJobType,
  listJobTypes,
  updateJobType,
} from '../controllers/jobTypeController.js';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import {
  createJobTypeRules,
  idParam,
  updateJobTypeRules,
} from '../validators/jobTypeValidators.js';

const router = Router();

router.use(authenticate);

router.get('/', checkPermission('job_types', 'view'), listJobTypes);
router.post('/', checkPermission('job_types', 'add'), createJobTypeRules, validate, createJobType);
router.put('/:id', checkPermission('job_types', 'edit'), updateJobTypeRules, validate, updateJobType);
router.delete('/:id', checkPermission('job_types', 'delete'), idParam, validate, deleteJobType);

export default router;
