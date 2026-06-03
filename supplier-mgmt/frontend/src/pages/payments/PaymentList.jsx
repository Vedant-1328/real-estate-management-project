import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCompanies } from '../../api/companies.js';
import {
  createPartyPayment,
  fetchPayableInvoices,
  fetchPayments,
  lookupPartyBalance,
} from '../../api/payments.js';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import Table from '../../components/Table.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import {
  PAYMENT_MODE_BADGE_CLASS,
  PAYMENT_MODE_FILTER_OPTIONS,
  PAYMENT_MODE_OPTIONS,
  formatPaymentModeLabel,
} from '../../utils/paymentModes.js';

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

function PaymentBadge({ mode }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PAYMENT_MODE_BADGE_CLASS[mode] || PAYMENT_MODE_BADGE_CLASS.other}`}
    >
      {formatPaymentModeLabel(mode)}
    </span>
  );
}

function RecordPaymentForm({ onSuccess, onCancel }) {
  const toast = useToast();
  const [partyName, setPartyName] = useState('');
  const [masterParties, setMasterParties] = useState([]);
  const [manualParties, setManualParties] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [balanceDue, setBalanceDue] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [paymentDate, setPaymentDate] = useState(today());
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('bank');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;

    const loadPartyOptions = async () => {
      try {
        const [companiesRes, payableRes] = await Promise.all([
          fetchCompanies({ limit: 500, status: 'active', companyType: 'customer' }),
          fetchPayableInvoices(),
        ]);
        if (!alive) return;

        const companies =
          companiesRes.data?.data
            ?.map((c) => c.companyName?.trim())
            .filter(Boolean) ?? [];
        const masterNames = Array.from(new Set(companies)).sort((a, b) => a.localeCompare(b));
        setMasterParties(masterNames);

        const invoiceNames =
          payableRes.data?.data
            ?.map((i) => i.billToLabel?.trim())
            .filter(Boolean) ?? [];
        const manualNames = Array.from(
          new Set(invoiceNames.filter((name) => !masterNames.includes(name)))
        ).sort((a, b) => a.localeCompare(b));
        setManualParties(manualNames);
      } catch {
        if (!alive) return;
        setMasterParties([]);
        setManualParties([]);
      }
    };

    loadPartyOptions();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const name = partyName.trim();
    if (name.length < 2) {
      setBalanceDue(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLookupLoading(true);
      try {
        const { data } = await lookupPartyBalance(name);
        setBalanceDue(data.data);
        if (data.data.found && !amount) {
          setAmount(String(data.data.balanceDue));
        }
      } catch {
        setBalanceDue(null);
      } finally {
        setLookupLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [partyName]);

  const search = partyName.trim().toLowerCase();
  const filterNames = (names) =>
    names.filter((name) => !search || name.toLowerCase().includes(search)).slice(0, 6);
  const masterMatches = filterNames(masterParties);
  const manualMatches = filterNames(manualParties);
  const hasSuggestions = masterMatches.length > 0 || manualMatches.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!partyName.trim()) {
      toast.error('Enter company or person name');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSubmitting(true);
    try {
      await createPartyPayment({
        partyName: partyName.trim(),
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
        <label className="mb-1 block text-sm font-medium text-slate-700">Company / Person *</label>
        <input
          type="text"
          className="input-field w-full"
          value={partyName}
          onChange={(e) => setPartyName(e.target.value)}
          onFocus={() => setSuggestionsOpen(true)}
          onBlur={() => setTimeout(() => setSuggestionsOpen(false), 120)}
          placeholder="Type company or person name as on invoice"
          required
        />
        {suggestionsOpen && hasSuggestions && (
          <div className="mt-2 max-h-52 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            {masterMatches.length > 0 && (
              <>
                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Master companies
                </p>
                {masterMatches.map((name) => (
                  <button
                    key={`master-${name}`}
                    type="button"
                    className="block w-full rounded px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setPartyName(name);
                      setSuggestionsOpen(false);
                    }}
                  >
                    {name}
                  </button>
                ))}
              </>
            )}
            {manualMatches.length > 0 && (
              <>
                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Manual invoice parties
                </p>
                {manualMatches.map((name) => (
                  <button
                    key={`manual-${name}`}
                    type="button"
                    className="block w-full rounded px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setPartyName(name);
                      setSuggestionsOpen(false);
                    }}
                  >
                    {name}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
        {lookupLoading && (
          <p className="mt-1 text-xs text-slate-500">Checking outstanding balance…</p>
        )}
        {!lookupLoading && balanceDue?.found && (
          <p className="mt-1 text-xs text-slate-500">
            Outstanding: {formatCurrency(balanceDue.balanceDue)} ({balanceDue.invoiceCount} invoice
            {balanceDue.invoiceCount === 1 ? '' : 's'})
          </p>
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
        {balanceDue?.found && (
          <p className="mt-1 text-xs text-slate-500">
            Balance due: {formatCurrency(balanceDue.balanceDue)}
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
          {PAYMENT_MODE_OPTIONS.map((m) => (
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
        <Button type="submit" disabled={submitting}>
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
      setPayments(data.data ?? []);
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

  const openRecordForm = () => setFormOpen(true);

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
            {PAYMENT_MODE_FILTER_OPTIONS.map((m) => (
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
