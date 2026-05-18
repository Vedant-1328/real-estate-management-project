import { body, param, query } from 'express-validator';

export const idParam = [param('id').isInt({ min: 1 }).toInt()];

export const listUsersRules = [
  query('roleId').optional().isInt({ min: 1 }).toInt(),
  query('status').optional().isIn(['active', 'inactive', 'all']),
  query('search').optional().trim(),
];

export const createUserRules = [
  body('name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('mobile').optional().trim(),
  body('password').isLength({ min: 6 }),
  body('roleId').isInt({ min: 1 }).toInt(),
  body('status').optional().isIn(['active', 'inactive']),
];

export const updateUserRules = [
  ...idParam,
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('mobile').optional().trim(),
  body('roleId').optional().isInt({ min: 1 }).toInt(),
  body('status').optional().isIn(['active', 'inactive']),
];

export const resetPasswordRules = [
  ...idParam,
  body('password').isLength({ min: 6 }),
];
