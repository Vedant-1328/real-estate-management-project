import { useCallback, useEffect, useState } from 'react';
import { fetchCompanies } from '../../api/companies.js';
import {
  deleteAssignment,
  fetchAssignments,
  updateAssignmentStatus,
} from '../../api/jobAssignments.js';
import Button from '../../components/Button.jsx';
import SlideOver from '../../components/SlideOver.jsx';
import Table from '../../components/Table.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatDate } from '../../utils/formatters.js';
import AssignmentForm from './AssignmentForm.jsx';

const today = () => new Date().toISOString().slice(0, 10);

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'on_hold', label: 'On Hold' },
];

const STATUS_CLASS = {
  planned: 'bg-slate-100 text-slate-700',
  assigned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-900',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  on_hold: 'bg-orange-100 text-orange-800',
};

function StatusBadge({ status }) {
  const label = STATUS_OPTIONS.find((s) => s.value === status)?.label || status;
  const className = STATUS_CLASS[status] || STATUS_CLASS.planned;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function DriverCell({ row }) {
  if (row.outsideDriverName) {
    return (
      <div>
        <p className="font-medium text-slate-800">{row.outsideDriverName}</p>
        {row.outsideDriverMobile && (
          <p className="text-xs text-slate-500">{row.outsideDriverMobile}</p>
        )}
        {row.outsideDriverVehicle && (
          <p className="text-xs text-slate-500">Veh: {row.outsideDriverVehicle}</p>
        )}
      </div>
    );
  }
  return row.driver?.name || <span className="text-slate-400">—</span>;
}

export default function AssignmentList() {
  const toast = useToast();
  const confirm = useConfirm();
  const canView = usePermission('job_assignments', 'view');
  const canAdd = usePermission('job_assignments', 'add');
  const canEdit = usePermission('job_assignments', 'edit');
  const canDelete = usePermission('job_assignments', 'delete');

  const [assignments, setAssignments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [date, setDate] = useState(today());
  const [companyId, setCompanyId] = useState('all');
  const [status, setStatus] = useState('all');

  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchCompanies({ limit: 500, status: 'active' })
      .then((res) => setCompanies(res.data.data))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await fetchAssignments({
        date: date || undefined,
        companyId: companyId === 'all' ? undefined : companyId,
        status: status === 'all' ? undefined : status,
      });
      setAssignments(data.data);
    } catch {
      setLoadError('Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  }, [canView, date, companyId, status, toast]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const handleStatusChange = async (row, newStatus) => {
    if (row.status === newStatus) return;
    try {
      await updateAssignmentStatus(row.id, newStatus);
      toast.success('Status updated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: 'Delete assignment',
      message: 'Delete this assignment? This cannot be undone.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteAssignment(row.id);
      toast.success('Assignment deleted');
      load();
    } catch {
      toast.error('Failed to delete assignment');
    }
  };

  if (!canView) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        You do not have permission to view job assignments.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Morning Job Assignments</h1>
          <p className="mt-1 text-sm text-slate-600">Plan daily vehicle and driver assignments</p>
        </div>
        {canAdd && (
          <Button
            onClick={() => {
              setEditing(null);
              setPanelOpen(true);
            }}
          >
            New Assignment
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Company</label>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="min-w-[160px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <Table
            loading={loading}
            error={loadError}
            onRetry={load}
            emptyMessage="No assignments for this date."
            columns={[
              { key: 'assignmentDate', label: 'Date' },
              { key: 'company', label: 'Company' },
              { key: 'jobType', label: 'Job Type' },
              { key: 'vehicle', label: 'Vehicle' },
              { key: 'driver', label: 'Driver' },
              { key: 'route', label: 'From → To' },
              { key: 'expectedTrips', label: 'Expected Trips' },
              { key: 'dieselFuel', label: 'Diesel/Fuel' },
              { key: 'status', label: 'Status' },
              { key: 'actions', label: 'Actions' },
            ]}
            data={assignments.map((a) => ({
              ...a,
              assignmentDate: formatDate(a.assignmentDate),
              company: a.company?.companyName || '—',
              jobType: a.jobType?.name || '—',
              vehicle: a.vehicle?.vehicleNumber || a.outsideDriverVehicle || '—',
              driver: <DriverCell row={a} />,
              route: a.routeLabel,
              dieselFuel: a.dieselFuel != null ? a.dieselFuel : '—',
              status: (
                <div className="flex flex-col gap-1">
                  <StatusBadge status={a.status} />
                  {canEdit && (
                    <select
                      value={a.status}
                      onChange={(e) => handleStatusChange(a, e.target.value)}
                      className="rounded border border-slate-200 px-1 py-0.5 text-xs text-slate-700"
                      title="Quick status update"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ),
              actions: (
                <div className="flex gap-2">
                  {canEdit && (
                    <button
                      type="button"
                      className="text-sm font-medium text-slate-700 hover:text-slate-900"
                      onClick={() => {
                        setEditing(a);
                        setPanelOpen(true);
                      }}
                    >
                      Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(a)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ),
            }))}
          />
      </div>

      <SlideOver
        open={panelOpen}
        onClose={() => {
          setPanelOpen(false);
          setEditing(null);
        }}
        title={editing ? `Edit Assignment` : 'New Assignment'}
        wide
      >
        <AssignmentForm
          assignment={editing}
          onCancel={() => {
            setPanelOpen(false);
            setEditing(null);
          }}
          onSuccess={() => {
            setPanelOpen(false);
            setEditing(null);
            load();
          }}
        />
      </SlideOver>
    </div>
  );
}
