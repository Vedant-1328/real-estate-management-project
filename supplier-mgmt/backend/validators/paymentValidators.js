import { body, query } from 'express-validator';
import { PAYMENT_MODES } from '../constants/paymentModes.js';

export const lookupPartyBalanceRules = [
  query('partyName').trim().notEmpty().withMessage('partyName is required'),
];

export const createPartyPaymentRules = [
  body('partyName').trim().notEmpty().withMessage('Company or person name is required'),
  body('paymentDate').isISO8601(),
  body('amount').isFloat({ min: 0.01 }),
  body('paymentMode').isIn(PAYMENT_MODES),
  body('referenceNumber').optional().trim(),
  body('notes').optional().trim(),
];

export const listPaymentsRules = [
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('paymentMode').optional().isIn([...PAYMENT_MODES, 'all']),
  query('invoiceId').optional().isInt({ min: 1 }).toInt(),
];
