import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { modelOptions } from './baseOptions.js';

const TemporarySite = sequelize.define(
  'TemporarySite',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    siteName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'site_name',
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    contactPerson: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'contact_person',
    },
    mobile: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'created_by',
      references: { model: 'users', key: 'id' },
    },
    convertedToSiteId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'converted_to_site_id',
      references: { model: 'sites', key: 'id' },
    },
  },
  {
    ...modelOptions,
    tableName: 'temporary_sites',
  }
);

export default TemporarySite;
