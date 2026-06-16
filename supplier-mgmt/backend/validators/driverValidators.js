import { body, param, query } from 'express-validator';
import { DRIVER_DOC_TYPES } from '../models/DriverDocument.js';

export const idParam = [param('id').isInt({ min: 1 }).toInt()];
export const docIdParam = [
  param('id').isInt({ min: 1 }).toInt(),
  param('docId').isInt({ min: 1 }).toInt(),
];

export const listDriversRules = [
  query('status').optional().isIn(['available', 'assigned', 'inactive', 'all']),
  query('driverType').optional().isIn(['own', 'outside', 'all']),
  query('search').optional().trim(),
];

export const createDriverRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('mobile').trim().notEmpty().withMessage('Mobile is required'),
  body('address').optional().trim(),
  body('licenseNumber').optional({ values: 'falsy' }).trim(),
  body('licenseExpiry').optional({ values: 'falsy' }).isISO8601(),
  body('driverType').isIn(['own', 'outside']),
  body('defaultVehicleId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('status').optional().isIn(['available', 'assigned', 'inactive']),
  body('notes').optional().trim(),
  body('grossSalary').optional().isFloat({ min: 0 }),
];

export const updateDriverRules = [
  ...idParam,
  body('name').optional().trim().notEmpty(),
  body('mobile').optional().trim().notEmpty(),
  body('address').optional().trim(),
  body('licenseNumber').optional({ values: 'falsy' }).trim(),
  body('licenseExpiry').optional().isISO8601(),
  body('driverType').optional().isIn(['own', 'outside']),
  body('defaultVehicleId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('status').optional().isIn(['available', 'assigned', 'inactive']),
  body('notes').optional().trim(),
  body('grossSalary').optional().isFloat({ min: 0 }),
];

export const quickOutsideRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('mobile').optional({ values: 'falsy' }).trim(),
  body('vehicleNumber').optional().trim(),
  body('notes').optional().trim(),
];
