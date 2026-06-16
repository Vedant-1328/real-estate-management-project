import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { modelOptions } from './baseOptions.js';

export const VEHICLE_TYPE_BILLING_UNITS = ['trip', 'hour', 'both'];

const VehicleType = sequelize.define(
  'VehicleType',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    billingUnit: {
      type: DataTypes.ENUM(...VEHICLE_TYPE_BILLING_UNITS),
      allowNull: false,
      defaultValue: 'trip',
      field: 'billing_unit',
    },
    showsCapacity: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'shows_capacity',
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active',
    },
  },
  {
    ...modelOptions,
    tableName: 'vehicle_types',
  }
);

export default VehicleType;
