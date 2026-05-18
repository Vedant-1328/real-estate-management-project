import axios from 'axios';
import { clearServerErrors, mapApiValidationErrors, setServerErrors } from '../utils/serverErrors.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let getAccessToken = () => null;
let setAccessToken = () => {};
let onUnauthorized = () => {};
let onForbidden = () => {};
let onRateLimit = () => {};
let onServerError = () => {};

let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
};

export const setupAxiosAuth = ({
  getToken,
  setToken,
  onAuthFailure,
  onForbidden: on403,
  onRateLimit: on429,
  onServerError: on500,
}) => {
  getAccessToken = getToken;
  setAccessToken = setToken;
  onUnauthorized = onAuthFailure;
  if (on403) onForbidden = on403;
  if (on429) onRateLimit = on429;
  if (on500) onServerError = on500;
};

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const handleNonAuthErrors = (error) => {
  const status = error.response?.status;
  const data = error.response?.data;

  if (!error.response) {
    onServerError(
      'Cannot reach the API server. Start the backend (port 3000), or run both apps from supplier-mgmt: npm run dev'
    );
    return;
  }

  if (status === 403) {
    onForbidden(data?.message || "You don't have permission to do this");
    return;
  }

  if (status === 422 && Array.isArray(data?.errors)) {
    setServerErrors(mapApiValidationErrors(data.errors));
    return;
  }

  if (status === 429) {
    onRateLimit(data?.message || 'Too many attempts. Please wait and try again.');
    return;
  }

  if (status >= 500) {
    onServerError(data?.message || 'Something went wrong. Please try again.');
  }
};

api.interceptors.response.use(
  (response) => {
    clearServerErrors();
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status !== 401) {
      handleNonAuthErrors(error);
      return Promise.reject(error);
    }

    const isAuthRoute =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/logout');

    if (!originalRequest || isAuthRoute || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await api.post('/auth/refresh');
      const newToken = data.accessToken;
      setAccessToken(newToken);
      processQueue(null, newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      onUnauthorized();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
