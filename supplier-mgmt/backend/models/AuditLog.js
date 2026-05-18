import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { modelOptions } from './baseOptions.js';

const AuditLog = sequelize.define(
  'AuditLog',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'user_id',
      references: { model: 'users', key: 'id' },
    },
    module: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    action: {
      type: DataTypes.ENUM('created', 'updated', 'deleted'),
      allowNull: false,
    },
    recordId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'record_id',
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    ...modelOptions,
    tableName: 'audit_logs',
    updatedAt: false,
    deletedAt: false,
    paranoid: false,
  }
);

export default AuditLog;
