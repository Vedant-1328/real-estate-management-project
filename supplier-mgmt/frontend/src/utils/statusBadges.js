const assignmentStatus = {
  planned: { label: 'Planned', variant: 'default' },
  assigned: { label: 'Assigned', variant: 'warning' },
  in_progress: { label: 'In Progress', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
  on_hold: { label: 'On Hold', variant: 'default' },
};

const invoiceStatus = {
  draft: { label: 'Draft', variant: 'default' },
  generated: { label: 'Generated', variant: 'warning' },
  sent: { label: 'Sent', variant: 'warning' },
  paid: { label: 'Paid', variant: 'success' },
  partially_paid: { label: 'Partial', variant: 'warning' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
};

export const getAssignmentStatusBadge = (status) =>
  assignmentStatus[status] || { label: status, variant: 'default' };

export const getInvoiceStatusBadge = (status) =>
  invoiceStatus[status] || { label: status, variant: 'default' };
