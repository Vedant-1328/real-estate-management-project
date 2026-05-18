import { body, param, query } from 'express-validator';

const rateTypes = ['per_trip', 'per_day', 'per_hour', 'fixed', 'per_ton'];

export const listCompaniesRules = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 500 }).toInt(),
  query('search').optional().trim(),
  query('status').optional().isIn(['active', 'inactive', 'all']),
];

export const companyIdParam = [param('id').isInt({ min: 1 }).toInt()];

export const rateIdParam = [
  param('id').isInt({ min: 1 }).toInt(),
  param('rateId').isInt({ min: 1 }).toInt(),
];

export const createCompanyRules = [
  body('companyName').trim().notEmpty().withMessage('Company name is required'),
  body('contactPerson').trim().notEmpty().withMessage('Contact person is required'),
  body('mobile').trim().notEmpty().withMessage('Mobile is required'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email'),
  body('billingAddress').optional().trim(),
  body('gstNumber').optional().trim(),
  body('paymentTerms').optional().trim(),
  body('bankAccountNumber').optional({ values: 'falsy' }).trim(),
  body('bankIfscCode')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/)
    .withMessage('Invalid IFSC code'),
  body('bankAccountHolderName').optional({ values: 'falsy' }).trim(),
  body('status').optional().isIn(['active', 'inactive']),
  body('notes').optional().trim(),
];

export const updateCompanyRules = [
  ...companyIdParam,
  body('companyName').optional().trim().notEmpty(),
  body('contactPerson').optional().trim().notEmpty(),
  body('mobile').optional().trim().notEmpty(),
  body('email').optional({ values: 'falsy' }).isEmail(),
  body('billingAddress').optional().trim(),
  body('gstNumber').optional().trim(),
  body('paymentTerms').optional().trim(),
  body('bankAccountNumber').optional({ values: 'falsy' }).trim(),
  body('bankIfscCode')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/)
    .withMessage('Invalid IFSC code'),
  body('bankAccountHolderName').optional({ values: 'falsy' }).trim(),
  body('status').optional().isIn(['active', 'inactive']),
  body('notes').optional().trim(),
];

export const createRateRules = [
  ...companyIdParam,
  body('jobTypeId').isInt({ min: 1 }).withMessage('Job type is required'),
  body('vehicleType').optional({ values: 'falsy' }).trim(),
  body('rateType').isIn(rateTypes).withMessage('Invalid rate type'),
  body('rateAmount').isFloat({ min: 0 }).withMessage('Rate amount must be positive'),
  body('effectiveFrom').isISO8601().withMessage('Effective from date is required'),
  body('effectiveTo').optional({ values: 'falsy' }).isISO8601(),
];

export const updateRateRules = [
  ...rateIdParam,
  body('jobTypeId').optional().isInt({ min: 1 }),
  body('vehicleType').optional({ values: 'falsy' }).trim(),
  body('rateType').optional().isIn(rateTypes),
  body('rateAmount').optional().isFloat({ min: 0 }),
  body('effectiveFrom').optional().isISO8601(),
  body('effectiveTo').optional({ values: 'falsy' }).isISO8601(),
];
