import { body, param, query } from 'express-validator';

export const idParam = [param('id').isInt({ min: 1 }).toInt()];

export const listExpenseRules = [
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('vehicleId').optional().isInt({ min: 1 }).toInt(),
  query('driverId').optional().isInt({ min: 1 }).toInt(),
  query('expenseTypeId').optional().isInt({ min: 1 }).toInt(),
];

export const summaryRules = [
  query('from').isISO8601(),
  query('to').isISO8601(),
];

const expenseBodyRules = [
  body('expenseDate').isISO8601(),
  body('vehicleId').isInt({ min: 1 }).toInt(),
  body('driverId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('expenseTypeId').isInt({ min: 1 }).toInt(),
  body('amount').isFloat({ min: 0 }),
  body('paidBy').trim().notEmpty().withMessage('Paid by is required'),
  body('paymentMode').isIn(['cash', 'bank', 'upi', 'other']),
  body('notes').optional().trim(),
];

export const createExpenseRules = [...expenseBodyRules];

export const updateExpenseRules = [...idParam, ...expenseBodyRules];
