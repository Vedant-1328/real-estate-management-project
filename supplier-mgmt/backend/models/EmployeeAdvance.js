import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { encryptedValueType, modelOptions } from './baseOptions.js';
import { ADVANCE_PAYMENT_MODES, ADVANCE_STATUSES } from './DriverAdvance.js';

const EmployeeAdvance = sequelize.define(
  'EmployeeAdvance',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    employeeId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'employee_id',
      references: { model: 'employees', key: 'id' },
    },
    advanceDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'advance_date',
    },
    amount: {
      type: encryptedValueType,
      allowNull: false,
    },
    givenBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'given_by',
    },
    paymentMode: {
      type: encryptedValueType,
      allowNull: false,
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
    tableName: 'employee_advances',
  }
);

export default EmployeeAdvance;
