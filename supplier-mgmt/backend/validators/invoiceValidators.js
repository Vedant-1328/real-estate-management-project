import { body, param, query } from 'express-validator';
import { PAYMENT_MODES } from '../constants/paymentModes.js';

export const idParam = [param('id').isInt({ min: 1 }).toInt()];

export const pendingEodRules = [
  query('from').optional({ values: 'falsy' }).isISO8601(),
  query('to').optional({ values: 'falsy' }).isISO8601(),
  query('companyId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
];

export const listInvoiceRules = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('companyId').optional().isInt({ min: 1 }).toInt(),
  query('paymentStatus').optional().isIn([
    'draft',
    'generated',
    'sent',
    'paid',
    'partially_paid',
    'cancelled',
    'all',
  ]),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
];

export const createInvoiceRules = [
  body('billToName').trim().notEmpty().withMessage('Bill-to company name is required'),
  body('billToAddress').optional().trim(),
  body('billToGst').optional().trim(),
  body('issuerCompanyId').isInt({ min: 1 }).toInt(),
  body('billingPeriodFrom').optional({ values: 'falsy' }).isISO8601(),
  body('billingPeriodTo').optional({ values: 'falsy' }).isISO8601(),
  body('eodEntryIds').isArray({ min: 1 }),
  body('eodEntryIds.*').isInt({ min: 1 }).toInt(),
  body('subtotal').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('lineItems').optional().isArray(),
  body('lineItems.*.eodEntryId').isInt({ min: 1 }).toInt(),
  body('lineItems.*.ratePerTrip').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('lineItems.*.amount').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('extraCharges').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('discountPercent').optional({ values: 'falsy' }).isFloat({ min: 0, max: 100 }),
  body('discount').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('cgstRate').optional({ values: 'falsy' }).isFloat({ min: 0, max: 100 }),
  body('sgstRate').optional({ values: 'falsy' }).isFloat({ min: 0, max: 100 }),
  body('notes').optional().trim(),
];

export const updateStatusRules = [
  ...idParam,
  body('status').isIn(['generated', 'sent']),
];

export const updateInvoiceRules = [
  ...idParam,
  body('billToName').trim().notEmpty().withMessage('Bill-to company name is required'),
  body('billToAddress').optional({ values: 'falsy' }).trim(),
  body('billToGst').optional({ values: 'falsy' }).trim(),
  body('issuerCompanyId').isInt({ min: 1 }).toInt(),
  body('billingPeriodFrom').optional({ values: 'falsy' }).isISO8601(),
  body('billingPeriodTo').optional({ values: 'falsy' }).isISO8601(),
  body('subtotal').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('lineItems').optional().isArray(),
  body('lineItems.*.id').isInt({ min: 1 }).toInt(),
  body('lineItems.*.ratePerTrip').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('lineItems.*.amount').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('extraCharges').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('discountPercent').optional({ values: 'falsy' }).isFloat({ min: 0, max: 100 }),
  body('cgstRate').optional({ values: 'falsy' }).isFloat({ min: 0, max: 100 }),
  body('sgstRate').optional({ values: 'falsy' }).isFloat({ min: 0, max: 100 }),
  body('notes').optional({ values: 'falsy' }).trim(),
];

export const createPaymentRules = [
  body('invoiceId').isInt({ min: 1 }).toInt(),
  body('paymentDate').isISO8601(),
  body('amount').isFloat({ min: 0.01 }),
  body('paymentMode').isIn(PAYMENT_MODES),
  body('referenceNumber').optional().trim(),
  body('notes').optional().trim(),
];
