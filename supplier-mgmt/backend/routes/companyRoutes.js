import { Router } from 'express';
import {
  createCompany,
  createRate,
  deleteCompany,
  deleteRate,
  getCompany,
  listCompanies,
  listRates,
  updateCompany,
  updateRate,
} from '../controllers/companyController.js';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { auditLog } from '../middlewares/auditLog.js';
import {
  companyIdParam,
  createCompanyRules,
  createRateRules,
  listCompaniesRules,
  rateIdParam,
  updateCompanyRules,
  updateRateRules,
} from '../validators/companyValidators.js';

const router = Router();

router.use(authenticate);

router.get('/', checkPermission('companies', 'view'), listCompaniesRules, validate, listCompanies);
router.post('/', checkPermission('companies', 'add'), createCompanyRules, validate, auditLog('companies'), createCompany);
router.get('/:id', checkPermission('companies', 'view'), companyIdParam, validate, getCompany);
router.put('/:id', checkPermission('companies', 'edit'), updateCompanyRules, validate, auditLog('companies'), updateCompany);
router.delete('/:id', checkPermission('companies', 'delete'), companyIdParam, validate, auditLog('companies'), deleteCompany);

router.get('/:id/rates', checkPermission('companies', 'view'), companyIdParam, validate, listRates);
router.post('/:id/rates', checkPermission('companies', 'edit'), createRateRules, validate, createRate);
router.put(
  '/:id/rates/:rateId',
  checkPermission('companies', 'edit'),
  updateRateRules,
  validate,
  updateRate
);
router.delete(
  '/:id/rates/:rateId',
  checkPermission('companies', 'delete'),
  rateIdParam,
  validate,
  deleteRate
);

export default router;
