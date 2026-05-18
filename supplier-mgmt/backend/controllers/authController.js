import bcrypt from 'bcryptjs';
import { User, Role } from '../models/index.js';
import {
  clearRefreshCookieOptions,
  REFRESH_TOKEN_COOKIE,
  refreshCookieOptions,
} from '../utils/cookies.js';
import { loadRolePermissions } from '../utils/permissions.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens.js';

const buildAuthUser = (user, role) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  roleId: user.roleId,
  roleName: role.name,
});

const issueTokens = async (user, role) => {
  const permissions = await loadRolePermissions(user.roleId);
  const payload = {
    userId: user.id,
    roleId: user.roleId,
    roleName: role.name,
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ userId: user.id });

  return { accessToken, refreshToken, permissions };
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.scope('withPassword').findOne({
    where: { email },
    include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
  });

  if (!user || user.status !== 'active') {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  await user.update({ lastLogin: new Date() });

  const { accessToken, refreshToken, permissions } = await issueTokens(user, user.role);

  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, refreshCookieOptions);

  return res.json({
    success: true,
    accessToken,
    user: buildAuthUser(user, user.role),
    permissions,
  });
};

export const refresh = async (req, res) => {
  const token = req.cookies?.[REFRESH_TOKEN_COOKIE];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const decoded = verifyRefreshToken(token);

    const user = await User.findByPk(decoded.userId, {
      include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
    });

    if (!user || user.status !== 'active') {
      res.clearCookie(REFRESH_TOKEN_COOKIE, clearRefreshCookieOptions);
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { accessToken, refreshToken, permissions } = await issueTokens(user, user.role);

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, refreshCookieOptions);

    return res.json({
      success: true,
      accessToken,
      user: buildAuthUser(user, user.role),
      permissions,
    });
  } catch {
    res.clearCookie(REFRESH_TOKEN_COOKIE, clearRefreshCookieOptions);
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};

export const logout = async (_req, res) => {
  res.clearCookie(REFRESH_TOKEN_COOKIE, clearRefreshCookieOptions);
  return res.status(200).json({ success: true, message: 'Logged out' });
};
