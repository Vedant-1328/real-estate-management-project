import { body, param, query } from 'express-validator';
import { VEHICLE_DOC_TYPES } from '../models/VehicleDocument.js';

export const idParam = [param('id').isInt({ min: 1 }).toInt()];
export const docIdParam = [
  param('id').isInt({ min: 1 }).toInt(),
  param('docId').isInt({ min: 1 }).toInt(),
];

export const listVehiclesRules = [
  query('status').optional().isIn(['available', 'assigned', 'maintenance', 'inactive', 'all']),
  query('ownerType').optional().isIn(['own', 'rented', 'third_party', 'all']),
  query('search').optional().trim(),
];

const optionalField = { values: 'falsy', nullable: true };

/** Fresh chains per route — do not reuse; `.optional()` mutates the chain in place. */
const buildVehicleBodyRules = () => [
  body('vehicleNumber').trim().notEmpty().withMessage('Vehicle number is required'),
  body('vehicleType').trim().notEmpty().withMessage('Vehicle type is required'),
  body('vehicleModel').trim().notEmpty().withMessage('Model is required'),
  body('capacity').optional(optionalField).trim(),
  body('ownerType').isIn(['own', 'rented', 'third_party']),
  body('insuranceExpiry').optional(optionalField).isISO8601().withMessage('Invalid insurance expiry date'),
  body('fitnessExpiry').optional(optionalField).isISO8601().withMessage('Invalid fitness expiry date'),
  body('permitExpiry').optional(optionalField).isISO8601().withMessage('Invalid permit expiry date'),
  body('pollutionExpiry').optional(optionalField).isISO8601().withMessage('Invalid pollution expiry date'),
  body('status').isIn(['available', 'assigned', 'maintenance', 'inactive']),
  body('notes').optional(optionalField).trim(),
];

export const createVehicleRules = buildVehicleBodyRules();

export const updateVehicleRules = [
  ...idParam,
  ...buildVehicleBodyRules().map((r) => r.optional({ nullable: true })),
];

export const uploadDocRules = [
  ...idParam,
  body('docType').isIn(VEHICLE_DOC_TYPES).withMessage('Invalid document type'),
];
