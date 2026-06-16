import { Router } from 'express';
import {
  createVehicleType,
  deleteVehicleType,
  listVehicleTypes,
  updateVehicleType,
} from '../controllers/vehicleTypeController.js';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import {
  createVehicleTypeRules,
  idParam,
  updateVehicleTypeRules,
} from '../validators/vehicleTypeValidators.js';

const router = Router();

router.use(authenticate);

router.get('/', checkPermission('vehicle_types', 'view'), listVehicleTypes);
router.post('/', checkPermission('vehicle_types', 'add'), createVehicleTypeRules, validate, createVehicleType);
router.put(
  '/:id',
  checkPermission('vehicle_types', 'edit'),
  updateVehicleTypeRules,
  validate,
  updateVehicleType
);
router.delete('/:id', checkPermission('vehicle_types', 'delete'), idParam, validate, deleteVehicleType);

export default router;
