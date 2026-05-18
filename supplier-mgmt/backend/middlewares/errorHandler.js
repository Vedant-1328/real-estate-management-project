import {
  ValidationError,
  UniqueConstraintError,
  ForeignKeyConstraintError,
} from 'sequelize';
import jwt from 'jsonwebtoken';

const isDev = process.env.NODE_ENV !== 'production';

const errorHandler = (err, _req, res, _next) => {
  if (res.headersSent) {
    return;
  }

  if (err.status === 403 || err.statusCode === 403) {
    return res.status(403).json({
      success: false,
      message: err.message || 'Forbidden',
    });
  }

  if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) {
    return res.status(401).json({
      success: false,
      message: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
    });
  }

  if (err instanceof ValidationError) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors.map((e) => ({
        field: e.path || e.validatorKey,
        message: e.message,
      })),
    });
  }

  if (err instanceof UniqueConstraintError) {
    const field = err.errors?.[0]?.path || 'field';
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists`,
    });
  }

  if (err instanceof ForeignKeyConstraintError) {
    return res.status(400).json({
      success: false,
      message: 'Related record not found or cannot be removed',
    });
  }

  const status = err.status || err.statusCode || 500;
  console.error(err);

  return res.status(status).json({
    success: false,
    message: isDev ? err.message || 'Internal Server Error' : 'Something went wrong. Please try again.',
    ...(isDev && { stack: err.stack }),
  });
};

export default errorHandler;
