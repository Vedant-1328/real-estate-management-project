/** Sidebar routes and expected page headings (keep in sync with navConfig + App routes). */
export const NAV_PAGES = [
  { path: '/dashboard', heading: /Dashboard/i },
  { path: '/companies', heading: /Companies/i },
  { path: '/job-types', heading: /Job Types/i },
  { path: '/vehicle-types', heading: /Vehicle Types/i },
  { path: '/vehicles', heading: /Vehicles/i },
  { path: '/drivers', heading: /Drivers/i },
  { path: '/employees', heading: /Employees/i },
  { path: '/sites', heading: /Sites/i },
  { path: '/expense-types', heading: /Expense Types/i },
  { path: '/eod-entries', heading: /End of Day Entries/i },
  { path: '/daily-expenses', heading: /Daily Expenses/i },
  { path: '/outside-driver-jobs', heading: /Outside Driver Jobs/i },
  { path: '/invoices', heading: /Invoices/i },
  { path: '/payments', heading: /Payments/i },
  { path: '/driver-advances', heading: /Driver Advances/i },
  { path: '/driver-salary-processing', heading: /Driver Salary Processing/i },
  { path: '/employee-advances', heading: /Employee Advances/i },
  { path: '/employee-salary-processing', heading: /Employee Salary Processing/i },
  { path: '/reports/daily-job', heading: /Daily Job Report/i },
  { path: '/reports/vehicle', heading: /Vehicle Report/i },
  { path: '/reports/driver', heading: /Driver Report/i },
  { path: '/reports/company-billing', heading: /Company Billing/i },
  { path: '/reports/expense', heading: /Expense Report/i },
  { path: '/reports/profit', heading: /Profit Report/i },
  { path: '/reports/salary', heading: /Salary Report/i },
  { path: '/users', heading: /Users/i },
  { path: '/roles', heading: /Roles & Permissions/i },
];

export const EXTRA_ROUTES = [
  { path: '/invoices/generate', heading: /Generate Invoice/i },
];
