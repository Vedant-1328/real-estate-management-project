import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCompanies } from '../../api/companies.js';
import { createInvoice, fetchPendingEod } from '../../api/invoices.js';
import Button from '../../components/Button.jsx';
import CustomerCompanyPicker from '../../components/CustomerCompanyPicker.jsx';
import FormSection from '../../components/FormSection.jsx';
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
  const [ownCompanies, setOwnCompanies] = useState([]);
  const [customerCompanies, setCustomerCompanies] = useState([]);
  const [issuerCompanyId, setIssuerCompanyId] = useState('');
  const [billToCompanyId, setBillToCompanyId] = useState('');
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
    fetchCompanies({ limit: 500, status: 'active', companyType: 'own' })
      .then((res) => setOwnCompanies(res.data?.data ?? []))
      .catch(() => {});
    fetchCompanies({ limit: 500, status: 'active', companyType: 'customer' })
      .then((res) => setCustomerCompanies(res.data?.data ?? []))
      .catch(() => {});
  }, []);

  const hasPeriodFilter = Boolean(from && to);

  const periodLabel = useMemo(() => {
    if (from && to) return `${formatDate(from)} – ${formatDate(to)}`;
    if (from) return `from ${formatDate(from)}`;
    if (to) return `through ${formatDate(to)}`;
    return 'all pending (no date filter)';
  }, [from, to]);

  useEffect(() => {
    if (
      billToCompanyId &&
      issuerCompanyId &&
      String(billToCompanyId) === String(issuerCompanyId)
    ) {
      setBillToCompanyId('');
      setBillToName('');
      setBillToAddress('');
      setBillToGst('');
    }
  }, [issuerCompanyId, billToCompanyId]);

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

  const handleBillToCompanyChange = (company) => {
    if (!company) {
      setBillToCompanyId('');
      setBillToName('');
      setBillToAddress('');
      setBillToGst('');
      return;
    }
    setBillToCompanyId(String(company.id));
    setBillToName(company.companyName || '');
    setBillToAddress(company.billingAddress || '');
    setBillToGst(company.gstNumber || '');
  };

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

  const resolveBillingPeriod = () => {
    if (from && to) return { billingPeriodFrom: from, billingPeriodTo: to };
    const dates = entries
      .filter((e) => selected.has(e.id))
      .map((e) => String(e.date ?? '').slice(0, 10))
      .filter(Boolean)
      .sort();
    if (!dates.length) return null;
    return { billingPeriodFrom: dates[0], billingPeriodTo: dates[dates.length - 1] };
  };

  const fetchEntries = async () => {
    if (!issuerCompanyId || !billToCompanyId || !billToName.trim()) {
      toast.error('Select bill-from company and customer from master');
      return;
    }
    if ((from && !to) || (!from && to)) {
      toast.error('Set both period from and period to, or leave both empty');
      return;
    }
    setLoading(true);
    try {
      const params = { companyId: billToCompanyId };
      if (from && to) {
        params.from = from;
        params.to = to;
      }
      const { data } = await fetchPendingEod(params);
      setEntries(data.data ?? []);
      initLineRates(data.data ?? []);
      setSelected(new Set((data.data ?? []).map((e) => e.id)));
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
      const period = resolveBillingPeriod();
      if (!period) {
        toast.error('Could not determine billing period from selected entries');
        setSubmitting(false);
        return;
      }

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
        billingPeriodFrom: period.billingPeriodFrom,
        billingPeriodTo: period.billingPeriodTo,
        eodEntryIds: Array.from(selected),
        lineItems,
        subtotal: Number(subtotalInput) || 0,
        extraCharges: Number(extraCharges) || 0,
        discountPercent: Number(discountPercent) || 0,
        cgstRate: Number(cgstRate) || 0,
        sgstRate: Number(sgstRate) || 0,
        notes: notes || null,
      });
      if (!data.data?.id) {
        toast.error('Invoice created but response was incomplete');
        navigate('/invoices');
        return;
      }
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

      <ol className="flex flex-wrap gap-2 text-sm">
        {[
          { n: 1, label: 'Bill from & customer' },
          { n: 2, label: 'Select EOD trips' },
          { n: 3, label: 'Totals & tax' },
        ].map(({ n, label }) => (
          <li
            key={n}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${
              step === n
                ? 'bg-slate-800 font-medium text-white shadow-sm'
                : step > n
                  ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80'
                  : 'bg-slate-100 text-slate-600'
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                step === n ? 'bg-white/20' : step > n ? 'bg-emerald-200' : 'bg-slate-200'
              }`}
            >
              {step > n ? '✓' : n}
            </span>
            {label}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className="max-w-3xl space-y-4">
          <FormSection
            title="Your company (bill from)"
            description="The company that issues this invoice — your bank details appear on the PDF."
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Generating company <span className="text-red-500">*</span>
              </label>
              <select
                className="input-field w-full"
                value={issuerCompanyId}
                onChange={(e) => setIssuerCompanyId(e.target.value)}
              >
                <option value="">Select your company</option>
                {ownCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>
          </FormSection>

          <FormSection
            title="Customer (bill to)"
            description="Pick the customer from Companies master. Address and GSTIN are filled from the master record (you can edit below)."
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Customer company <span className="text-red-500">*</span>
              </label>
              <CustomerCompanyPicker
                companies={customerCompanies}
                value={billToCompanyId}
                onChange={handleBillToCompanyChange}
                excludeCompanyId={issuerCompanyId}
              />
              <p className="mt-1 text-xs text-slate-500">
                Linked to Companies master — add new customers under Companies if not listed.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
                <textarea
                  rows={2}
                  className="input-field w-full"
                  placeholder="Optional"
                  value={billToAddress}
                  onChange={(e) => setBillToAddress(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Customer GSTIN (bill to)
                </label>
                <input
                  type="text"
                  className="input-field w-full"
                  placeholder="Optional"
                  value={billToGst}
                  onChange={(e) => setBillToGst(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Period from <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  type="date"
                  className="input-field w-full"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Period to <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  type="date"
                  className="input-field w-full"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Leave both dates empty to load all uninvoiced EOD entries for this customer. Set both
              to restrict trips to that date range.
            </p>
          </FormSection>

          <div className="flex justify-end">
            <Button onClick={fetchEntries} disabled={loading}>
              {loading ? 'Loading trips…' : 'Continue — load EOD entries'}
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">
                Bill to: <span className="text-slate-600">{billToName}</span>
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {selected.size} of {entries.length} selected for <strong>{billToName}</strong>
                {' · '}
                {periodLabel} — Subtotal:{' '}
                <strong>{formatCurrency(calculatedSubtotal)}</strong>
              </p>
            </div>
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
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
              <p className="text-sm font-medium text-slate-800">No pending EOD trips for this customer</p>
              <p className="mt-1 text-sm text-slate-600">
                Customer: <strong>{billToName}</strong>
                {hasPeriodFilter ? (
                  <>
                    {' '}
                    · {formatDate(from)} to {formatDate(to)}
                  </>
                ) : (
                  <> · all pending dates</>
                )}
              </p>
              <ul className="mx-auto mt-3 max-w-md list-inside list-disc text-left text-xs text-slate-600">
                <li>Only uninvoiced entries for this customer are listed</li>
                {hasPeriodFilter ? (
                  <li>Date range must include each selected EOD trip date</li>
                ) : (
                  <li>No date filter — every pending trip for this customer is shown</li>
                )}
                <li>Billing status on the EOD must still be <strong>Pending</strong> (not invoiced)</li>
              </ul>
              <p className="mt-4 text-xs text-slate-500">
                Add or check trips under <strong>EOD Entries</strong>, then load again.
              </p>
            </div>
          ) : (
            <Table
              columns={[
                { key: 'pick', label: '' },
                { key: 'date', label: 'Date' },
                { key: 'linkedCompany', label: 'Site company' },
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
