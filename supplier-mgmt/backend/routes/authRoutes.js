import { Router } from 'express';
import { body } from 'express-validator';
import { login, logout, refresh } from '../controllers/authController.js';
import { loginRateLimit } from '../middlewares/loginRateLimit.js';
import { validate } from '../middlewares/validate.js';

const router = Router();

router.post(
  '/login',
  loginRateLimit,
  [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail({ gmail_remove_dots: false }),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;
