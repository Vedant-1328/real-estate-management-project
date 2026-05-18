import { Router } from 'express';
import {
  createRole,
  getRolePermissions,
  listRoles,
  replaceRolePermissions,
  updateRole,
} from '../controllers/roleController.js';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import {
  createRoleRules,
  idParam,
  replacePermissionsRules,
  updateRoleRules,
} from '../validators/roleValidators.js';

const router = Router();

router.use(authenticate);

router.get('/', checkPermission('roles', 'view'), listRoles);
router.post('/', checkPermission('roles', 'add'), createRoleRules, validate, createRole);
router.put('/:id', checkPermission('roles', 'edit'), updateRoleRules, validate, updateRole);
router.get(
  '/:id/permissions',
  checkPermission('roles', 'view'),
  idParam,
  validate,
  getRolePermissions
);
router.put(
  '/:id/permissions',
  checkPermission('roles', 'edit'),
  replacePermissionsRules,
  validate,
  replaceRolePermissions
);

export default router;
