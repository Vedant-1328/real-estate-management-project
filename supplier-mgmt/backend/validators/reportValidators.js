import { query } from 'express-validator';

export const dateQuery = [
  query('date').optional().isISO8601(),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
];

export const dailyJobReportRules = [
  query('date').isISO8601(),
  query('companyId').optional().isInt({ min: 1 }).toInt(),
  query('driverId').optional().isInt({ min: 1 }).toInt(),
  query('vehicleId').optional().isInt({ min: 1 }).toInt(),
  query('jobTypeId').optional().isInt({ min: 1 }).toInt(),
];

export const dateRangeRules = [
  query('from').isISO8601(),
  query('to').isISO8601(),
];

export const vehicleReportRules = [...dateRangeRules];

export const driverReportRules = [
  ...dateRangeRules,
  query('driverId').optional().isInt({ min: 1 }).toInt(),
];

export const companyBillingReportRules = [
  ...dateRangeRules,
  query('companyId').optional().isInt({ min: 1 }).toInt(),
];

export const expenseReportRules = [
  ...dateRangeRules,
  query('vehicleId').optional().isInt({ min: 1 }).toInt(),
  query('expenseTypeId').optional().isInt({ min: 1 }).toInt(),
];

export const profitReportRules = [...dateRangeRules];

export const salaryReportRules = [
  query('month').isInt({ min: 1, max: 12 }).toInt(),
  query('year').isInt({ min: 2000, max: 2100 }).toInt(),
  query('type').isIn(['driver', 'employee']),
];
