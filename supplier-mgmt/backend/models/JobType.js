import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { modelOptions } from './baseOptions.js';

export const JOB_TYPE_UNITS = ['trip', 'hour', 'day', 'fixed'];

const JobType = sequelize.define(
  'JobType',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    defaultUnit: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'trip',
      field: 'default_unit',
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active',
    },
  },
  {
    ...modelOptions,
    tableName: 'job_types',
  }
);

export default JobType;
