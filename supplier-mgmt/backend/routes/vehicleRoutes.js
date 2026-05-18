import { Router } from 'express';
import { body } from 'express-validator';
import {
  createVehicle,
  deleteDocument,
  deleteVehicle,
  getVehicle,
  listVehicles,
  updateVehicle,
  uploadDocument,
} from '../controllers/vehicleController.js';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { auditLog } from '../middlewares/auditLog.js';
import { vehicleDocumentUpload } from '../middlewares/vehicleUpload.js';
import {
  createVehicleRules,
  docIdParam,
  idParam,
  listVehiclesRules,
  updateVehicleRules,
} from '../validators/vehicleValidators.js';

const router = Router();

router.use(authenticate);

router.get('/', checkPermission('vehicles', 'view'), listVehiclesRules, validate, listVehicles);
router.post('/', checkPermission('vehicles', 'add'), createVehicleRules, validate, auditLog('vehicles'), createVehicle);
router.get('/:id', checkPermission('vehicles', 'view'), idParam, validate, getVehicle);
router.put('/:id', checkPermission('vehicles', 'edit'), updateVehicleRules, validate, auditLog('vehicles'), updateVehicle);
router.delete('/:id', checkPermission('vehicles', 'delete'), idParam, validate, auditLog('vehicles'), deleteVehicle);

router.post(
  '/:id/documents',
  checkPermission('vehicles', 'edit'),
  idParam,
  validate,
  vehicleDocumentUpload.single('file'),
  [body('docType').isIn(['rc_book', 'insurance', 'permit', 'fitness_certificate', 'pollution_certificate', 'other'])],
  validate,
  uploadDocument
);
router.delete(
  '/:id/documents/:docId',
  checkPermission('vehicles', 'delete'),
  docIdParam,
  validate,
  deleteDocument
);

export default router;
