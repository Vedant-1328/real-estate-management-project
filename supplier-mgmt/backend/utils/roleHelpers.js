import { Role } from '../models/index.js';

/** Find role by name after decryption (cannot query encrypted name in SQL). */
export const findRoleByName = async (name) => {
  const roles = await Role.findAll();
  return roles.find((r) => r.name === name) || null;
};

export const roleNameExists = async (name, excludeId = null) => {
  const roles = await Role.findAll();
  return roles.some((r) => r.name === name && r.id !== excludeId);
};
