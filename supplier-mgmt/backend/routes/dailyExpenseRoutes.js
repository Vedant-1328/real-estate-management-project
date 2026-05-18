import { Router } from 'express';
import {
  createExpense,
  deleteExpense,
  getExpense,
  listExpenses,
  summaryByVehicle,
  updateExpense,
} from '../controllers/dailyExpenseController.js';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/rbac.js';
import { expenseReceiptUpload } from '../middlewares/expenseUpload.js';
import { validate } from '../middlewares/validate.js';
import {
  createExpenseRules,
  idParam,
  listExpenseRules,
  summaryRules,
  updateExpenseRules,
} from '../validators/dailyExpenseValidators.js';

const router = Router();

router.use(authenticate);

router.get(
  '/summary/by-vehicle',
  checkPermission('daily_expenses', 'view'),
  summaryRules,
  validate,
  summaryByVehicle
);
router.get(
  '/',
  checkPermission('daily_expenses', 'view'),
  listExpenseRules,
  validate,
  listExpenses
);
router.post(
  '/',
  checkPermission('daily_expenses', 'add'),
  expenseReceiptUpload.single('receipt'),
  createExpenseRules,
  validate,
  createExpense
);
router.get('/:id', checkPermission('daily_expenses', 'view'), idParam, validate, getExpense);
router.put(
  '/:id',
  checkPermission('daily_expenses', 'edit'),
  expenseReceiptUpload.single('receipt'),
  updateExpenseRules,
  validate,
  updateExpense
);
router.delete('/:id', checkPermission('daily_expenses', 'delete'), idParam, validate, deleteExpense);

export default router;
