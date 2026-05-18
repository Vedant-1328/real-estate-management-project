import { body, param, query } from 'express-validator';

export const idParam = [param('id').isInt({ min: 1 }).toInt()];

export const pendingEodRules = [
  query('from').isISO8601(),
  query('to').isISO8601(),
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
  body('billingPeriodFrom').isISO8601(),
  body('billingPeriodTo').isISO8601(),
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

export const createPaymentRules = [
  body('invoiceId').isInt({ min: 1 }).toInt(),
  body('paymentDate').isISO8601(),
  body('amount').isFloat({ min: 0.01 }),
  body('paymentMode').isIn(['cash', 'bank', 'upi', 'other']),
  body('referenceNumber').optional().trim(),
  body('notes').optional().trim(),
];
