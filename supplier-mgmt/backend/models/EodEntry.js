import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { modelOptions } from './baseOptions.js';

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
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'planned_trips',
    },
    actualTrips: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: 'actual_trips',
    },
    ratePerTrip: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'rate_per_trip',
    },
    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'total_amount',
    },
    extraCharges: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
      field: 'extra_charges',
    },
    deductions: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    },
    dieselFuel: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'diesel_fuel',
    },
    expense: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
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
      type: DataTypes.DATE,
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
