import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { modelOptions } from './baseOptions.js';

const InvoiceItem = sequelize.define(
  'InvoiceItem',
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
    eodEntryId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'eod_entry_id',
      references: { model: 'eod_entries', key: 'id' },
    },
    lineDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'line_date',
    },
    jobTypeName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'job_type_name',
    },
    vehicleNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'vehicle_number',
    },
    driverName: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'driver_name',
    },
    fromSite: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'from_site',
    },
    toSite: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'to_site',
    },
    actualTrips: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      field: 'actual_trips',
    },
    ratePerTrip: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'rate_per_trip',
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    ...modelOptions,
    tableName: 'invoice_items',
  }
);

export default InvoiceItem;
