const trimValue = (value) => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return value.map(trimValue);
  }
  if (value && typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = trimValue(val);
    }
    return out;
  }
  return value;
};

/**
 * Trim string leaf values in-place (Express 5+ exposes `req.query` as getter-only; do not assign).
 */
function trimStringsInPlace(value) {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      value[i] = trimStringsInPlace(value[i]);
    }
    return value;
  }
  if (value && typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    for (const key of Object.keys(value)) {
      value[key] = trimStringsInPlace(value[key]);
    }
    return value;
  }
  return value;
}

/** Trim all string fields in JSON body (POST/PUT/PATCH). */
export const sanitizeBody = (req, _res, next) => {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    req.body = trimValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    try {
      trimStringsInPlace(req.query);
    } catch {
      /* query snapshot may not be mutable in some setups */
    }
  }
  next();
};
