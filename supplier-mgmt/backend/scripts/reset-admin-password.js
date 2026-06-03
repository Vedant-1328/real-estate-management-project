/**
 * Ensures admin@supplier.com exists with password Admin@123 (or custom via env).
 * Run: node scripts/reset-admin-password.js
 */
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import '../models/index.js';
import { Role, User } from '../models/index.js';
import { SUPER_ADMIN_ROLE } from '../utils/permissions.js';
import { findRoleByName } from '../utils/roleHelpers.js';

dotenv.config();

const email = process.env.ADMIN_EMAIL || 'admin@supplier.com';
const password = process.env.ADMIN_PASSWORD || 'Admin@123';

await connectDB();

let role = await findRoleByName(SUPER_ADMIN_ROLE);
if (!role) {
  role = await Role.create({
    name: SUPER_ADMIN_ROLE,
    description: 'Full system access',
  });
  console.log('Created Super Admin role');
}

const hash = await bcrypt.hash(password, 10);
let user = await User.scope('withPassword').findOne({ where: { email } });

if (user) {
  await user.update({ password: hash, status: 'active', roleId: role.id });
  console.log(`Reset password for ${email}`);
} else {
  user = await User.create({
    name: 'Super Admin',
    email,
    password: hash,
    roleId: role.id,
    status: 'active',
  });
  console.log(`Created admin user ${email}`);
}

console.log(`Login with: ${email} / ${password}`);
process.exit(0);
