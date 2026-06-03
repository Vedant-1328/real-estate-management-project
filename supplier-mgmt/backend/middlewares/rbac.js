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

/**
 * Allows the request through when the caller has ANY of the supplied
 * (module, action) permissions. Used for endpoints that are shared between
 * two features (e.g. the rate-card lookup that powers both EOD entry and
 * Outside Driver Jobs).
 */
export const checkAnyPermission = (pairs) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const allowed = pairs.some(([m, a]) => hasPermission(req.user, m, a));
  if (allowed) return next();

  return res.status(403).json({ success: false, message: 'Forbidden' });
};
