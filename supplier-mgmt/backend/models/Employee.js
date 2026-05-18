import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { modelOptions } from './baseOptions.js';

const Employee = sequelize.define(
  'Employee',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    mobile: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    roleDepartment: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'role_department',
    },
    joiningDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'joining_date',
    },
    grossSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'gross_salary',
    },
    employeeType: {
      type: DataTypes.ENUM(
        'supervisor',
        'office_staff',
        'accountant',
        'helper',
        'site_staff',
        'driver'
      ),
      allowNull: false,
      field: 'employee_type',
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
    tableName: 'employees',
  }
);

export default Employee;
