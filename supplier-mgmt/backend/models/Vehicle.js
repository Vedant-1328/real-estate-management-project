import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { modelOptions } from './baseOptions.js';

const Vehicle = sequelize.define(
  'Vehicle',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    vehicleNumber: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      field: 'vehicle_number',
    },
    vehicleTypeId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'vehicle_type_id',
      references: { model: 'vehicle_types', key: 'id' },
    },
    vehicleType: {
      type: DataTypes.STRING(80),
      allowNull: true,
      field: 'vehicle_type',
    },
    vehicleModel: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'vehicle_model',
    },
    capacity: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    ownerType: {
      type: DataTypes.ENUM('own', 'rented', 'third_party'),
      allowNull: false,
      defaultValue: 'own',
      field: 'owner_type',
    },
    insuranceExpiry: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'insurance_expiry',
    },
    fitnessExpiry: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'fitness_expiry',
    },
    permitExpiry: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'permit_expiry',
    },
    pollutionExpiry: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'pollution_expiry',
    },
    status: {
      type: DataTypes.ENUM('available', 'assigned', 'maintenance', 'inactive'),
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
    tableName: 'vehicles',
  }
);

export default Vehicle;
