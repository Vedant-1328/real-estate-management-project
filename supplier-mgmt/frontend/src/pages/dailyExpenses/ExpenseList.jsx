import { useCallback, useEffect, useState } from 'react';
import { deleteExpense, fetchExpenses } from '../../api/dailyExpenses.js';
import { fetchExpenseTypes } from '../../api/expenseTypes.js';
import { fetchVehicles } from '../../api/vehicles.js';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import Table from '../../components/Table.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import ExpenseForm from './ExpenseForm.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const MODE_CLASS = {
  cash: 'bg-green-100 text-green-800',
  bank: 'bg-blue-100 text-blue-800',
  upi: 'bg-purple-100 text-purple-800',
  other: 'bg-slate-100 text-slate-700',
};

function PaymentBadge({ mode }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${MODE_CLASS[mode] || MODE_CLASS.other}`}
    >
      {mode}
    </span>
  );
}

export default function ExpenseList() {
  const toast = useToast();
  const confirm = useConfirm();
  const canAdd = usePermission('daily_expenses', 'add');
  const canEdit = usePermission('daily_expenses', 'edit');
  const canDelete = usePermission('daily_expenses', 'delete');

  const [expenses, setExpenses] = useState([]);
  const [listTotal, setListTotal] = useState(0);
  const [vehicles, setVehicles] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [vehicleId, setVehicleId] = useState('all');
  const [expenseTypeId, setExpenseTypeId] = useState('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchVehicles()
      .then((res) => setVehicles(res.data?.data ?? []))
      .catch(() => {});
    fetchExpenseTypes()
      .then((res) => setExpenseTypes(res.data?.data ?? []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await fetchExpenses({
        from,
        to,
        vehicleId: vehicleId === 'all' ? undefined : vehicleId,
        expenseTypeId: expenseTypeId === 'all' ? undefined : expenseTypeId,
      });
      setExpenses(data.data ?? []);
      setListTotal(data.meta?.listTotal ?? 0);
    } catch {
      setLoadError('Failed to load expenses.');
    } finally {
      setLoading(false);
    }
  }, [from, to, vehicleId, expenseTypeId, toast]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: 'Delete expense',
      message: 'Delete this expense? This cannot be undone.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteExpense(row.id);
      toast.success('Expense deleted');
      load();
    } catch {
      toast.error('Failed to delete expense');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {canAdd && (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Add Expense
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
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
          <label className="mb-1 block text-xs text-slate-600">Vehicle</label>
          <select
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className="min-w-[120px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vehicleNumber}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">Expense Type</label>
          <select
            value={expenseTypeId}
            onChange={(e) => setExpenseTypeId(e.target.value)}
            className="min-w-[120px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            {expenseTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <>
          <Table
            loading={loading}
            error={loadError}
            onRetry={load}
            columns={[
              { key: 'expenseDate', label: 'Date' },
              { key: 'vehicle', label: 'Vehicle' },
              { key: 'driver', label: 'Driver' },
              { key: 'expenseType', label: 'Expense Type' },
              { key: 'amount', label: 'Amount' },
              { key: 'paymentMode', label: 'Payment Mode' },
              { key: 'receipt', label: 'Receipt' },
              { key: 'createdBy', label: 'Created By' },
              { key: 'actions', label: 'Actions' },
            ]}
            data={expenses.map((e) => ({
              ...e,
              expenseDate: formatDate(e.expenseDate),
              vehicle: e.vehicle?.vehicleNumber || '—',
              driver: e.driver?.name || '—',
              expenseType: e.expenseType?.name || '—',
              amount: formatCurrency(e.amount),
              paymentMode: <PaymentBadge mode={e.paymentMode} />,
              receipt: e.receiptPath ? (
                <a
                  href={e.receiptPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  View
                </a>
              ) : (
                <span className="text-slate-400">—</span>
              ),
              createdBy: e.createdByName || '—',
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
            }))}
          />
          <div className="flex justify-end rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">
              Total: <span className="text-green-700">{formatCurrency(listTotal)}</span>
            </p>
          </div>
      </>

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Edit Expense' : 'Add Expense'}
        size="lg"
      >
        <ExpenseForm
          expense={editing}
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
    </div>
  );
}
