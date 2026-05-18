import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { modelOptions } from './baseOptions.js';

export const VEHICLE_DOC_TYPES = [
  'rc_book',
  'insurance',
  'permit',
  'fitness_certificate',
  'pollution_certificate',
  'other',
];

const VehicleDocument = sequelize.define(
  'VehicleDocument',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    vehicleId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'vehicle_id',
      references: { model: 'vehicles', key: 'id' },
    },
    docType: {
      type: DataTypes.ENUM(...VEHICLE_DOC_TYPES),
      allowNull: false,
      field: 'doc_type',
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'file_path',
    },
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'original_name',
    },
    uploadedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'uploaded_at',
    },
  },
  {
    ...modelOptions,
    tableName: 'vehicle_documents',
    updatedAt: true,
    createdAt: false,
  }
);

export default VehicleDocument;
