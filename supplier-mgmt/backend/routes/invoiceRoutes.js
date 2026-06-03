import { Router } from 'express';
import {
  cancelInvoice,
  createInvoice,
  downloadInvoicePdf,
  getInvoice,
  getOutstanding,
  getPendingEod,
  listInvoices,
  updateInvoice,
  updateInvoiceStatus,
} from '../controllers/invoiceController.js';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { auditLog } from '../middlewares/auditLog.js';
import {
  createInvoiceRules,
  idParam,
  listInvoiceRules,
  pendingEodRules,
  updateInvoiceRules,
  updateStatusRules,
} from '../validators/invoiceValidators.js';

const router = Router();

router.use(authenticate);

router.get(
  '/pending-eod',
  checkPermission('invoices', 'view'),
  pendingEodRules,
  validate,
  getPendingEod
);
router.get(
  '/outstanding',
  checkPermission('invoices', 'view'),
  getOutstanding
);
router.get('/', checkPermission('invoices', 'view'), listInvoiceRules, validate, listInvoices);
router.post(
  '/',
  checkPermission('invoices', 'generate_invoice'),
  createInvoiceRules,
  validate,
  auditLog('invoices'),
  createInvoice
);
router.get('/:id/pdf', checkPermission('invoices', 'print'), idParam, validate, downloadInvoicePdf);
router.put(
  '/:id/status',
  checkPermission('invoices', 'edit'),
  updateStatusRules,
  validate,
  updateInvoiceStatus
);
router.put(
  '/:id',
  checkPermission('invoices', 'edit'),
  updateInvoiceRules,
  validate,
  auditLog('invoices'),
  updateInvoice
);
router.get('/:id', checkPermission('invoices', 'view'), idParam, validate, getInvoice);
router.delete('/:id', checkPermission('invoices', 'delete'), idParam, validate, auditLog('invoices'), cancelInvoice);

export default router;
