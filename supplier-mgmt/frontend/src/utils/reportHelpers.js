export const sortRows = (rows, sortKey, sortDir) => {
  if (!sortKey) return rows;
  const sorted = [...rows];
  sorted.sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortDir === 'asc' ? av - bv : bv - av;
    }
    const as = String(av).toLowerCase();
    const bs = String(bv).toLowerCase();
    if (as < bs) return sortDir === 'asc' ? -1 : 1;
    if (as > bs) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });
  return sorted;
};

export const exportToCsv = (filename, columns, rows) => {
  const header = columns.map((c) => `"${String(c.label).replace(/"/g, '""')}"`).join(',');
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const val = row[c.key];
          const text = val == null ? '' : String(val).replace(/"/g, '""');
          return `"${text}"`;
        })
        .join(',')
    )
    .join('\n');
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const MODULE_LABELS = {
  companies: 'Companies',
  job_types: 'Job Types',
  vehicles: 'Vehicles',
  drivers: 'Drivers',
  employees: 'Employees',
  sites: 'Sites',
  expense_types: 'Expense Types',
  job_assignments: 'Job Assignments',
  eod_entries: 'EOD Entries',
  daily_expenses: 'Daily Expenses',
  invoices: 'Invoices',
  payments: 'Payments',
  driver_advances: 'Driver Advances',
  employee_advances: 'Employee Advances',
  reports: 'Reports',
  users: 'Users',
  roles: 'Roles',
};

export const ACTION_LABELS = {
  view: 'View',
  add: 'Add',
  edit: 'Edit',
  delete: 'Delete',
  approve: 'Approve',
  export: 'Export',
  print: 'Print',
  generate_invoice: 'Generate Invoice',
};
