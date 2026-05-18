import { Router } from 'express';
import {
  createPayment,
  getPayableInvoices,
  listPayments,
} from '../controllers/paymentController.js';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { createPaymentRules } from '../validators/invoiceValidators.js';
import { listPaymentsRules } from '../validators/paymentValidators.js';

const router = Router();

router.use(authenticate);

router.get('/', checkPermission('payments', 'view'), listPaymentsRules, validate, listPayments);
router.get(
  '/payable-invoices',
  checkPermission('payments', 'view'),
  getPayableInvoices
);
router.post('/', checkPermission('payments', 'add'), createPaymentRules, validate, createPayment);

export default router;
