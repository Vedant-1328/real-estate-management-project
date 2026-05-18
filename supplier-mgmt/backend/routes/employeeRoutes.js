import { Router } from 'express';
import { body } from 'express-validator';
import {
  createEmployee,
  deleteDocument,
  deleteEmployee,
  getEmployee,
  listEmployees,
  updateEmployee,
  uploadDocument,
} from '../controllers/employeeController.js';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/rbac.js';
import { employeeDocumentUpload } from '../middlewares/employeeUpload.js';
import { validate } from '../middlewares/validate.js';
import { auditLog } from '../middlewares/auditLog.js';
import {
  createEmployeeRules,
  docIdParam,
  idParam,
  listEmployeesRules,
  updateEmployeeRules,
} from '../validators/employeeValidators.js';
import { EMPLOYEE_DOC_TYPES } from '../models/EmployeeDocument.js';

const router = Router();

router.use(authenticate);

router.get('/', checkPermission('employees', 'view'), listEmployeesRules, validate, listEmployees);
router.post('/', checkPermission('employees', 'add'), createEmployeeRules, validate, createEmployee);
router.get('/:id', checkPermission('employees', 'view'), idParam, validate, getEmployee);
router.put('/:id', checkPermission('employees', 'edit'), updateEmployeeRules, validate, auditLog('employees'), updateEmployee);
router.delete('/:id', checkPermission('employees', 'delete'), idParam, validate, auditLog('employees'), deleteEmployee);

router.post(
  '/:id/documents',
  checkPermission('employees', 'edit'),
  idParam,
  validate,
  employeeDocumentUpload.single('file'),
  [body('docType').isIn(EMPLOYEE_DOC_TYPES)],
  validate,
  uploadDocument
);
router.delete(
  '/:id/documents/:docId',
  checkPermission('employees', 'delete'),
  docIdParam,
  validate,
  deleteDocument
);

export default router;
