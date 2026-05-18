import { useCallback, useEffect, useState } from 'react';
import { deleteDriverAdvance, fetchDriverAdvances } from '../../api/driverAdvances.js';
import { fetchDrivers } from '../../api/drivers.js';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import Table from '../../components/Table.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import AdvanceForm from './AdvanceForm.jsx';

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MODE_CLASS = {
  cash: 'bg-green-100 text-green-800',
  bank: 'bg-blue-100 text-blue-800',
  upi: 'bg-purple-100 text-purple-800',
  other: 'bg-slate-100 text-slate-700',
};

function StatusBadge({ status }) {
  const cls =
    status === 'deducted' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}

function PaymentBadge({ mode }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${MODE_CLASS[mode] || MODE_CLASS.other}`}
    >
      {mode}
    </span>
  );
}

export default function AdvanceList() {
  const toast = useToast();
  const confirm = useConfirm();
  const canView = usePermission('driver_advances', 'view');
  const canAdd = usePermission('driver_advances', 'add');
  const canEdit = usePermission('driver_advances', 'edit');
  const canDelete = usePermission('driver_advances', 'delete');
  const now = new Date();

  const [advances, setAdvances] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [driverId, setDriverId] = useState('all');
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchDrivers()
      .then((res) => setDrivers(res.data.data))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const { data } = await fetchDriverAdvances({
        driverId: driverId === 'all' ? undefined : driverId,
        month: month || undefined,
        year: year || undefined,
        status: status === 'all' ? undefined : status,
        search: search || undefined,
      });
      setAdvances(data.data);
    } catch {
      toast.error('Failed to load advances');
    } finally {
      setLoading(false);
    }
  }, [canView, driverId, month, year, status, search, toast]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: 'Delete advance',
      message: 'Delete this advance? This cannot be undone.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteDriverAdvance(row.id);
      toast.success('Advance deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  if (!canView) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        You do not have permission to view driver advances.
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        {canAdd && (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Record Advance
          </Button>
        )}
      </header>

      <fieldset className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-xs text-slate-600">
          Driver
          <select
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            className="mt-1 block min-w-[140px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-600">
          Month
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {MONTHS.slice(1).map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-600">
          Year
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="mt-1 block w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs text-slate-600">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="deducted">Deducted</option>
          </select>
        </label>
        <label className="text-xs text-slate-600">
          Search
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or mobile"
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </fieldset>

      <Table
            loading={loading}
            error={loadError}
            onRetry={load}
          columns={[
            { key: 'advanceDate', label: 'Date' },
            { key: 'driver', label: 'Driver' },
            { key: 'amount', label: 'Amount' },
            { key: 'givenBy', label: 'Given By' },
            { key: 'paymentMode', label: 'Mode' },
            { key: 'period', label: 'Salary Period' },
            { key: 'status', label: 'Status' },
            { key: 'actions', label: 'Actions' },
          ]}
          data={advances.map((a) => ({
            ...a,
            advanceDate: formatDate(a.advanceDate),
            driver: a.driverName || a.driver?.name || '—',
            amount: formatCurrency(a.amount),
            paymentMode: <PaymentBadge mode={a.paymentMode} />,
            period: `${MONTHS[a.salaryPeriodMonth] || a.salaryPeriodMonth} ${a.salaryPeriodYear}`,
            status: <StatusBadge status={a.status} />,
            actions: (
              <span className="flex gap-2">
                {canEdit && (
                  <button
                    type="button"
                    className="text-sm font-medium text-slate-700"
                    onClick={() => {
                      setEditing(a);
                      setFormOpen(true);
                    }}
                  >
                    Edit
                  </button>
                )}
                {canDelete && a.status === 'pending' && (
                  <button
                    type="button"
                    className="text-sm font-medium text-red-600"
                    onClick={() => handleDelete(a)}
                  >
                    Delete
                  </button>
                )}
              </span>
            ),
          }))}
        />

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Edit Advance' : 'Record Advance'}
        size="lg"
      >
        <AdvanceForm
          advance={editing}
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
      </Modal>
    </section>
  );
}
