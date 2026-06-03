import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { modelOptions } from './baseOptions.js';

const Company = sequelize.define(
  'Company',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    companyName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'company_name',
    },
    companyType: {
      type: DataTypes.ENUM('own', 'customer'),
      allowNull: false,
      defaultValue: 'customer',
      field: 'company_type',
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
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    billingAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'billing_address',
    },
    gstNumber: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'gst_number',
    },
    paymentTerms: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'payment_terms',
    },
    bankAccountNumber: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'bank_account_number',
    },
    bankIfscCode: {
      type: DataTypes.STRING(11),
      allowNull: true,
      field: 'bank_ifsc_code',
    },
    bankAccountHolderName: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'bank_account_holder_name',
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
    tableName: 'companies',
  }
);

export default Company;
