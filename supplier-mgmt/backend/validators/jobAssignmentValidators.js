import { body, param, query } from 'express-validator';

export const ASSIGNMENT_STATUSES = [
  'planned',
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
  'on_hold',
];

export const idParam = [param('id').isInt({ min: 1 }).toInt()];

export const listAssignmentsRules = [
  query('date').optional().isISO8601(),
  query('companyId').optional().isInt({ min: 1 }).toInt(),
  query('driverId').optional().isInt({ min: 1 }).toInt(),
  query('vehicleId').optional().isInt({ min: 1 }).toInt(),
  query('status').optional().isIn([...ASSIGNMENT_STATUSES, 'all']),
];

export const effectiveRateRules = [
  query('companyId').isInt({ min: 1 }).toInt(),
  query('jobTypeId').isInt({ min: 1 }).toInt(),
  query('assignmentDate').isISO8601(),
  query('vehicleType').optional().trim(),
];

const buildAssignmentBodyRules = () => [
  body('assignmentDate').isISO8601(),
  body('companyId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('jobTypeId').isInt({ min: 1 }).toInt(),
  body('vehicleId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('driverId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('isOutsideDriver').optional().isBoolean().toBoolean(),
  body('outsideDriverName').optional().trim(),
  body('outsideDriverMobile').optional().trim(),
  body('outsideDriverVehicle').optional().trim(),
  body('replacedDriverId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('fromSiteId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('toSiteId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('fromSiteTemp').optional().trim(),
  body('toSiteTemp').optional().trim(),
  body('expectedTrips').isInt({ min: 1 }).toInt(),
  body('dieselFuel').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('driverCost').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('instructions').optional().trim(),
  body('status').optional().isIn(ASSIGNMENT_STATUSES),
  body('forceAssign').optional().isBoolean().toBoolean(),
];

export const createAssignmentRules = buildAssignmentBodyRules();

export const updateAssignmentRules = [
  ...idParam,
  ...buildAssignmentBodyRules().map((r) => r.optional({ nullable: true })),
];

export const updateStatusRules = [
  ...idParam,
  body('status').isIn(ASSIGNMENT_STATUSES),
];
