import { useEffect, useState } from 'react';
import { createExpense, updateExpense } from '../../api/dailyExpenses.js';
import { fetchDrivers } from '../../api/drivers.js';
import { fetchExpenseTypes } from '../../api/expenseTypes.js';
import { fetchVehicles } from '../../api/vehicles.js';
import Button from '../../components/Button.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'upi', label: 'UPI' },
  { value: 'other', label: 'Other' },
];

export default function ExpenseForm({ expense, onSuccess, onCancel }) {
  const toast = useToast();
  const isEdit = Boolean(expense?.id);

  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);

  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [expenseTypeId, setExpenseTypeId] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVehicles()
      .then((res) => setVehicles(res.data.data))
      .catch(() => {});
    fetchDrivers()
      .then((res) => setDrivers(res.data.data))
      .catch(() => {});
    fetchExpenseTypes()
      .then((res) => setExpenseTypes(res.data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (expense) {
      setExpenseDate(expense.expenseDate?.slice(0, 10) || '');
      setVehicleId(String(expense.vehicleId || ''));
      setDriverId(expense.driverId ? String(expense.driverId) : '');
      setExpenseTypeId(String(expense.expenseTypeId || ''));
      setAmount(String(expense.amount ?? ''));
      setPaidBy(expense.paidBy || '');
      setPaymentMode(expense.paymentMode || 'cash');
      setNotes(expense.notes || '');
    }
  }, [expense]);

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('expenseDate', expenseDate);
    fd.append('vehicleId', vehicleId);
    if (driverId) fd.append('driverId', driverId);
    fd.append('expenseTypeId', expenseTypeId);
    fd.append('amount', amount);
    fd.append('paidBy', paidBy);
    fd.append('paymentMode', paymentMode);
    if (notes) fd.append('notes', notes);
    if (receipt) fd.append('receipt', receipt);
    return fd;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vehicleId || !expenseTypeId || !amount || !paidBy) {
      toast.error('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const fd = buildFormData();
      if (isEdit) {
        await updateExpense(expense.id, fd);
        toast.success('Expense updated');
      } else {
        await createExpense(fd);
        toast.success('Expense created');
      }
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            className="input-field"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Vehicle <span className="text-red-500">*</span>
          </label>
          <select
            className="input-field"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            required
          >
            <option value="">Select vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vehicleNumber}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Driver</label>
          <select className="input-field" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
            <option value="">None</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Expense Type <span className="text-red-500">*</span>
          </label>
          <select
            className="input-field"
            value={expenseTypeId}
            onChange={(e) => setExpenseTypeId(e.target.value)}
            required
          >
            <option value="">Select type</option>
            {expenseTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Amount <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input-field"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Paid By <span className="text-red-500">*</span>
          </label>
          <input
            className="input-field"
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Payment Mode <span className="text-red-500">*</span>
          </label>
          <select
            className="input-field"
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
          >
            {PAYMENT_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Receipt (image or PDF)</label>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="text-sm"
          onChange={(e) => setReceipt(e.target.files?.[0] || null)}
        />
        {isEdit && expense?.receiptPath && !receipt && (
          <a
            href={expense.receiptPath}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block text-sm text-blue-600 hover:underline"
          >
            View current receipt
          </a>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
        <textarea
          rows={2}
          className="input-field"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : isEdit ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
