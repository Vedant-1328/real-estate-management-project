import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { encryptedValueType, modelOptions } from './baseOptions.js';

const Payment = sequelize.define(
  'Payment',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    invoiceId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'invoice_id',
      references: { model: 'invoices', key: 'id' },
    },
    paymentDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'payment_date',
    },
    amount: {
      type: encryptedValueType,
      allowNull: false,
    },
    paymentMode: {
      type: encryptedValueType,
      allowNull: false,
      field: 'payment_mode',
    },
    referenceNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'reference_number',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    ...modelOptions,
    tableName: 'payments',
  }
);

export default Payment;
