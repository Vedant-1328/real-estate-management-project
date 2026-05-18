import { Router } from 'express';
import {
  createEmployeeAdvance,
  deleteEmployeeAdvance,
  getEmployeeSalarySummary,
  listEmployeeAdvances,
  processEmployeeSalary,
  updateEmployeeAdvance,
} from '../controllers/employeeAdvanceController.js';
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
} from '../validators/employeeAdvanceValidators.js';
import { auditLog } from '../middlewares/auditLog.js';

const router = Router();

router.use(authenticate);

router.get(
  '/salary-summary',
  checkPermission('employee_advances', 'view'),
  salarySummaryRules,
  validate,
  getEmployeeSalarySummary
);
router.post(
  '/process-salary',
  checkPermission('employee_advances', 'approve'),
  processSalaryRules,
  validate,
  auditLog('employee_advances'),
  processEmployeeSalary
);
router.get('/', checkPermission('employee_advances', 'view'), listAdvanceRules, validate, listEmployeeAdvances);
router.post('/', checkPermission('employee_advances', 'add'), advanceBodyRules, validate, auditLog('employee_advances'), createEmployeeAdvance);
router.put('/:id', checkPermission('employee_advances', 'edit'), updateAdvanceRules, validate, auditLog('employee_advances'), updateEmployeeAdvance);
router.delete('/:id', checkPermission('employee_advances', 'delete'), idParam, validate, auditLog('employee_advances'), deleteEmployeeAdvance);

export default router;
