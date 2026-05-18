import AuditLog from '../models/AuditLog.js';

const METHOD_ACTION = {
  POST: 'created',
  PUT: 'updated',
  PATCH: 'updated',
  DELETE: 'deleted',
};

const extractRecordId = (req, body) => {
  if (req.params?.id) return Number(req.params.id) || null;
  const data = body?.data;
  if (data?.id) return data.id;
  return null;
};

/**
 * Log successful mutations after response is sent.
 * @param {string} moduleName - audit module key (e.g. companies)
 */
export const auditLog = (moduleName) => (req, res, next) => {
  const action = METHOD_ACTION[req.method];
  if (!action || !req.user?.id) {
    return next();
  }

  const originalJson = res.json.bind(res);
  res.json = function auditJson(body) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const recordId = extractRecordId(req, body);
      AuditLog.create({
        userId: req.user.id,
        module: moduleName,
        action,
        recordId,
        timestamp: new Date(),
      }).catch((err) => console.error('Audit log failed:', err.message));
    }
    return originalJson(body);
  };

  next();
};
