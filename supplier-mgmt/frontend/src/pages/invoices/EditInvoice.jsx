import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchCompanies } from '../../api/companies.js';
import { fetchInvoice, updateInvoice } from '../../api/invoices.js';
import Button from '../../components/Button.jsx';
import CustomerCompanyPicker from '../../components/CustomerCompanyPicker.jsx';
import FormSection from '../../components/FormSection.jsx';
import Table from '../../components/Table.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

export default function EditInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const canEdit = usePermission('invoices', 'edit');

  const [ownCompanies, setOwnCompanies] = useState([]);
  const [customerCompanies, setCustomerCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issuerCompanyId, setIssuerCompanyId] = useState('');
  const [billToCompanyId, setBillToCompanyId] = useState('');
  const [billToName, setBillToName] = useState('');
  const [billToAddress, setBillToAddress] = useState('');
  const [billToGst, setBillToGst] = useState('');
  const [billingPeriodFrom, setBillingPeriodFrom] = useState('');
  const [billingPeriodTo, setBillingPeriodTo] = useState('');
  const [lineRates, setLineRates] = useState({});
  const [subtotalInput, setSubtotalInput] = useState('0');
  const [extraCharges, setExtraCharges] = useState('0');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [cgstRate, setCgstRate] = useState('0');
  const [sgstRate, setSgstRate] = useState('0');
  const [notes, setNotes] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  useEffect(() => {
    fetchCompanies({ limit: 500, status: 'active', companyType: 'own' })
      .then((res) => setOwnCompanies(res.data?.data ?? []))
      .catch(() => {});
    fetchCompanies({ limit: 500, status: 'active', companyType: 'customer' })
      .then((res) => setCustomerCompanies(res.data?.data ?? []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fetchInvoice(id);
      const inv = data.data;
      if (!inv) {
        toast.error('Invoice not found');
        return;
      }
      if (['paid', 'cancelled'].includes(inv.paymentStatus)) {
        toast.error('This invoice cannot be edited');
        navigate(`/invoices/${id}`, { replace: true });
        return;
      }

      setInvoiceNumber(inv.invoiceNumber);
      setPaymentStatus(inv.paymentStatus);
      setIssuerCompanyId(String(inv.issuerCompanyId || inv.issuerCompany?.id || ''));
      setBillToName(inv.billToName || inv.billToLabel || '');
      setBillToAddress(inv.billToAddress || '');
      setBillToGst(inv.billToGst || '');
      setBillingPeriodFrom(inv.billingPeriodFrom?.slice?.(0, 10) || inv.billingPeriodFrom || '');
      setBillingPeriodTo(inv.billingPeriodTo?.slice?.(0, 10) || inv.billingPeriodTo || '');
      setSubtotalInput(String(inv.totalAmount ?? 0));
      setExtraCharges(String(inv.extraCharges ?? 0));
      setDiscountPercent(String(inv.discountPercent ?? 0));
      setCgstRate(String(inv.cgstRate ?? 0));
      setSgstRate(String(inv.sgstRate ?? 0));
      setNotes(inv.notes || '');

      const lines = {};
      (inv.items || []).forEach((item) => {
        lines[item.id] = {
          rate: String(item.ratePerTrip ?? ''),
          amount: String(item.amount ?? ''),
          meta: item,
        };
      });
      setLineRates(lines);
    } catch {
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (billToCompanyId || !billToName.trim() || !customerCompanies.length) return;
    const match = customerCompanies.find(
      (c) => c.companyName?.trim().toLowerCase() === billToName.trim().toLowerCase()
    );
    if (match) setBillToCompanyId(String(match.id));
  }, [customerCompanies, billToName, billToCompanyId]);

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

  const calculatedSubtotal = useMemo(() => {
    return Object.values(lineRates).reduce((s, line) => s + (Number(line.amount) || 0), 0);
  }, [lineRates]);

  const hasLineItems = Object.keys(lineRates).length > 0;
  const subtotalMismatch =
    hasLineItems && Math.abs(calculatedSubtotal - Number(subtotalInput)) > 0.005;

  const breakdown = useMemo(() => {
    const sub = Number(subtotalInput) || 0;
    const extra = Number(extraCharges) || 0;
    const discPct = Number(discountPercent) || 0;
    const cgstPct = Number(cgstRate) || 0;
    const sgstPct = Number(sgstRate) || 0;
    const discountAmount = (sub * discPct) / 100;
    const taxable = sub + extra - discountAmount;
    const cgstAmount = (taxable * cgstPct) / 100;
    const sgstAmount = (taxable * sgstPct) / 100;
    const grandTotal = taxable + cgstAmount + sgstAmount;
    return { sub, extra, discountAmount, discPct, taxable, cgstAmount, sgstAmount, grandTotal };
  }, [subtotalInput, extraCharges, discountPercent, cgstRate, sgstRate]);

  const updateLineRate = (itemId, trips, rateStr) => {
    const tripsN = Number(trips) || 0;
    const rateN = Number(rateStr) || 0;
    const amount = tripsN * rateN;
    setLineRates((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        rate: rateStr,
        amount: String(amount),
      },
    }));
  };

  const updateLineAmount = (itemId, amountStr) => {
    setLineRates((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], amount: amountStr },
    }));
  };

  const handleSave = async () => {
    if (!issuerCompanyId || !billToCompanyId || !billToName.trim() || !billingPeriodFrom || !billingPeriodTo) {
      toast.error('Select bill-from company, customer from master, and billing period');
      return;
    }

    const lineItems = Object.entries(lineRates).map(([itemId, line]) => ({
      id: Number(itemId),
      ratePerTrip: line.rate !== '' ? Number(line.rate) : 0,
      amount: line.amount !== '' ? Number(line.amount) : 0,
    }));

    setSubmitting(true);
    try {
      await updateInvoice(id, {
        issuerCompanyId: Number(issuerCompanyId),
        billToName: billToName.trim(),
        billToAddress: billToAddress.trim() || null,
        billToGst: billToGst.trim() || null,
        billingPeriodFrom,
        billingPeriodTo,
        lineItems,
        subtotal: Number(subtotalInput) || 0,
        extraCharges: Number(extraCharges) || 0,
        discountPercent: Number(discountPercent) || 0,
        cgstRate: Number(cgstRate) || 0,
        sgstRate: Number(sgstRate) || 0,
        notes: notes || null,
      });
      toast.success('Invoice updated');
      navigate(`/invoices/${id}`);
    } catch (err) {
      const data = err.response?.data;
      const validationMsg = data?.errors?.map((e) => e.message).filter(Boolean).join('; ');
      const msg =
        validationMsg ||
        data?.message ||
        (err.response?.status === 404
          ? 'Save failed: restart the backend (npm run dev in supplier-mgmt/backend)'
          : null) ||
        'Failed to update invoice';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!canEdit) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        You do not have permission to edit invoices.
      </div>
    );
  }

  if (loading) {
    return <p className="py-12 text-center text-sm text-slate-500">Loading…</p>;
  }

  const lineEntries = Object.entries(lineRates).map(([itemId, line]) => ({
    itemId: Number(itemId),
    ...line.meta,
    line,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/invoices/${id}`} className="text-sm text-blue-600 hover:underline">
          ← Back to invoice
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Edit Invoice</h1>
        <p className="text-sm text-slate-600">
          {invoiceNumber}
          {paymentStatus && (
            <span className="ml-2 capitalize text-slate-500">
              ({paymentStatus.replace(/_/g, ' ')})
            </span>
          )}
        </p>
      </div>

      <div className="max-w-3xl space-y-4">
        <FormSection title="Your company (bill from)">
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

        <FormSection title="Customer (bill to)">
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
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
              <textarea
                rows={2}
                className="input-field w-full"
                value={billToAddress}
                onChange={(e) => setBillToAddress(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Customer GSTIN</label>
              <input
                type="text"
                className="input-field w-full"
                value={billToGst}
                onChange={(e) => setBillToGst(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Period from</label>
              <input
                type="date"
                className="input-field w-full"
                value={billingPeriodFrom}
                onChange={(e) => setBillingPeriodFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Period to</label>
              <input
                type="date"
                className="input-field w-full"
                value={billingPeriodTo}
                onChange={(e) => setBillingPeriodTo(e.target.value)}
              />
            </div>
          </div>
        </FormSection>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-900">Line items</h2>
        <Table
          columns={[
            { key: 'lineDate', label: 'Date' },
            { key: 'jobTypeName', label: 'Job Type' },
            { key: 'vehicleNumber', label: 'Vehicle' },
            { key: 'actualTrips', label: 'Trips' },
            { key: 'rate', label: 'Rate (₹)' },
            { key: 'amount', label: 'Amount (₹)' },
          ]}
          data={lineEntries.map(({ itemId, lineDate, jobTypeName, vehicleNumber, actualTrips, line }) => ({
            lineDate: formatDate(lineDate),
            jobTypeName,
            vehicleNumber,
            actualTrips,
            rate: (
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-field w-24"
                value={line.rate}
                onChange={(e) => updateLineRate(itemId, actualTrips, e.target.value)}
              />
            ),
            amount: (
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-field w-28"
                value={line.amount}
                onChange={(e) => updateLineAmount(itemId, e.target.value)}
              />
            ),
          }))}
        />
        <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
          Line total: {formatCurrency(calculatedSubtotal)}
        </p>
      </div>

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
            {subtotalMismatch && (
              <p className="mt-1 text-xs text-amber-700">
                Line items total: {formatCurrency(calculatedSubtotal)}.{' '}
                <button
                  type="button"
                  className="font-medium text-blue-600 underline hover:text-blue-800"
                  onClick={() => setSubtotalInput(String(calculatedSubtotal))}
                >
                  Use line total
                </button>
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Extra charges (₹)</label>
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
              <dt>Extra charges</dt>
              <dd>{formatCurrency(breakdown.extra)}</dd>
            </div>
            <div className="flex justify-between text-red-700">
              <dt>Discount ({breakdown.discPct}%)</dt>
              <dd>-{formatCurrency(breakdown.discountAmount)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <dt>Taxable amount</dt>
              <dd>{formatCurrency(breakdown.taxable)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>CGST</dt>
              <dd>{formatCurrency(breakdown.cgstAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>SGST</dt>
              <dd>{formatCurrency(breakdown.sgstAmount)}</dd>
            </div>
            <div className="flex justify-between border-t-2 border-slate-800 pt-2 text-lg font-bold text-green-700">
              <dt>Grand total</dt>
              <dd>{formatCurrency(breakdown.grandTotal)}</dd>
            </div>
          </dl>
          <div className="mt-6 flex gap-2">
            <Button variant="secondary" onClick={() => navigate(`/invoices/${id}`)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
