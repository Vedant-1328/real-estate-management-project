import rateLimit from 'express-rate-limit';

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Try again in 15 minutes.',
  },
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Try again in 15 minutes.',
    });
  },
});
