export const navSections = [
  {
    label: null,
    items: [{ to: '/dashboard', label: 'Dashboard', icon: 'dashboard', end: true }],
  },
  {
    label: 'Masters',
    items: [
      { to: '/companies', label: 'Companies', icon: 'building' },
      { to: '/job-types', label: 'Job Types', icon: 'briefcase' },
      { to: '/vehicles', label: 'Vehicles', icon: 'truck' },
      { to: '/drivers', label: 'Drivers', icon: 'user' },
      { to: '/employees', label: 'Employees', icon: 'users' },
      { to: '/sites', label: 'Sites', icon: 'map' },
      { to: '/expense-types', label: 'Expense Types', icon: 'tag' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/job-assignments', label: 'Job Assignments', icon: 'clipboard' },
      { to: '/eod-entries', label: 'EOD Entries', icon: 'check' },
      { to: '/daily-expenses', label: 'Daily Expenses', icon: 'wallet' },
      { to: '/outside-driver-jobs', label: 'Outside Driver Jobs', icon: 'route' },
    ],
  },
  {
    label: 'Billing',
    items: [
      { to: '/invoices', label: 'Invoices', icon: 'file' },
      { to: '/payments', label: 'Payments', icon: 'credit' },
    ],
  },
  {
    label: 'Salary',
    items: [
      { to: '/driver-advances', label: 'Driver Advances', icon: 'cash' },
      { to: '/driver-salary-processing', label: 'Driver Salary', icon: 'calculator' },
      { to: '/employee-advances', label: 'Employee Advances', icon: 'cash' },
      { to: '/employee-salary-processing', label: 'Employee Salary', icon: 'calculator' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { to: '/reports/daily-job', label: 'Daily Job', icon: 'chart' },
      { to: '/reports/vehicle', label: 'Vehicle', icon: 'chart' },
      { to: '/reports/driver', label: 'Driver', icon: 'chart' },
      { to: '/reports/company-billing', label: 'Company Billing', icon: 'chart' },
      { to: '/reports/expense', label: 'Expense', icon: 'chart' },
      { to: '/reports/profit', label: 'Profit', icon: 'chart' },
      { to: '/reports/salary', label: 'Salary', icon: 'chart' },
    ],
  },
  {
    label: 'Settings',
    settingsOnly: true,
    items: [
      { to: '/users', label: 'Users', icon: 'settings' },
      { to: '/roles', label: 'Roles & Permissions', icon: 'shield' },
    ],
  },
];
