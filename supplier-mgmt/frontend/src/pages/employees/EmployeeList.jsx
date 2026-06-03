import { useCallback, useEffect, useState } from 'react';
import { deleteEmployee, fetchEmployees } from '../../api/employees.js';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import Table from '../../components/Table.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatDate } from '../../utils/formatters.js';
import EmployeeForm from './EmployeeForm.jsx';

const STATUS_BADGE = {
  active: { label: 'Active', variant: 'success' },
  inactive: { label: 'Inactive', variant: 'default' },
};

const TYPE_LABELS = {
  supervisor: 'Supervisor',
  accountant: 'Accountant',
  office_staff: 'Office Staff',
  helper: 'Helper',
  site_staff: 'Site Staff',
  driver: 'Driver',
};

const TYPE_BADGE_CLASS = {
  supervisor: 'bg-purple-100 text-purple-800',
  accountant: 'bg-blue-100 text-blue-800',
  office_staff: 'bg-teal-100 text-teal-800',
  helper: 'bg-orange-100 text-orange-800',
  site_staff: 'bg-stone-200 text-stone-800',
  driver: 'bg-slate-100 text-slate-700',
};

function EmployeeTypeBadge({ type }) {
  const label = TYPE_LABELS[type] || type;
  const className = TYPE_BADGE_CLASS[type] || TYPE_BADGE_CLASS.driver;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

export default function EmployeeList() {
  const toast = useToast();
  const confirm = useConfirm();
  const canView = usePermission('employees', 'view');
  const canAdd = usePermission('employees', 'add');
  const canEdit = usePermission('employees', 'edit');
  const canDelete = usePermission('employees', 'delete');

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [status, setStatus] = useState('all');
  const [employeeType, setEmployeeType] = useState('all');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await fetchEmployees({
        status: status === 'all' ? undefined : status,
        employeeType: employeeType === 'all' ? undefined : employeeType,
        search: search || undefined,
      });
      setEmployees(data.data ?? []);
    } catch {
      setLoadError('Failed to load employees.');
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [canView, status, employeeType, search, toast]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: 'Delete employee',
      message: `Delete employee ${row.name}? This cannot be undone.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteEmployee(row.id);
      toast.success('Employee deleted');
      load();
    } catch {
      toast.error('Failed to delete employee');
    }
  };

  if (!canView) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        You do not have permission to view employees.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
          <p className="mt-1 text-sm text-slate-600">
            Staff records, salaries, and documents
          </p>
        </div>
        {canAdd && (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Add Employee
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <input
          type="search"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[180px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={employeeType}
          onChange={(e) => setEmployeeType(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">All Types</option>
          <option value="driver">Driver</option>
          <option value="supervisor">Supervisor</option>
          <option value="accountant">Accountant</option>
          <option value="office_staff">Office Staff</option>
          <option value="helper">Helper</option>
          <option value="site_staff">Site Staff</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table
            loading={loading}
            error={loadError}
            onRetry={load}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'mobile', label: 'Mobile' },
              { key: 'email', label: 'Email' },
              { key: 'employeeType', label: 'Employee Type' },
              { key: 'joiningDate', label: 'Joining Date' },
              { key: 'status', label: 'Status' },
              { key: 'actions', label: 'Actions' },
            ]}
            data={employees.map((e) => {
              const st = STATUS_BADGE[e.status] || STATUS_BADGE.inactive;
              return {
                ...e,
                email: e.email || <span className="text-slate-400">—</span>,
                employeeType: <EmployeeTypeBadge type={e.employeeType} />,
                joiningDate: e.joiningDate ? formatDate(e.joiningDate) : '—',
                status: <Badge variant={st.variant}>{st.label}</Badge>,
                actions: (
                  <div className="flex gap-2">
                    {canEdit && (
                      <button
                        type="button"
                        className="text-sm font-medium text-slate-700 hover:text-slate-900"
                        onClick={() => {
                          setEditing(e);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(e)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ),
              };
            })}
          />
      </div>

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? `Edit — ${editing.name}` : 'Add Employee'}
        size="lg"
      >
        <EmployeeForm
          employee={editing}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSuccess={(created) => {
            load();
            if (created) {
              setEditing(created);
            } else {
              setFormOpen(false);
              setEditing(null);
            }
          }}
        />
      </Modal>
    </div>
  );
}
