export function defineAssociations(models) {
  const {
    User,
    Role,
    Permission,
    RolePermission,
    Company,
    JobType,
    CompanyJobRate,
    Vehicle,
    Driver,
    Employee,
    Site,
    ExpenseType,
    JobAssignment,
    EodEntry,
    DailyExpense,
    Invoice,
    InvoiceItem,
    Payment,
    TemporarySite,
    VehicleDocument,
    DriverDocument,
    EmployeeDocument,
    DriverAdvance,
    EmployeeAdvance,
    AuditLog,
  } = models;

  User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
  Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });

  User.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
  User.hasMany(User, { foreignKey: 'createdBy', as: 'createdUsers' });

  Role.belongsToMany(Permission, {
    through: RolePermission,
    foreignKey: 'roleId',
    otherKey: 'permissionId',
    as: 'permissions',
  });
  Permission.belongsToMany(Role, {
    through: RolePermission,
    foreignKey: 'permissionId',
    otherKey: 'roleId',
    as: 'roles',
  });
  RolePermission.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
  RolePermission.belongsTo(Permission, { foreignKey: 'permissionId', as: 'permission' });

  Company.hasMany(CompanyJobRate, { foreignKey: 'companyId', as: 'jobRates' });
  CompanyJobRate.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

  JobType.hasMany(CompanyJobRate, { foreignKey: 'jobTypeId', as: 'companyRates' });
  CompanyJobRate.belongsTo(JobType, { foreignKey: 'jobTypeId', as: 'jobType' });

  Company.hasMany(Site, { foreignKey: 'companyId', as: 'sites' });
  Site.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

  Vehicle.hasMany(Driver, { foreignKey: 'defaultVehicleId', as: 'defaultDrivers' });
  Driver.belongsTo(Vehicle, { foreignKey: 'defaultVehicleId', as: 'defaultVehicle' });

  Vehicle.hasMany(VehicleDocument, { foreignKey: 'vehicleId', as: 'documents' });
  VehicleDocument.belongsTo(Vehicle, { foreignKey: 'vehicleId', as: 'vehicle' });

  Driver.hasMany(DriverDocument, { foreignKey: 'driverId', as: 'documents' });
  DriverDocument.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

  Employee.hasMany(EmployeeDocument, { foreignKey: 'employeeId', as: 'documents' });
  EmployeeDocument.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

  Company.hasMany(JobAssignment, { foreignKey: 'companyId', as: 'assignments' });
  JobAssignment.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
  JobAssignment.belongsTo(JobType, { foreignKey: 'jobTypeId', as: 'jobType' });
  JobAssignment.belongsTo(Vehicle, { foreignKey: 'vehicleId', as: 'vehicle' });
  JobAssignment.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });
  JobAssignment.belongsTo(Driver, { foreignKey: 'replacedDriverId', as: 'replacedDriver' });
  JobAssignment.belongsTo(Site, { foreignKey: 'fromSiteId', as: 'fromSite' });
  JobAssignment.belongsTo(Site, { foreignKey: 'toSiteId', as: 'toSite' });
  JobAssignment.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

  JobAssignment.hasMany(EodEntry, { foreignKey: 'assignmentId', as: 'eodEntries' });
  EodEntry.belongsTo(JobAssignment, { foreignKey: 'assignmentId', as: 'assignment' });
  EodEntry.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
  EodEntry.belongsTo(Vehicle, { foreignKey: 'vehicleId', as: 'vehicle' });
  EodEntry.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });
  EodEntry.belongsTo(JobType, { foreignKey: 'jobTypeId', as: 'jobType' });
  EodEntry.belongsTo(Site, { foreignKey: 'fromSiteId', as: 'fromSite' });
  EodEntry.belongsTo(Site, { foreignKey: 'toSiteId', as: 'toSite' });
  EodEntry.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
  EodEntry.belongsTo(ExpenseType, { foreignKey: 'expenseTypeId', as: 'expenseType' });
  ExpenseType.hasMany(EodEntry, { foreignKey: 'expenseTypeId', as: 'eodEntries' });

  DailyExpense.belongsTo(Vehicle, { foreignKey: 'vehicleId', as: 'vehicle' });
  DailyExpense.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });
  DailyExpense.belongsTo(ExpenseType, { foreignKey: 'expenseTypeId', as: 'expenseType' });
  DailyExpense.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

  Company.hasMany(Invoice, { foreignKey: 'companyId', as: 'invoices' });
  Invoice.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
  Company.hasMany(Invoice, { foreignKey: 'issuerCompanyId', as: 'issuedInvoices' });
  Invoice.belongsTo(Company, { foreignKey: 'issuerCompanyId', as: 'issuerCompany' });
  Invoice.hasMany(InvoiceItem, { foreignKey: 'invoiceId', as: 'items' });
  InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });
  InvoiceItem.belongsTo(EodEntry, { foreignKey: 'eodEntryId', as: 'eodEntry' });
  Invoice.hasMany(Payment, { foreignKey: 'invoiceId', as: 'payments' });
  Payment.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

  TemporarySite.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
  TemporarySite.belongsTo(Site, { foreignKey: 'convertedToSiteId', as: 'convertedSite' });

  Driver.hasMany(DriverAdvance, { foreignKey: 'driverId', as: 'advances' });
  DriverAdvance.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

  Employee.hasMany(EmployeeAdvance, { foreignKey: 'employeeId', as: 'advances' });
  EmployeeAdvance.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

  User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
  AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
}
