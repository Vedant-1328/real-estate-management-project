import { hasPermission } from '../utils/permissions.js';

export const checkPermission = (moduleName, action) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  if (hasPermission(req.user, moduleName, action)) {
    return next();
  }

  return res.status(403).json({ success: false, message: 'Forbidden' });
};
