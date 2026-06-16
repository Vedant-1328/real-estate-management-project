import { body, param } from 'express-validator';

export const idParam = [param('id').isInt({ min: 1 }).toInt()];

export const createVehicleTypeRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').optional().trim(),
  body('billingUnit').optional().isIn(['trip', 'hour', 'both']),
  body('showsCapacity').optional().isBoolean().toBoolean(),
  body('status').optional().isIn(['active', 'inactive']),
];

export const updateVehicleTypeRules = [
  ...idParam,
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('billingUnit').optional().isIn(['trip', 'hour', 'both']),
  body('showsCapacity').optional().isBoolean().toBoolean(),
  body('status').optional().isIn(['active', 'inactive']),
];
