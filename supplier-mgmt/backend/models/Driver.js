import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { modelOptions } from './baseOptions.js';

const Driver = sequelize.define(
  'Driver',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    mobile: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    licenseNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'license_number',
    },
    licenseExpiry: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'license_expiry',
    },
    driverType: {
      type: DataTypes.ENUM('own', 'outside'),
      allowNull: false,
      defaultValue: 'own',
      field: 'driver_type',
    },
    defaultVehicleId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'default_vehicle_id',
      references: { model: 'vehicles', key: 'id' },
    },
    grossSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'gross_salary',
    },
    status: {
      type: DataTypes.ENUM('available', 'assigned', 'inactive'),
      allowNull: false,
      defaultValue: 'available',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    ...modelOptions,
    tableName: 'drivers',
  }
);

export default Driver;
