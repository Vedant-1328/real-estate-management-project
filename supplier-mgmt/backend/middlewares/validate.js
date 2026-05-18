import { validationResult } from 'express-validator';

export const validate = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: result.array().map((e) => ({
        field: Array.isArray(e.path) ? e.path.join('.') : e.path,
        message: e.msg,
      })),
    });
  }
  next();
};
