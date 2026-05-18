import { Router } from 'express';
import {
  convertTemporarySite,
  createSite,
  deleteSite,
  listSites,
  listTemporarySites,
  updateSite,
} from '../controllers/siteController.js';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import {
  convertTempRules,
  createSiteRules,
  idParam,
  listSitesRules,
  updateSiteRules,
} from '../validators/siteValidators.js';

const router = Router();

router.use(authenticate);

router.get('/temporary', checkPermission('sites', 'view'), listTemporarySites);
router.put(
  '/temporary/:id/convert',
  checkPermission('sites', 'edit'),
  convertTempRules,
  validate,
  convertTemporarySite
);

router.get('/', checkPermission('sites', 'view'), listSitesRules, validate, listSites);
router.post('/', checkPermission('sites', 'add'), createSiteRules, validate, createSite);
router.put('/:id', checkPermission('sites', 'edit'), updateSiteRules, validate, updateSite);
router.delete('/:id', checkPermission('sites', 'delete'), idParam, validate, deleteSite);

export default router;
