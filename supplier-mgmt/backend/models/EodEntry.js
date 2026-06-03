import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { encryptedValueType, modelOptions } from './baseOptions.js';

const EodEntry = sequelize.define(
  'EodEntry',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    assignmentId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'assignment_id',
      references: { model: 'job_assignments', key: 'id' },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    companyId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'company_id',
      references: { model: 'companies', key: 'id' },
    },
    vehicleId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'vehicle_id',
      references: { model: 'vehicles', key: 'id' },
    },
    driverId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'driver_id',
      references: { model: 'drivers', key: 'id' },
    },
    jobTypeId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'job_type_id',
      references: { model: 'job_types', key: 'id' },
    },
    fromSiteId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'from_site_id',
      references: { model: 'sites', key: 'id' },
    },
    toSiteId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'to_site_id',
      references: { model: 'sites', key: 'id' },
    },
    plannedTrips: {
      type: encryptedValueType,
      allowNull: true,
      field: 'planned_trips',
    },
    actualTrips: {
      type: encryptedValueType,
      allowNull: false,
      field: 'actual_trips',
    },
    ratePerTrip: {
      type: encryptedValueType,
      allowNull: true,
      field: 'rate_per_trip',
    },
    totalAmount: {
      type: encryptedValueType,
      allowNull: false,
      field: 'total_amount',
    },
    extraCharges: {
      type: encryptedValueType,
      allowNull: true,
      field: 'extra_charges',
    },
    deductions: {
      type: encryptedValueType,
      allowNull: true,
    },
    dieselFuel: {
      type: encryptedValueType,
      allowNull: true,
      field: 'diesel_fuel',
    },
    expense: {
      type: encryptedValueType,
      allowNull: true,
    },
    expenseTypeId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'expense_type_id',
      references: { model: 'expense_types', key: 'id' },
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    startTime: {
      type: DataTypes.STRING(8),
      allowNull: true,
      field: 'start_time',
    },
    endTime: {
      type: DataTypes.STRING(8),
      allowNull: true,
      field: 'end_time',
    },
    approvedBy: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'approved_by',
      references: { model: 'users', key: 'id' },
    },
    approvalDate: {
      type: encryptedValueType,
      allowNull: true,
      field: 'approval_date',
    },
    billingStatus: {
      type: DataTypes.ENUM('pending', 'invoiced'),
      allowNull: false,
      defaultValue: 'pending',
      field: 'billing_status',
    },
  },
  {
    ...modelOptions,
    tableName: 'eod_entries',
  }
);

export default EodEntry;
