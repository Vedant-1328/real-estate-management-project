import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { modelOptions } from './baseOptions.js';

const CompanyJobRate = sequelize.define(
  'CompanyJobRate',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'company_id',
      references: { model: 'companies', key: 'id' },
    },
    jobTypeId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'job_type_id',
      references: { model: 'job_types', key: 'id' },
    },
    vehicleType: {
      type: DataTypes.STRING(80),
      allowNull: true,
      field: 'vehicle_type',
    },
    rateType: {
      type: DataTypes.ENUM('per_trip', 'per_day', 'per_hour', 'fixed', 'per_ton'),
      allowNull: false,
      field: 'rate_type',
    },
    rateAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'rate_amount',
    },
    effectiveFrom: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'effective_from',
    },
    effectiveTo: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'effective_to',
    },
  },
  {
    ...modelOptions,
    tableName: 'company_job_rates',
  }
);

export default CompanyJobRate;
