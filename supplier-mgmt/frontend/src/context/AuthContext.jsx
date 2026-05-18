import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { loginRequest, logoutRequest, refreshSession, setupAxiosAuth } from '../api/index.js';
import { useToast } from './ToastContext.jsx';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const accessTokenRef = useRef(null);

  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  const clearSession = useCallback(() => {
    accessTokenRef.current = null;
    setAccessToken(null);
    setUser(null);
    setPermissions([]);
  }, []);

  const applySession = useCallback((data) => {
    accessTokenRef.current = data.accessToken;
    setAccessToken(data.accessToken);
    setUser(data.user);
    setPermissions(data.permissions || []);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // clear local session even if request fails
    } finally {
      clearSession();
      navigate('/login', { replace: true });
    }
  }, [clearSession, navigate]);

  useEffect(() => {
    setupAxiosAuth({
      getToken: () => accessTokenRef.current,
      setToken: (token) => {
        accessTokenRef.current = token;
        setAccessToken(token);
      },
      onAuthFailure: () => {
        clearSession();
        navigate('/login', { replace: true });
      },
      onForbidden: (msg) => toast.error(msg),
      onRateLimit: (msg) => toast.error(msg),
      onServerError: (msg) => toast.error(msg),
    });
  }, [clearSession, navigate, toast]);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { data } = await refreshSession();
        applySession(data);
      } catch {
        clearSession();
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, [applySession, clearSession]);

  const login = useCallback(
    async (email, password) => {
      const { data } = await loginRequest(email, password);
      applySession(data);
      return data;
    },
    [applySession]
  );

  const hasPermission = useCallback(
    (moduleName, action) => {
      if (user?.roleName === 'Super Admin') return true;
      return permissions.some(
        (p) => p.moduleName === moduleName && p.action === action
      );
    },
    [permissions, user]
  );

  const value = useMemo(
    () => ({
      user,
      accessToken,
      permissions,
      isLoading,
      isAuthenticated: Boolean(accessToken && user),
      login,
      logout,
      hasPermission,
    }),
    [user, accessToken, permissions, isLoading, login, logout, hasPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
