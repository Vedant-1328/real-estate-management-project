import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { AuditLog, Role, User } from '../models/index.js';
import { hardDestroy, hardDestroyWhere } from '../utils/hardDestroy.js';
import { SUPER_ADMIN_ROLE } from '../utils/permissions.js';
import { isFieldEncryptionEnabled } from '../utils/fieldEncryption.js';

const formatUser = (user) => {
  const plain = user.get ? user.get({ plain: true }) : { ...user };
  plain.roleName = plain.role?.name;
  delete plain.password;
  return plain;
};

export const listUsers = async (req, res) => {
  const { roleId, status, search } = req.query;
  const where = {};

  if (roleId) where.roleId = roleId;
  if (status && status !== 'all') where.status = status;
  if (search) {
    const term = `%${search}%`;
    if (isFieldEncryptionEnabled()) {
      where[Op.or] = [{ name: { [Op.like]: term } }, { email: { [Op.like]: term } }];
    } else {
      where[Op.or] = [
        { name: { [Op.like]: term } },
        { email: { [Op.like]: term } },
        { mobile: { [Op.like]: term } },
      ];
    }
  }

  const users = await User.findAll({
    where,
    include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
    order: [['name', 'ASC']],
  });

  res.json({ success: true, data: users.map(formatUser) });
};

export const getUser = async (req, res) => {
  const user = await User.findByPk(req.params.id, {
    include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
  });
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  res.json({ success: true, data: formatUser(user) });
};

export const createUser = async (req, res) => {
  const role = await Role.findByPk(req.body.roleId);
  if (!role) {
    return res.status(400).json({ success: false, message: 'Invalid role' });
  }

  const existing = await User.scope('withPassword').findOne({
    where: { email: req.body.email },
  });
  if (existing) {
    return res.status(400).json({ success: false, message: 'Email already in use' });
  }

  const hash = await bcrypt.hash(req.body.password, 10);
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    mobile: req.body.mobile || null,
    password: hash,
    roleId: req.body.roleId,
    status: req.body.status || 'active',
    createdBy: req.user.id,
  });

  const full = await User.findByPk(user.id, {
    include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
  });

  res.status(201).json({ success: true, data: formatUser(full) });
};

export const updateUser = async (req, res) => {
  const user = await User.findByPk(req.params.id, {
    include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
  });
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const isSelf = user.id === req.user.id;
  if (isSelf && req.body.roleId != null && Number(req.body.roleId) !== user.roleId) {
    return res.status(400).json({
      success: false,
      message: 'You cannot change your own role',
    });
  }

  if (req.body.email && req.body.email !== user.email) {
    const dup = await User.findOne({ where: { email: req.body.email } });
    if (dup) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }
  }

  const fields = ['name', 'email', 'mobile', 'roleId', 'status'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field] === '' ? null : req.body[field];
    }
  });

  await user.save();

  const full = await User.findByPk(user.id, {
    include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
  });

  res.json({ success: true, data: formatUser(full) });
};

export const resetPassword = async (req, res) => {
  if (req.user.roleName !== SUPER_ADMIN_ROLE) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const user = await User.scope('withPassword').findByPk(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  user.password = await bcrypt.hash(req.body.password, 10);
  await user.save();

  res.json({ success: true, message: 'Password reset successfully' });
};

export const deleteUser = async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  if (user.id === req.user.id) {
    return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
  }

  await hardDestroyWhere(AuditLog, { userId: user.id });
  await hardDestroy(user);
  res.json({ success: true, message: 'User deleted' });
};
