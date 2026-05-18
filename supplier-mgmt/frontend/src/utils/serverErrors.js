let fieldErrors = {};
const listeners = new Set();

export const setServerErrors = (errors = {}) => {
  fieldErrors = { ...errors };
  listeners.forEach((fn) => fn(fieldErrors));
};

export const clearServerErrors = () => setServerErrors({});

export const getServerError = (field) => fieldErrors[field];

export const subscribeServerErrors = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Map API 422 errors array to { field: message } */
export const mapApiValidationErrors = (errors = []) => {
  const map = {};
  errors.forEach((e) => {
    const key = e.field || e.param;
    if (key) map[key] = e.message;
  });
  return map;
};
