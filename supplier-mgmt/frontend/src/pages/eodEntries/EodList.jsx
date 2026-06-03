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
  { key: 'route', label: 'Route' },
  { key: 'driver', label: 'Driver' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'jobType', label: 'Job Type' },
  { key: 'company', label: 'Company' },
  { key: 'trips', label: 'Trips' },
  { key: 'amount', label: 'Amount' },
  { key: 'billingStatus', label: 'Billing' },
  { key: 'approved', label: 'Approved' },
  { key: 'endTime', label: 'End Time' },
  { key: 'remarks', label: 'Remarks' },
];

const buildEodExportRows = (entries) =>
  entries.map((e) => ({
    date: e.date || '',
    route: e.routeLabel || '',
    driver: e.driverLabel || '',
    vehicle: e.vehicleLabel || '',
    jobType: e.jobType?.name || '',
    company: e.company?.companyName || '',
    trips: e.actualTrips ?? '',
    amount: e.totalAmount ?? '',
    billingStatus: e.billingStatus === 'invoiced' ? 'Invoiced' : 'Pending',
    approved: e.isApproved ? 'Yes' : 'No',
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

function truncateText(text, max = 48) {
  if (!text?.trim()) return null;
  const value = text.trim();
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function RemarksCell({ remarks }) {
  if (!remarks?.trim()) {
    return <span className="text-slate-400">—</span>;
  }
  const preview = truncateText(remarks, 48);
  return (
    <span className="block max-w-[12rem] truncate text-sm text-slate-700" title={remarks.trim()}>
      {preview}
    </span>
  );
}

function DetailRow({ label, children }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 text-sm">
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="text-slate-900">{children}</dd>
    </div>
  );
}

function EodDetailModal({ entry, open, onClose, onEdit, canEdit }) {
  if (!entry) return null;

  const expenseLabel =
    entry.expense != null && entry.expense > 0
      ? `${entry.expenseType?.name || 'Expense'} · ${formatCurrency(entry.expense)}`
      : null;

  return (
    <Modal open={open} onClose={onClose} title="EOD Entry Details" size="lg">
      <dl className="space-y-3">
        <DetailRow label="Date">{formatDate(entry.date)}</DetailRow>
        <DetailRow label="Route">{entry.routeLabel || '—'}</DetailRow>
        <DetailRow label="Driver">{entry.driverLabel || '—'}</DetailRow>
        <DetailRow label="Vehicle">{entry.vehicleLabel || '—'}</DetailRow>
        <DetailRow label="Job type">{entry.jobType?.name || '—'}</DetailRow>
        <DetailRow label="Company">{entry.company?.companyName || '—'}</DetailRow>
        <DetailRow label="Trips">{entry.actualTrips ?? '—'}</DetailRow>
        <DetailRow label="Amount">{formatCurrency(entry.totalAmount)}</DetailRow>
        <DetailRow label="Billing">
          <BillingBadge status={entry.billingStatus} />
        </DetailRow>
        <DetailRow label="Approved">
          <ApprovedBadge approved={entry.isApproved} />
        </DetailRow>
        {entry.dieselFuel != null && entry.dieselFuel > 0 && (
          <DetailRow label="Diesel/Fuel">{formatCurrency(entry.dieselFuel)}</DetailRow>
        )}
        {expenseLabel && <DetailRow label="Expense">{expenseLabel}</DetailRow>}
        {(entry.startTime || entry.endTime) && (
          <DetailRow label="Time">
            {[entry.startTime, entry.endTime].filter(Boolean).join(' – ') || '—'}
          </DetailRow>
        )}
      </dl>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <p className="text-sm font-medium text-slate-700">Remarks</p>
        {entry.remarks?.trim() ? (
          <p className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
            {entry.remarks.trim()}
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-400">No remarks for this entry.</p>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
        {canEdit && (
          <Button
            type="button"
            onClick={() => {
              onClose();
              onEdit?.(entry);
            }}
          >
            Edit entry
          </Button>
        )}
      </div>
    </Modal>
  );
}

export default function EodList() {
  const toast = useToast();
  const confirm = useConfirm();
  const canAdd = usePermission('eod_entries', 'add');
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
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    fetchCompanies({ limit: 500, status: 'active', companyType: 'customer' })
      .then((res) => setCompanies(res.data?.data ?? []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await fetchEodEntries({
        from,
        to,
        companyId: companyId === 'all' ? undefined : companyId,
        billingStatus: billingStatus === 'all' ? undefined : billingStatus,
      });
      setEntries(data.data ?? []);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load EOD entries';
      setLoadError(message);
      toast.error(message);
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
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
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
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={handleExportCsv} disabled={loading}>
            Export CSV
          </Button>
          {canAdd && (
            <Button
              onClick={() => {
                setEditing(null);
                setCreating(true);
                setFormOpen(true);
              }}
            >
              + Afternoon EOD Entry
            </Button>
          )}
        </div>
      </div>

      {!loading && !loadError && entries.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-700">No EOD entries for this period</p>
          <p className="mt-1 text-xs text-slate-500">
            Adjust filters or add an afternoon entry for today.
          </p>
          {canAdd && (
            <Button
              className="mt-4"
              onClick={() => {
                setEditing(null);
                setCreating(true);
                setFormOpen(true);
              }}
            >
              + Afternoon EOD Entry
            </Button>
          )}
        </div>
      )}

      {(loading || loadError || entries.length > 0) && (
      <Table
            loading={loading}
            error={loadError}
            onRetry={load}
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'routeLabel', label: 'Route' },
            { key: 'driverLabel', label: 'Driver' },
            { key: 'vehicleLabel', label: 'Vehicle' },
            { key: 'jobType', label: 'Job Type' },
            { key: 'company', label: 'Company' },
            { key: 'actualTrips', label: 'Trips' },
            { key: 'totalAmount', label: 'Amount' },
            { key: 'billingStatus', label: 'Billing' },
            { key: 'approved', label: 'Approved' },
            { key: 'remarks', label: 'Remarks' },
            { key: 'actions', label: '' },
          ]}
          data={entries.map((e) => ({
            ...e,
            date: formatDate(e.date),
            routeLabel: e.routeLabel || '—',
            company: e.company?.companyName || '—',
            jobType: e.jobType?.name || '—',
            actualTrips: e.actualTrips ?? '—',
            totalAmount: formatCurrency(e.totalAmount),
            billingStatus: <BillingBadge status={e.billingStatus} />,
            approved: <ApprovedBadge approved={e.isApproved} />,
            remarks: <RemarksCell remarks={e.remarks} />,
            actions: (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-sm font-medium text-slate-700 hover:text-slate-900"
                  onClick={() => setViewing(e)}
                >
                  View
                </button>
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
      )}

      <EodDetailModal
        entry={viewing}
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        canEdit={canEdit}
        onEdit={(entry) => {
          setEditing(entry);
          setFormOpen(true);
        }}
      />

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
          setCreating(false);
        }}
        title={creating ? 'Afternoon EOD Entry' : 'Edit EOD Entry'}
        size="xl"
      >
        {(editing || creating) && (
          <EodForm
            entry={editing}
            onCancel={() => {
              setFormOpen(false);
              setEditing(null);
              setCreating(false);
            }}
            onSuccess={() => {
              setFormOpen(false);
              setEditing(null);
              setCreating(false);
              load();
            }}
          />
        )}
      </Modal>
    </div>
  );
}
