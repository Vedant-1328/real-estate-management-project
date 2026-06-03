import { hardDestroyWhere } from '../utils/hardDestroy.js';
import { Permission, Role, RolePermission } from '../models/index.js';
import { SUPER_ADMIN_ROLE } from '../utils/permissions.js';
import { roleNameExists } from '../utils/roleHelpers.js';

export const PERMISSION_GRID_MODULES = [
  'companies',
  'job_types',
  'vehicles',
  'drivers',
  'employees',
  'sites',
  'expense_types',
  'job_assignments',
  'eod_entries',
  'daily_expenses',
  'invoices',
  'payments',
  'driver_advances',
  'employee_advances',
  'reports',
  'users',
  'roles',
];

export const GRID_ACTIONS = [
  'view',
  'add',
  'edit',
  'delete',
  'approve',
  'export',
  'print',
  'generate_invoice',
];

const formatRole = (role, permissionCount) => {
  const plain = role.get ? role.get({ plain: true }) : { ...role };
  plain.permissionCount = permissionCount ?? plain.permissionCount ?? 0;
  return plain;
};

export const listRoles = async (req, res) => {
  const roles = (await Role.findAll()).sort((a, b) => a.name.localeCompare(b.name));
  const counts = await RolePermission.findAll({
    attributes: [
      'roleId',
      [Role.sequelize.fn('COUNT', Role.sequelize.col('id')), 'permissionCount'],
    ],
    group: ['role_id'],
    raw: true,
  });
  const countMap = Object.fromEntries(
    counts.map((c) => [c.roleId, Number(c.permissionCount)])
  );

  res.json({
    success: true,
    data: roles.map((r) => formatRole(r, countMap[r.id] || 0)),
  });
};

export const createRole = async (req, res) => {
  if (await roleNameExists(req.body.name)) {
    return res.status(400).json({ success: false, message: 'Role name already exists' });
  }

  const role = await Role.create({
    name: req.body.name,
    description: req.body.description || null,
  });

  res.status(201).json({ success: true, data: formatRole(role, 0) });
};

export const updateRole = async (req, res) => {
  const role = await Role.findByPk(req.params.id);
  if (!role) {
    return res.status(404).json({ success: false, message: 'Role not found' });
  }
  if (role.name === SUPER_ADMIN_ROLE) {
    return res.status(400).json({ success: false, message: 'Cannot modify Super Admin role' });
  }

  if (req.body.name && req.body.name !== role.name) {
    if (await roleNameExists(req.body.name, role.id)) {
      return res.status(400).json({ success: false, message: 'Role name already exists' });
    }
    role.name = req.body.name;
  }
  if (req.body.description !== undefined) {
    role.description = req.body.description || null;
  }

  await role.save();

  const count = await RolePermission.count({ where: { roleId: role.id } });
  res.json({ success: true, data: formatRole(role, count) });
};

export const getRolePermissions = async (req, res) => {
  const role = await Role.findByPk(req.params.id);
  if (!role) {
    return res.status(404).json({ success: false, message: 'Role not found' });
  }

  const isSuperAdmin = role.name === SUPER_ADMIN_ROLE;

  const allPermissions = (await Permission.findAll())
    .filter(
      (p) => PERMISSION_GRID_MODULES.includes(p.moduleName) && GRID_ACTIONS.includes(p.action)
    )
    .sort(
      (a, b) =>
        a.moduleName.localeCompare(b.moduleName) || a.action.localeCompare(b.action)
    );

  let allowedSet = new Set();
  if (isSuperAdmin) {
    allPermissions.forEach((p) => allowedSet.add(`${p.moduleName}:${p.action}`));
  } else {
    const roleWithPerms = await Role.findByPk(role.id, {
      include: [
        {
          model: Permission,
          as: 'permissions',
          attributes: ['moduleName', 'action'],
          through: { attributes: [] },
        },
      ],
    });
    (roleWithPerms?.permissions || []).forEach((p) => {
      allowedSet.add(`${p.moduleName}:${p.action}`);
    });
  }

  const grid = {};
  PERMISSION_GRID_MODULES.forEach((moduleName) => {
    grid[moduleName] = {};
    GRID_ACTIONS.forEach((action) => {
      grid[moduleName][action] = allowedSet.has(`${moduleName}:${action}`);
    });
  });

  res.json({
    success: true,
    data: {
      role: { id: role.id, name: role.name, description: role.description },
      modules: PERMISSION_GRID_MODULES,
      actions: GRID_ACTIONS,
      grid,
      readOnly: isSuperAdmin,
    },
  });
};

export const replaceRolePermissions = async (req, res) => {
  const role = await Role.findByPk(req.params.id);
  if (!role) {
    return res.status(404).json({ success: false, message: 'Role not found' });
  }
  if (role.name === SUPER_ADMIN_ROLE) {
    return res.status(400).json({
      success: false,
      message: 'Cannot modify Super Admin permissions',
    });
  }

  const allowedItems = (req.body.permissions || []).filter((p) => p.allowed);

  const allowedKeys = new Set(
    allowedItems.map((p) => `${p.moduleName}:${p.action}`)
  );
  const permissionRecords = (await Permission.findAll()).filter((p) =>
    allowedKeys.has(`${p.moduleName}:${p.action}`)
  );

  const permMap = new Map(
    permissionRecords.map((p) => [`${p.moduleName}:${p.action}`, p.id])
  );

  await hardDestroyWhere(RolePermission, { roleId: role.id });

  const rows = [];
  for (const item of allowedItems) {
    const pid = permMap.get(`${item.moduleName}:${item.action}`);
    if (pid) rows.push({ roleId: role.id, permissionId: pid });
  }

  if (rows.length > 0) {
    await RolePermission.bulkCreate(rows);
  }

  res.json({
    success: true,
    message: `Saved ${rows.length} permission(s)`,
    data: { permissionCount: rows.length },
  });
};
