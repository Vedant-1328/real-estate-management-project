import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import './models/index.js';
import { sequelize } from './models/index.js';
import { seedIfEmpty } from './seeders/index.js';
import { seedRolePermissionsAndUsers } from './seeders/rolePermissions.js';

dotenv.config();

const run = async () => {
  try {
    await connectDB();
    await sequelize.sync({ alter: true });
    console.log('Database synced');
    await seedIfEmpty();
    await seedRolePermissionsAndUsers();
    process.exit(0);
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  }
};

run();
