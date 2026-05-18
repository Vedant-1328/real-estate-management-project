import { body, param } from 'express-validator';

export const idParam = [param('id').isInt({ min: 1 }).toInt()];

export const createExpenseTypeRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').optional().trim(),
  body('status').optional().isIn(['active', 'inactive']),
];

export const updateExpenseTypeRules = [
  ...idParam,
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('status').optional().isIn(['active', 'inactive']),
];
