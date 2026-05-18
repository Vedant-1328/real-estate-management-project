import { Router } from 'express';
import {
  companyBillingReport,
  dailyJobReport,
  driverReport,
  expenseReport,
  profitReport,
  salaryReport,
  vehicleReport,
} from '../controllers/reportController.js';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import {
  companyBillingReportRules,
  dailyJobReportRules,
  driverReportRules,
  expenseReportRules,
  profitReportRules,
  salaryReportRules,
  vehicleReportRules,
} from '../validators/reportValidators.js';

const router = Router();

router.use(authenticate);

router.get(
  '/daily-job-report',
  checkPermission('reports', 'view'),
  dailyJobReportRules,
  validate,
  dailyJobReport
);
router.get(
  '/vehicle-report',
  checkPermission('reports', 'view'),
  vehicleReportRules,
  validate,
  vehicleReport
);
router.get(
  '/driver-report',
  checkPermission('reports', 'view'),
  driverReportRules,
  validate,
  driverReport
);
router.get(
  '/company-billing-report',
  checkPermission('reports', 'view'),
  companyBillingReportRules,
  validate,
  companyBillingReport
);
router.get(
  '/expense-report',
  checkPermission('reports', 'view'),
  expenseReportRules,
  validate,
  expenseReport
);
router.get(
  '/profit-report',
  checkPermission('reports', 'view'),
  profitReportRules,
  validate,
  profitReport
);
router.get(
  '/salary-report',
  checkPermission('reports', 'view'),
  salaryReportRules,
  validate,
  salaryReport
);

export default router;
