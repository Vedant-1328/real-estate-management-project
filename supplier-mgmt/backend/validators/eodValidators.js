import { body, param, query } from 'express-validator';

export const idParam = [param('id').isInt({ min: 1 }).toInt()];

export const listEodRules = [
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('companyId').optional().isInt({ min: 1 }).toInt(),
  query('driverId').optional().isInt({ min: 1 }).toInt(),
  query('vehicleId').optional().isInt({ min: 1 }).toInt(),
  query('billingStatus').optional().isIn(['pending', 'invoiced', 'all']),
];

// Standalone EOD creation: client may omit `assignmentId` and instead supply
// the full job context (date / company / vehicle / driver / sites / trips ...).
// In that case the controller auto-creates a hidden JobAssignment stub before
// persisting the EOD record.
export const createEodRules = [
  body('assignmentId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),

  body('date').optional({ values: 'falsy' }).isISO8601(),
  body('companyId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('jobTypeId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('vehicleId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('driverId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('isOutsideDriver').optional().isBoolean().toBoolean(),
  body('outsideDriverName').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  body('outsideDriverMobile')
    .if((_, { req }) => Boolean(req.body.isOutsideDriver))
    .notEmpty()
    .withMessage('Mobile is required')
    .trim()
    .isLength({ max: 20 }),
  body('outsideDriverVehicle').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('vehicleId')
    .if((_, { req }) => Boolean(req.body.isOutsideDriver))
    .notEmpty()
    .withMessage('Fleet vehicle is required')
    .isInt({ min: 1 })
    .toInt(),
  body('replacedDriverId')
    .if((_, { req }) => Boolean(req.body.isOutsideDriver))
    .notEmpty()
    .withMessage('On replacement of is required')
    .isInt({ min: 1 })
    .toInt(),
  body('driverCost')
    .if((_, { req }) => Boolean(req.body.isOutsideDriver))
    .notEmpty()
    .withMessage('Driver pay per day is required')
    .isFloat({ min: 0.01 }),
  body('ratePerTrip').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('fromSiteId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('toSiteId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('fromSiteTemp').optional({ values: 'falsy' }).trim().isLength({ max: 255 }),
  body('toSiteTemp').optional({ values: 'falsy' }).trim().isLength({ max: 255 }),
  body('plannedTrips').optional({ values: 'falsy' }).isInt({ min: 0 }).toInt(),

  body('actualTrips').isInt({ min: 0 }).toInt(),
  body('extraCharges').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('deductions').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('dieselFuel').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('expense').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('expenseTypeId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('remarks').optional().trim(),
  body('startTime').optional().trim(),
  body('endTime').optional().trim(),
  body('approved').optional().isBoolean().toBoolean(),
];

export const updateEodRules = [
  ...idParam,
  body('actualTrips').optional().isInt({ min: 0 }).toInt(),
  body('extraCharges').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('deductions').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('dieselFuel').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('expense').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('expenseTypeId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('ratePerTrip').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('remarks').optional().trim(),
  body('startTime').optional().trim(),
  body('endTime').optional().trim(),
  body('approved').optional().isBoolean().toBoolean(),
  body('vehicleId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('outsideDriverMobile').optional({ values: 'falsy' }).trim().isLength({ min: 1, max: 20 }),
  body('replacedDriverId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('driverCost').optional({ values: 'falsy' }).isFloat({ min: 0.01 }),
  body('ratePerTrip').optional({ values: 'falsy' }).isFloat({ min: 0 }),
];
