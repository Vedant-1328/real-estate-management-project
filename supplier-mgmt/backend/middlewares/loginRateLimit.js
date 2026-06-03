import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isDev && req.headers['x-test-suite'] === '1',
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
