import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { modelOptions } from './baseOptions.js';

export const DRIVER_DOC_TYPES = [
  'driving_license',
  'id_proof',
  'address_proof',
  'other',
];

const DriverDocument = sequelize.define(
  'DriverDocument',
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
    docType: {
      type: DataTypes.ENUM(...DRIVER_DOC_TYPES),
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
    tableName: 'driver_documents',
    updatedAt: true,
    createdAt: false,
  }
);

export default DriverDocument;
