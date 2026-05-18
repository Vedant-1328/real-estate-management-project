import { body, param, query } from 'express-validator';

export const idParam = [param('id').isInt({ min: 1 }).toInt()];

export const listSitesRules = [
  query('companyId').optional().isInt({ min: 1 }).toInt(),
  query('siteType').optional().isIn(['pickup', 'delivery', 'both', 'site_by_site', 'all']),
  query('status').optional().isIn(['active', 'inactive', 'all']),
  query('search').optional().trim(),
];

export const createSiteRules = [
  body('siteName').trim().notEmpty().withMessage('Site name is required'),
  body('companyId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('contactPerson').optional().trim(),
  body('mobile').optional().trim(),
  body('siteType').optional().isIn(['pickup', 'delivery', 'both', 'site_by_site']),
  body('status').optional().isIn(['active', 'inactive']),
  body('notes').optional().trim(),
];

export const updateSiteRules = [
  ...idParam,
  body('siteName').optional().trim().notEmpty(),
  body('companyId').optional().isInt({ min: 1 }),
  body('address').optional().trim().notEmpty(),
  body('city').optional().trim().notEmpty(),
  body('contactPerson').optional().trim(),
  body('mobile').optional().trim(),
  body('siteType').optional().isIn(['pickup', 'delivery', 'both', 'site_by_site']),
  body('status').optional().isIn(['active', 'inactive']),
  body('notes').optional().trim(),
];

export const convertTempRules = [
  param('id').isInt({ min: 1 }).toInt(),
  body('companyId').isInt({ min: 1 }).withMessage('Company is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('siteName').optional().trim(),
  body('address').optional().trim(),
  body('contactPerson').optional().trim(),
  body('mobile').optional().trim(),
  body('siteType').optional().isIn(['pickup', 'delivery', 'both', 'site_by_site']),
  body('status').optional().isIn(['active', 'inactive']),
  body('notes').optional().trim(),
];
