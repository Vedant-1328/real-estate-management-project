import { body, param } from 'express-validator';
import { PERMISSION_ACTIONS } from '../models/Permission.js';

export const idParam = [param('id').isInt({ min: 1 }).toInt()];

export const createRoleRules = [
  body('name').trim().notEmpty(),
  body('description').optional().trim(),
];

export const updateRoleRules = [
  ...idParam,
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
];

export const replacePermissionsRules = [
  ...idParam,
  body('permissions').isArray(),
  body('permissions.*.moduleName').trim().notEmpty(),
  body('permissions.*.action').isIn(PERMISSION_ACTIONS),
  body('permissions.*.allowed').isBoolean(),
];
