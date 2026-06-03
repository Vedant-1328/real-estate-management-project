import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { modelOptions } from './baseOptions.js';

const Role = sequelize.define(
  'Role',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    ...modelOptions,
    tableName: 'roles',
  }
);

export default Role;
