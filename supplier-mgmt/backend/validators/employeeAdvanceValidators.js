import { body, param, query } from 'express-validator';
import { ADVANCE_PAYMENT_MODES, ADVANCE_STATUSES } from '../models/DriverAdvance.js';

export const idParam = [param('id').isInt({ min: 1 }).toInt()];

export const listAdvanceRules = [
  query('employeeId').optional().isInt({ min: 1 }).toInt(),
  query('month').optional().isInt({ min: 1, max: 12 }).toInt(),
  query('year').optional().isInt({ min: 2000, max: 2100 }).toInt(),
  query('status').optional().isIn([...ADVANCE_STATUSES, 'all']),
  query('search').optional().trim(),
  query('employeeType').optional().isIn([
    'supervisor',
    'accountant',
    'office_staff',
    'helper',
    'site_staff',
    'driver',
    'all',
  ]),
];

export const salarySummaryRules = [
  query('month').isInt({ min: 1, max: 12 }).toInt(),
  query('year').isInt({ min: 2000, max: 2100 }).toInt(),
  query('employeeType').optional().isIn([
    'supervisor',
    'accountant',
    'office_staff',
    'helper',
    'site_staff',
    'driver',
    'all',
  ]),
];

export const advanceBodyRules = [
  body('employeeId').isInt({ min: 1 }).toInt(),
  body('advanceDate').isISO8601(),
  body('amount').isFloat({ min: 0.01 }),
  body('givenBy').trim().notEmpty(),
  body('paymentMode').isIn(ADVANCE_PAYMENT_MODES),
  body('reason').optional().trim(),
  body('salaryPeriodMonth').isInt({ min: 1, max: 12 }).toInt(),
  body('salaryPeriodYear').isInt({ min: 2000, max: 2100 }).toInt(),
];

export const updateAdvanceRules = [
  ...idParam,
  body('employeeId').optional().isInt({ min: 1 }).toInt(),
  body('advanceDate').optional().isISO8601(),
  body('amount').optional().isFloat({ min: 0.01 }),
  body('givenBy').optional().trim().notEmpty(),
  body('paymentMode').optional().isIn(ADVANCE_PAYMENT_MODES),
  body('reason').optional().trim(),
  body('salaryPeriodMonth').optional().isInt({ min: 1, max: 12 }).toInt(),
  body('salaryPeriodYear').optional().isInt({ min: 2000, max: 2100 }).toInt(),
];

export const processSalaryRules = [
  body('employeeIds').isArray({ min: 1 }),
  body('employeeIds.*').isInt({ min: 1 }).toInt(),
  body('month').isInt({ min: 1, max: 12 }).toInt(),
  body('year').isInt({ min: 2000, max: 2100 }).toInt(),
];
