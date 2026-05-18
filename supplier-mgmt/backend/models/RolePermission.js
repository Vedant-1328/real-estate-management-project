import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { modelOptions } from './baseOptions.js';

const RolePermission = sequelize.define(
  'RolePermission',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    roleId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'role_id',
      references: { model: 'roles', key: 'id' },
    },
    permissionId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'permission_id',
      references: { model: 'permissions', key: 'id' },
    },
  },
  {
    ...modelOptions,
    tableName: 'role_permissions',
    indexes: [
      {
        unique: true,
        fields: ['role_id', 'permission_id'],
        name: 'role_permissions_role_permission_unique',
      },
    ],
  }
);

export default RolePermission;
