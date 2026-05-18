import { Router } from 'express';
import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  resetPassword,
  updateUser,
} from '../controllers/userController.js';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import {
  createUserRules,
  idParam,
  listUsersRules,
  resetPasswordRules,
  updateUserRules,
} from '../validators/userValidators.js';

const router = Router();

router.use(authenticate);

router.get('/', checkPermission('users', 'view'), listUsersRules, validate, listUsers);
router.post('/', checkPermission('users', 'add'), createUserRules, validate, createUser);
router.get('/:id', checkPermission('users', 'view'), idParam, validate, getUser);
router.put('/:id', checkPermission('users', 'edit'), updateUserRules, validate, updateUser);
router.put(
  '/:id/reset-password',
  checkPermission('users', 'edit'),
  resetPasswordRules,
  validate,
  resetPassword
);
router.delete('/:id', checkPermission('users', 'delete'), idParam, validate, deleteUser);

export default router;
