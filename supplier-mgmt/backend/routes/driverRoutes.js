import { Router } from 'express';
import { body } from 'express-validator';
import {
  createDriver,
  deleteDocument,
  deleteDriver,
  getDriver,
  listDrivers,
  quickAddOutsideDriver,
  updateDriver,
  uploadDocument,
} from '../controllers/driverController.js';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/rbac.js';
import { driverDocumentUpload } from '../middlewares/driverUpload.js';
import { validate } from '../middlewares/validate.js';
import { auditLog } from '../middlewares/auditLog.js';
import {
  createDriverRules,
  docIdParam,
  idParam,
  listDriversRules,
  quickOutsideRules,
  updateDriverRules,
} from '../validators/driverValidators.js';
import { DRIVER_DOC_TYPES } from '../models/DriverDocument.js';

const router = Router();

router.use(authenticate);

router.get('/', checkPermission('drivers', 'view'), listDriversRules, validate, listDrivers);
router.post('/', checkPermission('drivers', 'add'), createDriverRules, validate, auditLog('drivers'), createDriver);
router.post(
  '/quick-outside',
  checkPermission('drivers', 'add'),
  quickOutsideRules,
  validate,
  quickAddOutsideDriver
);
router.get('/:id', checkPermission('drivers', 'view'), idParam, validate, getDriver);
router.put('/:id', checkPermission('drivers', 'edit'), updateDriverRules, validate, auditLog('drivers'), updateDriver);
router.delete('/:id', checkPermission('drivers', 'delete'), idParam, validate, auditLog('drivers'), deleteDriver);

router.post(
  '/:id/documents',
  checkPermission('drivers', 'edit'),
  idParam,
  validate,
  driverDocumentUpload.single('file'),
  [body('docType').isIn(DRIVER_DOC_TYPES)],
  validate,
  uploadDocument
);
router.delete(
  '/:id/documents/:docId',
  checkPermission('drivers', 'delete'),
  docIdParam,
  validate,
  deleteDocument
);

export default router;
