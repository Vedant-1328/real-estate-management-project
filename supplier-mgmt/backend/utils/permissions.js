import { Permission, Role, RolePermission } from '../models/index.js';

export const SUPER_ADMIN_ROLE = 'Super Admin';

export const formatPermissions = (permissions = []) =>
  permissions.map((p) => ({
    moduleName: p.moduleName,
    action: p.action,
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
  if (user.roleName === SUPER_ADMIN_ROLE) return true;

  return (user.permissions || []).some(
    (p) => p.moduleName === moduleName && p.action === action
  );
};
