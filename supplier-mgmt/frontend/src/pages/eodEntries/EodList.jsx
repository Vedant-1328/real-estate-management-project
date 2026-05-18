import { useCallback, useEffect, useState } from 'react';
import { fetchCompanies } from '../../api/companies.js';
import { deleteEodEntry, fetchEodEntries } from '../../api/eodEntries.js';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import Table from '../../components/Table.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { exportToCsv } from '../../utils/reportHelpers.js';
import EodForm from './EodForm.jsx';

const EOD_EXPORT_COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'company', label: 'Company' },
  { key: 'jobType', label: 'Job Type' },
  { key: 'route', label: 'Route' },
  { key: 'driver', label: 'Driver' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'plannedTrips', label: 'Planned Trips' },
  { key: 'actualTrips', label: 'Actual Trips' },
  { key: 'ratePerTrip', label: 'Rate Per Trip' },
  { key: 'extraCharges', label: 'Extra Charges' },
  { key: 'deductions', label: 'Deductions' },
  { key: 'dieselFuel', label: 'Diesel/Fuel' },
  { key: 'expense', label: 'Expense' },
  { key: 'totalAmount', label: 'Total Amount' },
  { key: 'billingStatus', label: 'Billing Status' },
  { key: 'approved', label: 'Approved' },
  { key: 'approver', label: 'Approved By' },
  { key: 'startTime', label: 'Start Time' },
  { key: 'endTime', label: 'End Time' },
  { key: 'remarks', label: 'Remarks' },
];

const buildEodExportRows = (entries) =>
  entries.map((e) => ({
    date: e.date || '',
    company: e.company?.companyName || '',
    jobType: e.jobType?.name || '',
    route: e.routeLabel || '',
    driver: e.driverLabel || '',
    vehicle: e.vehicleLabel || '',
    plannedTrips: e.plannedTrips ?? '',
    actualTrips: e.actualTrips ?? '',
    ratePerTrip: e.ratePerTrip ?? '',
    extraCharges: e.extraCharges ?? '',
    deductions: e.deductions ?? '',
    dieselFuel: e.dieselFuel ?? '',
    expense: e.expense ?? '',
    totalAmount: e.totalAmount ?? '',
    billingStatus: e.billingStatus === 'invoiced' ? 'Invoiced' : 'Pending',
    approved: e.isApproved ? 'Yes' : 'No',
    approver: e.approverName || '',
    startTime: e.startTime || '',
    endTime: e.endTime || '',
    remarks: e.remarks || '',
  }));

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

function BillingBadge({ status }) {
  const isInvoiced = status === 'invoiced';
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isInvoiced ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-900'
      }`}
    >
      {isInvoiced ? 'Invoiced' : 'Pending'}
    </span>
  );
}

function ApprovedBadge({ approved }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        approved ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {approved ? 'Approved' : 'Pending'}
    </span>
  );
}

export default function EodList() {
  const toast = useToast();
  const confirm = useConfirm();
  const canEdit = usePermission('eod_entries', 'edit');
  const canDelete = usePermission('eod_entries', 'delete');

  const [entries, setEntries] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [companyId, setCompanyId] = useState('all');
  const [billingStatus, setBillingStatus] = useState('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchCompanies({ limit: 500, status: 'active' })
      .then((res) => setCompanies(res.data.data))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fetchEodEntries({
        from,
        to,
        companyId: companyId === 'all' ? undefined : companyId,
        billingStatus: billingStatus === 'all' ? undefined : billingStatus,
      });
      setEntries(data.data);
    } catch {
      toast.error('Failed to load EOD entries');
    } finally {
      setLoading(false);
    }
  }, [from, to, companyId, billingStatus, toast]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const handleExportCsv = () => {
    if (!entries.length) {
      toast.error('No EOD entries to export for the selected filters');
      return;
    }
    exportToCsv(`eod-entries-${from}-to-${to}.csv`, EOD_EXPORT_COLUMNS, buildEodExportRows(entries));
    toast.success('EOD data exported');
  };

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: 'Delete EOD entry',
      message: 'Delete this EOD entry? This cannot be undone.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteEodEntry(row.id);
      toast.success('EOD entry deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs text-slate-600">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">Company</label>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="min-w-[140px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">Billing</label>
          <select
            value={billingStatus}
            onChange={(e) => setBillingStatus(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="invoiced">Invoiced</option>
          </select>
        </div>
        <div className="ml-auto">
          <Button variant="secondary" onClick={handleExportCsv} disabled={loading}>
            Export CSV
          </Button>
        </div>
      </div>

      <Table
            loading={loading}
            error={loadError}
            onRetry={load}
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'driverLabel', label: 'Driver' },
            { key: 'vehicleLabel', label: 'Vehicle' },
            { key: 'company', label: 'Company' },
            { key: 'actualTrips', label: 'Actual Trips' },
            { key: 'dieselFuel', label: 'Diesel/Fuel' },
            { key: 'expense', label: 'Expense' },
            { key: 'totalAmount', label: 'Total' },
            { key: 'billingStatus', label: 'Billing' },
            { key: 'approved', label: 'Approved' },
            { key: 'actions', label: 'Actions' },
          ]}
          data={entries.map((e) => ({
            ...e,
            date: formatDate(e.date),
            company: e.company?.companyName || '—',
            dieselFuel: e.dieselFuel != null ? e.dieselFuel : '—',
            expense: e.expense != null ? formatCurrency(e.expense) : '—',
            totalAmount: formatCurrency(e.totalAmount),
            billingStatus: <BillingBadge status={e.billingStatus} />,
            approved: <ApprovedBadge approved={e.isApproved} />,
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
                {canDelete && e.billingStatus !== 'invoiced' && (
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
          }))}
        />

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title="Edit EOD Entry"
        size="lg"
      >
        {editing && (
          <EodForm
            entry={editing}
            assignment={editing.assignment}
            onCancel={() => {
              setFormOpen(false);
              setEditing(null);
            }}
            onSuccess={() => {
              setFormOpen(false);
              setEditing(null);
              load();
            }}
          />
        )}
      </Modal>
    </div>
  );
}
