import { Permission, Role, RolePermission } from '../models/index.js';
import { decryptField, isEncrypted } from './fieldEncryption.js';

export const SUPER_ADMIN_ROLE = 'Super Admin';

export const plainText = (value) => {
  if (value == null || value === '') return value;
  const str = String(value);
  return isEncrypted(str) ? decryptField(str) : value;
};

export const formatPermissions = (permissions = []) =>
  permissions.map((p) => ({
    moduleName: plainText(p.moduleName),
    action: plainText(p.action),
  }));

export const loadRolePermissions = async (roleId) => {
  const role = await Role.findByPk(roleId, {
    include: [
      {
        model: Permission,
        as: 'permissions',
        attributes: ['moduleName', 'action'],
        through: { attributes: [] },
      },
    ],
  });

  if (!role) return [];

  return formatPermissions(role.permissions);
};

export const hasPermission = (user, moduleName, action) => {
  if (plainText(user.roleName) === SUPER_ADMIN_ROLE) return true;

  return (user.permissions || []).some(
    (p) => plainText(p.moduleName) === moduleName && plainText(p.action) === action
  );
};
