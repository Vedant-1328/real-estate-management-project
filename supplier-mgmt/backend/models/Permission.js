import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { modelOptions } from './baseOptions.js';

export const PERMISSION_ACTIONS = [
  'view',
  'add',
  'edit',
  'delete',
  'approve',
  'export',
  'print',
  'generate_invoice',
  'override',
];

const Permission = sequelize.define(
  'Permission',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    moduleName: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'module_name',
    },
    action: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    ...modelOptions,
    tableName: 'permissions',
    indexes: [
      {
        unique: true,
        fields: ['module_name', 'action'],
        name: 'permissions_module_action_unique',
      },
    ],
  }
);

export default Permission;
