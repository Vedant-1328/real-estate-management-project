import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { modelOptions } from './baseOptions.js';

const JobType = sequelize.define(
  'JobType',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    defaultUnit: {
      type: DataTypes.ENUM('trip', 'hour', 'day', 'fixed'),
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
