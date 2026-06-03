/**
 * Seed minimum master data for demos and E2E tests.
 * Run: node scripts/seed-demo-data.js
 */
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import {
  Company,
  Driver,
  JobType,
  Site,
  Vehicle,
} from '../models/index.js';

dotenv.config();

const ensureOwnCompany = async () => {
  let row = await Company.findOne({ where: { companyType: 'own', status: 'active' } });
  if (row) return row;
  return Company.create({
    companyName: 'SHREE SAI EARTH MOVERS',
    companyType: 'own',
    contactPerson: 'Admin',
    mobile: '9876543210',
    email: 'accounts@shreesai.com',
    billingAddress: 'Pune, Maharashtra',
    gstNumber: '27AABCS1429B1Z5',
    bankAccountNumber: '123456789012',
    bankIfscCode: 'SBIN0001234',
    bankAccountHolderName: 'SHREE SAI EARTH MOVERS',
    status: 'active',
  });
};

const ensureCustomerCompany = async () => {
  let row = await Company.findOne({ where: { companyType: 'customer', status: 'active' } });
  if (row) return row;
  return Company.create({
    companyName: 'ABC Builders Pvt Ltd',
    companyType: 'customer',
    contactPerson: 'Mr. Sharma',
    mobile: '9123456780',
    billingAddress: 'Baner, Pune',
    gstNumber: '27AABCU9603R1ZM',
    paymentTerms: 'Net 30',
    status: 'active',
  });
};

const ensureVehicle = async () => {
  let row = await Vehicle.findOne({ where: { status: 'available' } });
  if (row) return row;
  return Vehicle.create({
    vehicleNumber: 'MH12AB1234',
    vehicleType: 'Tipper',
    vehicleModel: 'Tata 3118',
    capacity: '16 Ton',
    ownerType: 'own',
    status: 'available',
  });
};

const ensureDrivers = async () => {
  const existing = await Driver.findAll({
    where: { status: 'available' },
    limit: 2,
  });
  if (existing.length >= 2) return existing;

  const created = [...existing];
  if (created.length < 1) {
    created.push(
      await Driver.create({
        name: 'Ramesh Patil',
        mobile: '9000000001',
        driverType: 'own',
        licenseNumber: 'MH1220200001',
        status: 'available',
      })
    );
  }
  if (created.length < 2) {
    created.push(
      await Driver.create({
        name: 'Suresh Jadhav',
        mobile: '9000000002',
        driverType: 'own',
        licenseNumber: 'MH1220200002',
        status: 'available',
      })
    );
  }
  return created;
};

const ensureSites = async (customerId) => {
  const existing = await Site.findAll({ where: { companyId: customerId }, limit: 2 });
  if (existing.length >= 2) return existing;

  const created = [...existing];
  if (created.length < 1) {
    created.push(
      await Site.create({
        siteName: 'Hinjawadi Phase 1',
        companyId: customerId,
        address: 'Hinjawadi, Pune',
        city: 'Pune',
        siteType: 'pickup',
        status: 'active',
      })
    );
  }
  if (created.length < 2) {
    created.push(
      await Site.create({
        siteName: 'Wakad Delivery Yard',
        companyId: customerId,
        address: 'Wakad, Pune',
        city: 'Pune',
        siteType: 'delivery',
        status: 'active',
      })
    );
  }
  return created;
};

try {
  await connectDB();
  const jobTypeCount = await JobType.count();
  if (jobTypeCount === 0) {
    console.log('No job types — run npm run db:sync first');
    process.exit(1);
  }

  const own = await ensureOwnCompany();
  const customer = await ensureCustomerCompany();
  const vehicle = await ensureVehicle();
  const drivers = await ensureDrivers();
  const sites = await ensureSites(customer.id);

  console.log('Demo data ready:');
  console.log('  Own company:', own.companyName, `(id ${own.id})`);
  console.log('  Customer:', customer.companyName, `(id ${customer.id})`);
  console.log('  Vehicle:', vehicle.vehicleNumber, `(id ${vehicle.id})`);
  console.log('  Drivers:', drivers.map((d) => d.name).join(', '));
  console.log('  Sites:', sites.map((s) => s.siteName).join(', '));
  process.exit(0);
} catch (err) {
  console.error('Seed failed:', err.message);
  process.exit(1);
}
