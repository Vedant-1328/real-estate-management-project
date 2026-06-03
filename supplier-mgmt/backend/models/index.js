import sequelize from '../config/db.js';
import { defineAssociations } from './associations.js';

import User from './User.js';
import Role from './Role.js';
import Permission from './Permission.js';
import RolePermission from './RolePermission.js';
import Company from './Company.js';
import JobType from './JobType.js';
import CompanyJobRate from './CompanyJobRate.js';
import Vehicle from './Vehicle.js';
import Driver from './Driver.js';
import Employee from './Employee.js';
import Site from './Site.js';
import ExpenseType from './ExpenseType.js';
import JobAssignment from './JobAssignment.js';
import EodEntry from './EodEntry.js';
import DailyExpense from './DailyExpense.js';
import Invoice from './Invoice.js';
import InvoiceItem from './InvoiceItem.js';
import Payment from './Payment.js';
import TemporarySite from './TemporarySite.js';
import VehicleDocument from './VehicleDocument.js';
import DriverDocument from './DriverDocument.js';
import EmployeeDocument from './EmployeeDocument.js';
import DriverAdvance from './DriverAdvance.js';
import EmployeeAdvance from './EmployeeAdvance.js';
import AuditLog from './AuditLog.js';
import { applyModelEncryption } from '../utils/applyModelEncryption.js';

const models = {
  User,
  Role,
  Permission,
  RolePermission,
  Company,
  JobType,
  CompanyJobRate,
  Vehicle,
  Driver,
  Employee,
  Site,
  ExpenseType,
  JobAssignment,
  EodEntry,
  DailyExpense,
  Invoice,
  InvoiceItem,
  Payment,
  TemporarySite,
  VehicleDocument,
  DriverDocument,
  EmployeeDocument,
  DriverAdvance,
  EmployeeAdvance,
  AuditLog,
};

defineAssociations(models);
applyModelEncryption(models);

export {
  sequelize,
  User,
  Role,
  Permission,
  RolePermission,
  Company,
  JobType,
  CompanyJobRate,
  Vehicle,
  Driver,
  Employee,
  Site,
  ExpenseType,
  JobAssignment,
  EodEntry,
  DailyExpense,
  Invoice,
  InvoiceItem,
  Payment,
  TemporarySite,
  VehicleDocument,
  DriverDocument,
  EmployeeDocument,
  DriverAdvance,
  EmployeeAdvance,
  AuditLog,
};

export default models;
