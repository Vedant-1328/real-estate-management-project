import { body, param, query } from 'express-validator';

export const EMPLOYEE_TYPES = [
  'supervisor',
  'accountant',
  'office_staff',
  'helper',
  'site_staff',
  'driver',
];

export const idParam = [param('id').isInt({ min: 1 }).toInt()];
export const docIdParam = [
  param('id').isInt({ min: 1 }).toInt(),
  param('docId').isInt({ min: 1 }).toInt(),
];

export const listEmployeesRules = [
  query('status').optional().isIn(['active', 'inactive', 'all']),
  query('employeeType').optional().isIn([...EMPLOYEE_TYPES, 'all']),
  query('search').optional().trim(),
];

export const createEmployeeRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('mobile').trim().notEmpty().withMessage('Mobile is required'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email'),
  body('roleDepartment').trim().notEmpty().withMessage('Role/Department is required'),
  body('joiningDate').isISO8601().withMessage('Joining date is required'),
  body('grossSalary').isFloat({ min: 0 }).withMessage('Gross salary is required'),
  body('employeeType').isIn(EMPLOYEE_TYPES),
  body('status').optional().isIn(['active', 'inactive']),
  body('notes').optional().trim(),
];

export const updateEmployeeRules = [
  ...idParam,
  body('name').optional().trim().notEmpty(),
  body('mobile').optional().trim().notEmpty(),
  body('email').optional({ values: 'falsy' }).isEmail(),
  body('roleDepartment').optional().trim().notEmpty(),
  body('joiningDate').optional().isISO8601(),
  body('grossSalary').optional().isFloat({ min: 0 }),
  body('employeeType').optional().isIn(EMPLOYEE_TYPES),
  body('status').optional().isIn(['active', 'inactive']),
  body('notes').optional().trim(),
];
