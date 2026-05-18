import { Router } from 'express';
import {
  createExpenseType,
  deleteExpenseType,
  listExpenseTypes,
  updateExpenseType,
} from '../controllers/expenseTypeController.js';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import {
  createExpenseTypeRules,
  idParam,
  updateExpenseTypeRules,
} from '../validators/expenseTypeValidators.js';

const router = Router();

router.use(authenticate);

router.get('/', checkPermission('expense_types', 'view'), listExpenseTypes);
router.post('/', checkPermission('expense_types', 'add'), createExpenseTypeRules, validate, createExpenseType);
router.put('/:id', checkPermission('expense_types', 'edit'), updateExpenseTypeRules, validate, updateExpenseType);
router.delete('/:id', checkPermission('expense_types', 'delete'), idParam, validate, deleteExpenseType);

export default router;
