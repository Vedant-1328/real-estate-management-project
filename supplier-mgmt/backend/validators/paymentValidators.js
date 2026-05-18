import { query } from 'express-validator';

export const listPaymentsRules = [
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('paymentMode').optional().isIn(['cash', 'bank', 'upi', 'other', 'all']),
  query('invoiceId').optional().isInt({ min: 1 }).toInt(),
];
