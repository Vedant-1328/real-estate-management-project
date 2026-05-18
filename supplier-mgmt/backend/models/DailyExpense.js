import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { modelOptions } from './baseOptions.js';

const DailyExpense = sequelize.define(
  'DailyExpense',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    expenseDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'expense_date',
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
    expenseTypeId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'expense_type_id',
      references: { model: 'expense_types', key: 'id' },
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    paidBy: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'paid_by',
    },
    paymentMode: {
      type: DataTypes.ENUM('cash', 'bank', 'upi', 'other'),
      allowNull: false,
      defaultValue: 'cash',
      field: 'payment_mode',
    },
    receiptPath: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'receipt_path',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'created_by',
      references: { model: 'users', key: 'id' },
    },
  },
  {
    ...modelOptions,
    tableName: 'daily_expenses',
  }
);

export default DailyExpense;
