import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { modelOptions } from './baseOptions.js';

export const ADVANCE_STATUSES = ['pending', 'deducted'];
export const ADVANCE_PAYMENT_MODES = ['cash', 'bank', 'upi', 'other'];

const DriverAdvance = sequelize.define(
  'DriverAdvance',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    driverId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'driver_id',
      references: { model: 'drivers', key: 'id' },
    },
    advanceDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'advance_date',
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    givenBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'given_by',
    },
    paymentMode: {
      type: DataTypes.ENUM(...ADVANCE_PAYMENT_MODES),
      allowNull: false,
      defaultValue: 'cash',
      field: 'payment_mode',
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    salaryPeriodMonth: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'salary_period_month',
    },
    salaryPeriodYear: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'salary_period_year',
    },
    status: {
      type: DataTypes.ENUM(...ADVANCE_STATUSES),
      allowNull: false,
      defaultValue: 'pending',
    },
  },
  {
    ...modelOptions,
    tableName: 'driver_advances',
  }
);

export default DriverAdvance;
