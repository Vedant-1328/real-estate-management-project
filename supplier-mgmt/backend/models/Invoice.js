import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { encryptedValueType, modelOptions } from './baseOptions.js';

const Invoice = sequelize.define(
  'Invoice',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    invoiceNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'invoice_number',
    },
    invoiceDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'invoice_date',
    },
    companyId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'company_id',
      references: { model: 'companies', key: 'id' },
    },
    billToName: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: 'bill_to_name',
    },
    billToAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'bill_to_address',
    },
    billToGst: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'bill_to_gst',
    },
    issuerCompanyId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'issuer_company_id',
      references: { model: 'companies', key: 'id' },
    },
    billingPeriodFrom: {
      // STRING (not DATEONLY): column stores encrypted ciphertext; DATEONLY corrupts enc:* on save
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'billing_period_from',
    },
    billingPeriodTo: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'billing_period_to',
    },
    totalTrips: {
      type: encryptedValueType,
      allowNull: true,
      field: 'total_trips',
    },
    totalAmount: {
      type: encryptedValueType,
      allowNull: false,
      field: 'total_amount',
    },
    extraCharges: {
      type: encryptedValueType,
      allowNull: true,
      field: 'extra_charges',
    },
    discount: {
      type: encryptedValueType,
      allowNull: true,
    },
    discountPercent: {
      type: encryptedValueType,
      allowNull: true,
      field: 'discount_percent',
    },
    taxRate: {
      type: encryptedValueType,
      allowNull: true,
      field: 'tax_rate',
    },
    cgstRate: {
      type: encryptedValueType,
      allowNull: true,
      field: 'cgst_rate',
    },
    sgstRate: {
      type: encryptedValueType,
      allowNull: true,
      field: 'sgst_rate',
    },
    taxAmount: {
      type: encryptedValueType,
      allowNull: true,
      field: 'tax_amount',
    },
    cgstAmount: {
      type: encryptedValueType,
      allowNull: true,
      field: 'cgst_amount',
    },
    sgstAmount: {
      type: encryptedValueType,
      allowNull: true,
      field: 'sgst_amount',
    },
    grandTotal: {
      type: encryptedValueType,
      allowNull: false,
      field: 'grand_total',
    },
    paymentStatus: {
      type: DataTypes.ENUM(
        'draft',
        'generated',
        'sent',
        'paid',
        'partially_paid',
        'cancelled'
      ),
      allowNull: false,
      defaultValue: 'draft',
      field: 'payment_status',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    ...modelOptions,
    tableName: 'invoices',
  }
);

export default Invoice;
