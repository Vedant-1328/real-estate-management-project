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

const vehicleBodyRules = [
  body('vehicleNumber').trim().notEmpty().withMessage('Vehicle number is required'),
  body('vehicleType').trim().notEmpty().withMessage('Vehicle type is required'),
  body('vehicleModel').trim().notEmpty().withMessage('Model is required'),
  body('capacity').optional().trim(),
  body('ownerType').isIn(['own', 'rented', 'third_party']),
  body('insuranceExpiry').optional({ values: 'falsy' }).isISO8601(),
  body('fitnessExpiry').optional({ values: 'falsy' }).isISO8601(),
  body('permitExpiry').optional({ values: 'falsy' }).isISO8601(),
  body('pollutionExpiry').optional({ values: 'falsy' }).isISO8601(),
  body('status').isIn(['available', 'assigned', 'maintenance', 'inactive']),
  body('notes').optional().trim(),
];

export const createVehicleRules = vehicleBodyRules;

export const updateVehicleRules = [...idParam, ...vehicleBodyRules.map((r) => r.optional())];

export const uploadDocRules = [
  ...idParam,
  body('docType').isIn(VEHICLE_DOC_TYPES).withMessage('Invalid document type'),
];
