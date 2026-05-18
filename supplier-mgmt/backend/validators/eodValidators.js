import { body, param, query } from 'express-validator';

export const idParam = [param('id').isInt({ min: 1 }).toInt()];

export const listEodRules = [
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('companyId').optional().isInt({ min: 1 }).toInt(),
  query('driverId').optional().isInt({ min: 1 }).toInt(),
  query('vehicleId').optional().isInt({ min: 1 }).toInt(),
  query('billingStatus').optional().isIn(['pending', 'invoiced', 'all']),
];

export const createEodRules = [
  body('assignmentId').isInt({ min: 1 }).toInt(),
  body('actualTrips').isInt({ min: 0 }).toInt(),
  body('extraCharges').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('deductions').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('dieselFuel').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('expense').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('remarks').optional().trim(),
  body('startTime').optional().trim(),
  body('endTime').optional().trim(),
  body('approved').optional().isBoolean().toBoolean(),
];

export const updateEodRules = [
  ...idParam,
  body('actualTrips').optional().isInt({ min: 0 }).toInt(),
  body('extraCharges').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('deductions').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('dieselFuel').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('expense').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('remarks').optional().trim(),
  body('startTime').optional().trim(),
  body('endTime').optional().trim(),
  body('approved').optional().isBoolean().toBoolean(),
];
