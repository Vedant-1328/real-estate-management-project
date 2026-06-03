import { Router } from 'express';
import {
  createPartyPayment,
  createPayment,
  getPayableInvoices,
  listPayments,
  lookupPartyBalance,
} from '../controllers/paymentController.js';
import { authenticate } from '../middlewares/auth.js';
import { checkPermission } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { createPaymentRules } from '../validators/invoiceValidators.js';
import {
  createPartyPaymentRules,
  listPaymentsRules,
  lookupPartyBalanceRules,
} from '../validators/paymentValidators.js';

const router = Router();

router.use(authenticate);

router.get('/', checkPermission('payments', 'view'), listPaymentsRules, validate, listPayments);
router.get(
  '/payable-invoices',
  checkPermission('payments', 'view'),
  getPayableInvoices
);
router.post('/', checkPermission('payments', 'add'), createPaymentRules, validate, createPayment);
router.get(
  '/lookup-party',
  checkPermission('payments', 'view'),
  lookupPartyBalanceRules,
  validate,
  lookupPartyBalance
);
router.post(
  '/by-party',
  checkPermission('payments', 'add'),
  createPartyPaymentRules,
  validate,
  createPartyPayment
);

export default router;
