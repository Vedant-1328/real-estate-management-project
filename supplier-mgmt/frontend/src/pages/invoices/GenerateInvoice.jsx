import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCompanies } from '../../api/companies.js';
import { createInvoice, fetchPendingEod } from '../../api/invoices.js';
import Button from '../../components/Button.jsx';
import Table from '../../components/Table.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

function calcLineAmount(entry, rate) {
  const trips = Number(entry.actualTrips) || 0;
  const r = Number(rate) || 0;
  const extra = Number(entry.extraCharges) || 0;
  const ded = Number(entry.deductions) || 0;
  return trips * r + extra - ded;
}

export default function GenerateInvoice() {
  const navigate = useNavigate();
  const toast = useToast();
  const canGenerate = usePermission('invoices', 'generate_invoice');

  const [step, setStep] = useState(1);
  const [companies, setCompanies] = useState([]);
  const [issuerCompanyId, setIssuerCompanyId] = useState('');
  const [billToName, setBillToName] = useState('');
  const [billToAddress, setBillToAddress] = useState('');
  const [billToGst, setBillToGst] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [entries, setEntries] = useState([]);
  const [lineRates, setLineRates] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [subtotalInput, setSubtotalInput] = useState('0');
  const [extraCharges, setExtraCharges] = useState('0');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [cgstRate, setCgstRate] = useState('0');
  const [sgstRate, setSgstRate] = useState('0');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setFrom(today);
    setTo(today);
    fetchCompanies({ limit: 500, status: 'active' })
      .then((res) => setCompanies(res.data.data))
      .catch(() => {});
  }, []);

  const calculatedSubtotal = useMemo(() => {
    return entries
      .filter((e) => selected.has(e.id))
      .reduce((s, e) => {
        const line = lineRates[e.id];
        const amount = line?.amount != null && line.amount !== '' ? Number(line.amount) : e.amount || 0;
        return s + amount;
      }, 0);
  }, [entries, selected, lineRates]);

  const initLineRates = (list) => {
    const next = {};
    list.forEach((e) => {
      const rate = e.ratePerTrip != null ? String(e.ratePerTrip) : '';
      next[e.id] = {
        rate,
        amount: String(e.amount ?? calcLineAmount(e, rate)),
      };
    });
    setLineRates(next);
  };

  const updateLineRate = (entry, rateStr) => {
    const amount = calcLineAmount(entry, rateStr);
    setLineRates((prev) => ({
      ...prev,
      [entry.id]: { rate: rateStr, amount: String(amount) },
    }));
  };

  const subtotal = useMemo(() => Number(subtotalInput) || 0, [subtotalInput]);

  useEffect(() => {
    if (step === 3) {
      setSubtotalInput(String(calculatedSubtotal));
    }
  }, [step, calculatedSubtotal]);

  const breakdown = useMemo(() => {
    const sub = subtotal;
    const extra = Number(extraCharges) || 0;
    const discPct = Number(discountPercent) || 0;
    const cgstPct = Number(cgstRate) || 0;
    const sgstPct = Number(sgstRate) || 0;
    const discountAmount = (sub * discPct) / 100;
    const taxable = sub + extra - discountAmount;
    const cgstAmount = (taxable * cgstPct) / 100;
    const sgstAmount = (taxable * sgstPct) / 100;
    const taxAmount = cgstAmount + sgstAmount;
    const grandTotal = taxable + taxAmount;
    return {
      sub,
      extra,
      discountAmount,
      discPct,
      taxable,
      cgstPct,
      sgstPct,
      cgstAmount,
      sgstAmount,
      taxAmount,
      grandTotal,
    };
  }, [subtotal, extraCharges, discountPercent, cgstRate, sgstRate]);

  const fetchEntries = async () => {
    if (!issuerCompanyId || !billToName.trim() || !from || !to) {
      toast.error('Enter bill-from company, bill-to name, and billing period');
      return;
    }
    setLoading(true);
    try {
      const { data } = await fetchPendingEod({ from, to });
      setEntries(data.data);
      initLineRates(data.data);
      setSelected(new Set(data.data.map((e) => e.id)));
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch entries');
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (selected.size === 0) {
      toast.error('Select at least one EOD entry');
      return;
    }
    setSubmitting(true);
    try {
      const lineItems = Array.from(selected).map((id) => {
        const entry = entries.find((e) => e.id === id);
        const line = lineRates[id] || {};
        return {
          eodEntryId: id,
          ratePerTrip: line.rate !== '' ? Number(line.rate) : 0,
          amount:
            line.amount !== '' && line.amount != null
              ? Number(line.amount)
              : calcLineAmount(entry, line.rate),
        };
      });

      const { data } = await createInvoice({
        issuerCompanyId: Number(issuerCompanyId),
        billToName: billToName.trim(),
        billToAddress: billToAddress.trim() || null,
        billToGst: billToGst.trim() || null,
        billingPeriodFrom: from,
        billingPeriodTo: to,
        eodEntryIds: Array.from(selected),
        lineItems,
        subtotal: Number(subtotalInput) || 0,
        extraCharges: Number(extraCharges) || 0,
        discountPercent: Number(discountPercent) || 0,
        cgstRate: Number(cgstRate) || 0,
        sgstRate: Number(sgstRate) || 0,
        notes: notes || null,
      });
      toast.success('Invoice created');
      navigate(`/invoices/${data.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canGenerate) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        You do not have permission to generate invoices.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Generate Invoice</h1>
        <p className="mt-1 text-sm text-slate-600">Step {step} of 3</p>
      </div>

      <div className="flex gap-2 text-sm">
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            className={`rounded-full px-3 py-1 ${step === s ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {s === 1 ? 'Companies & Period' : s === 2 ? 'Select Entries' : 'Totals'}
          </span>
        ))}
      </div>

      {step === 1 && (
        <div className="max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Bill From (generating company) *
            </label>
            <select
              className="input-field w-full"
              value={issuerCompanyId}
              onChange={(e) => setIssuerCompanyId(e.target.value)}
            >
              <option value="">Select your company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Bill To (client company name) *
            </label>
            <input
              type="text"
              className="input-field w-full"
              placeholder="Enter client company name"
              value={billToName}
              onChange={(e) => setBillToName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Bill To Address</label>
            <textarea
              rows={2}
              className="input-field w-full"
              placeholder="Billing address (optional)"
              value={billToAddress}
              onChange={(e) => setBillToAddress(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Bill To GST</label>
            <input
              type="text"
              className="input-field w-full"
              placeholder="GST number (optional)"
              value={billToGst}
              onChange={(e) => setBillToGst(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">From *</label>
              <input
                type="date"
                className="input-field w-full"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">To *</label>
              <input
                type="date"
                className="input-field w-full"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={fetchEntries} disabled={loading}>
            {loading ? 'Fetching…' : 'Fetch Entries'}
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              {selected.size} of {entries.length} selected — Subtotal:{' '}
              <strong>{formatCurrency(calculatedSubtotal)}</strong>
              <span className="ml-2 text-slate-500">(enter rate per trip below)</span>
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={selected.size === 0}>
                Next
              </Button>
            </div>
          </div>
          {entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No pending approved EOD entries.</p>
          ) : (
            <Table
              columns={[
                { key: 'pick', label: '' },
                { key: 'date', label: 'Date' },
                { key: 'jobType', label: 'Job Type' },
                { key: 'vehicleNumber', label: 'Vehicle' },
                { key: 'driverName', label: 'Driver' },
                { key: 'route', label: 'From → To' },
                { key: 'actualTrips', label: 'Trips' },
                { key: 'rate', label: 'Rate (₹)' },
                { key: 'amount', label: 'Amount' },
              ]}
              data={entries.map((e) => {
                const line = lineRates[e.id] || { rate: '', amount: '' };
                return {
                  pick: (
                    <input
                      type="checkbox"
                      checked={selected.has(e.id)}
                      onChange={() => toggleRow(e.id)}
                    />
                  ),
                  date: formatDate(e.date),
                  route: `${e.fromSite} → ${e.toSite}`,
                  rate: (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-field w-24"
                      value={line.rate}
                      onChange={(ev) => updateLineRate(e, ev.target.value)}
                      disabled={!selected.has(e.id)}
                      placeholder="0"
                    />
                  ),
                  amount: formatCurrency(
                    line.amount !== '' && line.amount != null ? Number(line.amount) : e.amount || 0
                  ),
                  ...e,
                };
              })}
            />
          )}
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Subtotal (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-field w-full"
                value={subtotalInput}
                onChange={(e) => setSubtotalInput(e.target.value)}
              />
              {Math.abs(calculatedSubtotal - subtotal) > 0.005 && (
                <p className="mt-1 text-xs text-slate-500">
                  Selected entries total: {formatCurrency(calculatedSubtotal)}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Extra Charges (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-field w-full"
                value={extraCharges}
                onChange={(e) => setExtraCharges(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Discount (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="input-field w-full"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">CGST (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="input-field w-full"
                value={cgstRate}
                onChange={(e) => setCgstRate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">SGST (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="input-field w-full"
                value={sgstRate}
                onChange={(e) => setSgstRate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
              <textarea
                rows={3}
                className="input-field w-full"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="mb-4 font-semibold text-slate-900">Breakdown</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{formatCurrency(breakdown.sub)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Extra Charges</dt>
                <dd>{formatCurrency(breakdown.extra)}</dd>
              </div>
              <div className="flex justify-between text-red-700">
                <dt>Discount ({breakdown.discPct}%)</dt>
                <dd>-{formatCurrency(breakdown.discountAmount)}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <dt>Taxable Amount</dt>
                <dd>{formatCurrency(breakdown.taxable)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>CGST ({breakdown.cgstPct}%)</dt>
                <dd>{formatCurrency(breakdown.cgstAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>SGST ({breakdown.sgstPct}%)</dt>
                <dd>{formatCurrency(breakdown.sgstAmount)}</dd>
              </div>
              <div className="flex justify-between border-t-2 border-slate-800 pt-2 text-lg font-bold text-green-700">
                <dt>Grand Total</dt>
                <dd>{formatCurrency(breakdown.grandTotal)}</dd>
              </div>
            </dl>
            <div className="mt-6 flex gap-2">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={handleGenerate} disabled={submitting}>
                {submitting ? 'Generating…' : 'Generate Invoice'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
