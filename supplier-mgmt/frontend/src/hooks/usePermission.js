import { useAuth } from './useAuth.js';

export function usePermission(moduleName, action) {
  const { hasPermission } = useAuth();
  return hasPermission(moduleName, action);
}
