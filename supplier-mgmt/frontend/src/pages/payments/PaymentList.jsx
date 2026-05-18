import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPayment, fetchPayableInvoices, fetchPayments } from '../../api/payments.js';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import Table from '../../components/Table.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

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

const MODES = [
  { value: 'all', label: 'All modes' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'upi', label: 'UPI' },
  { value: 'other', label: 'Other' },
];

function PaymentBadge({ mode }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${MODE_CLASS[mode] || MODE_CLASS.other}`}
    >
      {mode}
    </span>
  );
}

function RecordPaymentForm({ invoices, onSuccess, onCancel }) {
  const toast = useToast();
  const [invoiceId, setInvoiceId] = useState('');
  const [paymentDate, setPaymentDate] = useState(today());
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('bank');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selected = invoices.find((i) => String(i.id) === String(invoiceId));

  useEffect(() => {
    if (selected) {
      setAmount(String(selected.balanceDue));
    }
  }, [selected?.id, selected?.balanceDue]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!invoiceId) {
      toast.error('Select an invoice');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSubmitting(true);
    try {
      await createPayment({
        invoiceId: Number(invoiceId),
        paymentDate,
        amount: Number(amount),
        paymentMode,
        referenceNumber: referenceNumber || null,
        notes: notes || null,
      });
      toast.success('Payment recorded');
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Invoice *</label>
        <select
          className="input-field w-full"
          value={invoiceId}
          onChange={(e) => setInvoiceId(e.target.value)}
          required
        >
          <option value="">Select invoice</option>
          {invoices.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.invoiceNumber} — {inv.billToLabel} (due {formatCurrency(inv.balanceDue)})
            </option>
          ))}
        </select>
        {invoices.length === 0 && (
          <p className="mt-1 text-xs text-amber-700">No invoices with outstanding balance.</p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Payment Date *</label>
        <input
          type="date"
          className="input-field w-full"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Amount *</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          className="input-field w-full"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        {selected && (
          <p className="mt-1 text-xs text-slate-500">
            Balance due: {formatCurrency(selected.balanceDue)}
          </p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Payment Mode *</label>
        <select
          className="input-field w-full"
          value={paymentMode}
          onChange={(e) => setPaymentMode(e.target.value)}
        >
          {MODES.filter((m) => m.value !== 'all').map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Reference Number</label>
        <input
          className="input-field w-full"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
        <textarea
          rows={2}
          className="input-field w-full"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || invoices.length === 0}>
          {submitting ? 'Saving…' : 'Record Payment'}
        </Button>
      </div>
    </form>
  );
}

export default function PaymentList() {
  const toast = useToast();
  const canView = usePermission('payments', 'view');
  const canAdd = usePermission('payments', 'add');

  const [payments, setPayments] = useState([]);
  const [listTotal, setListTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [paymentMode, setPaymentMode] = useState('all');

  const [formOpen, setFormOpen] = useState(false);
  const [payableInvoices, setPayableInvoices] = useState([]);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await fetchPayments({
        from,
        to,
        paymentMode: paymentMode === 'all' ? undefined : paymentMode,
      });
      setPayments(data.data);
      setListTotal(data.meta?.totalAmount ?? 0);
    } catch {
      setLoadError('Failed to load payments.');
    } finally {
      setLoading(false);
    }
  }, [canView, from, to, paymentMode]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const openRecordForm = async () => {
    try {
      const { data } = await fetchPayableInvoices();
      setPayableInvoices(data.data);
      setFormOpen(true);
    } catch {
      toast.error('Failed to load invoices');
    }
  };

  if (!canView) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        You do not have permission to view payments.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
          <p className="mt-1 text-sm text-slate-600">Invoice payment receipts and collections</p>
        </div>
        {canAdd && <Button onClick={openRecordForm}>Record Payment</Button>}
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
          <label className="mb-1 block text-xs text-slate-600">Payment Mode</label>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className="min-w-[120px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <p className="text-sm font-medium text-slate-700">
            Total: <span className="text-green-700">{formatCurrency(listTotal)}</span>
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table
          loading={loading}
          error={loadError}
          onRetry={load}
          emptyMessage="No payments in this period."
          columns={[
            { key: 'paymentDate', label: 'Date' },
            { key: 'invoiceNumber', label: 'Invoice' },
            { key: 'billToLabel', label: 'Bill To' },
            { key: 'amount', label: 'Amount' },
            { key: 'paymentMode', label: 'Mode' },
            { key: 'referenceNumber', label: 'Reference' },
            { key: 'actions', label: '' },
          ]}
          data={payments.map((p) => ({
            ...p,
            paymentDate: formatDate(p.paymentDate),
            amount: formatCurrency(p.amount),
            paymentMode: <PaymentBadge mode={p.paymentMode} />,
            referenceNumber: p.referenceNumber || '—',
            actions: (
              <Link
                to={`/invoices/${p.invoiceId}`}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                View invoice
              </Link>
            ),
          }))}
        />
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Record Payment" size="md">
        <RecordPaymentForm
          invoices={payableInvoices}
          onSuccess={() => {
            setFormOpen(false);
            load();
          }}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
    </div>
  );
}
