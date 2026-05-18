import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { modelOptions } from './baseOptions.js';

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
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'billing_period_from',
    },
    billingPeriodTo: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'billing_period_to',
    },
    totalTrips: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: 0,
      field: 'total_trips',
    },
    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'total_amount',
    },
    extraCharges: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
      field: 'extra_charges',
    },
    discount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    },
    discountPercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
      field: 'discount_percent',
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
      field: 'tax_rate',
    },
    cgstRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
      field: 'cgst_rate',
    },
    sgstRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
      field: 'sgst_rate',
    },
    taxAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
      field: 'tax_amount',
    },
    cgstAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
      field: 'cgst_amount',
    },
    sgstAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
      field: 'sgst_amount',
    },
    grandTotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
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
