import { User, Role } from '../models/index.js';
import { loadRolePermissions } from '../utils/permissions.js';
import { verifyAccessToken } from '../utils/tokens.js';

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = verifyAccessToken(token);

    const user = await User.findByPk(decoded.userId, {
      include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
    });

    if (!user || user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const permissions = await loadRolePermissions(user.roleId);

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions,
    };

    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};
