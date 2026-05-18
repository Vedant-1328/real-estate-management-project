import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { modelOptions } from './baseOptions.js';

export const EMPLOYEE_DOC_TYPES = ['id_proof', 'address_proof', 'other'];

const EmployeeDocument = sequelize.define(
  'EmployeeDocument',
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
    docType: {
      type: DataTypes.ENUM(...EMPLOYEE_DOC_TYPES),
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
    tableName: 'employee_documents',
    updatedAt: true,
    createdAt: false,
  }
);

export default EmployeeDocument;
