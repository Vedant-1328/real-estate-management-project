import { body, param } from 'express-validator';

export const idParam = [param('id').isInt({ min: 1 }).toInt()];

export const createJobTypeRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').optional().trim(),
  body('defaultUnit').optional().isIn(['trip', 'hour', 'day', 'fixed']),
  body('status').optional().isIn(['active', 'inactive']),
];

export const updateJobTypeRules = [
  ...idParam,
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('defaultUnit').optional().isIn(['trip', 'hour', 'day', 'fixed']),
  body('status').optional().isIn(['active', 'inactive']),
];
