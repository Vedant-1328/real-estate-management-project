import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { encryptedValueType, modelOptions } from './baseOptions.js';

const JobAssignment = sequelize.define(
  'JobAssignment',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    assignmentDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'assignment_date',
    },
    companyId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'company_id',
      references: { model: 'companies', key: 'id' },
    },
    jobTypeId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'job_type_id',
      references: { model: 'job_types', key: 'id' },
    },
    vehicleId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'vehicle_id',
      references: { model: 'vehicles', key: 'id' },
    },
    driverId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'driver_id',
      references: { model: 'drivers', key: 'id' },
    },
    outsideDriverName: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'outside_driver_name',
    },
    outsideDriverMobile: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'outside_driver_mobile',
    },
    outsideDriverVehicle: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'outside_driver_vehicle',
    },
    replacedDriverId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'replaced_driver_id',
      references: { model: 'drivers', key: 'id' },
    },
    fromSiteId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'from_site_id',
      references: { model: 'sites', key: 'id' },
    },
    toSiteId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'to_site_id',
      references: { model: 'sites', key: 'id' },
    },
    fromSiteTemp: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'from_site_temp',
    },
    toSiteTemp: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'to_site_temp',
    },
    expectedTrips: {
      type: encryptedValueType,
      allowNull: true,
      field: 'expected_trips',
    },
    companyRate: {
      type: encryptedValueType,
      allowNull: true,
      field: 'company_rate',
    },
    driverCost: {
      type: encryptedValueType,
      allowNull: true,
      field: 'driver_cost',
    },
    dieselFuel: {
      type: encryptedValueType,
      allowNull: true,
      field: 'diesel_fuel',
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        'planned',
        'assigned',
        'in_progress',
        'completed',
        'cancelled',
        'on_hold'
      ),
      allowNull: false,
      defaultValue: 'planned',
    },
    createdBy: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'created_by',
      references: { model: 'users', key: 'id' },
    },
  },
  {
    ...modelOptions,
    tableName: 'job_assignments',
  }
);

export default JobAssignment;
