import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { modelOptions } from './baseOptions.js';

const Site = sequelize.define(
  'Site',
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
    companyId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'company_id',
      references: { model: 'companies', key: 'id' },
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
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
    siteType: {
      type: DataTypes.ENUM('pickup', 'delivery', 'both', 'site_by_site'),
      allowNull: false,
      defaultValue: 'both',
      field: 'site_type',
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    ...modelOptions,
    tableName: 'sites',
  }
);

export default Site;
