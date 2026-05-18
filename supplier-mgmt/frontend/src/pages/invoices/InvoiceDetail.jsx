import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  cancelInvoice,
  downloadInvoicePdf,
  fetchInvoice,
  updateInvoiceStatus,
} from '../../api/invoices.js';
import Button from '../../components/Button.jsx';
import Table from '../../components/Table.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import RecordPaymentModal from './RecordPaymentModal.jsx';

const STATUS_CLASS = {
  draft: 'bg-slate-100 text-slate-700',
  generated: 'bg-blue-100 text-blue-800',
  sent: 'bg-indigo-100 text-indigo-800',
  paid: 'bg-green-100 text-green-800',
  partially_paid: 'bg-yellow-100 text-yellow-900',
  cancelled: 'bg-red-100 text-red-800',
};

export default function InvoiceDetail() {
  const { id } = useParams();
  const toast = useToast();
  const confirm = useConfirm();
  const canEdit = usePermission('invoices', 'edit');
  const canDelete = usePermission('invoices', 'delete');
  const canPrint = usePermission('invoices', 'print');
  const canPay = usePermission('payments', 'add');

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fetchInvoice(id);
      setInvoice(data.data);
    } catch {
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownload = async () => {
    setPdfLoading(true);
    try {
      const { data } = await downloadInvoicePdf(id);
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleMarkSent = async () => {
    try {
      await updateInvoiceStatus(id, 'sent');
      toast.success('Marked as sent');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleCancel = async () => {
    const ok = await confirm({
      title: 'Cancel invoice',
      message: 'Cancel this invoice? EOD entries will return to pending billing.',
      confirmLabel: 'Cancel invoice',
    });
    if (!ok) return;
    try {
      await cancelInvoice(id);
      toast.success('Invoice cancelled');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  if (loading) {
    return <p className="py-12 text-center text-sm text-slate-500">Loading…</p>;
  }

  if (!invoice) {
    return <p className="py-12 text-center text-sm text-red-600">Invoice not found</p>;
  }

  const paidTotal = (invoice.payments || []).reduce((s, p) => s + p.amount, 0);
  const statusClass = STATUS_CLASS[invoice.paymentStatus] || STATUS_CLASS.draft;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/invoices" className="text-sm text-blue-600 hover:underline">
            ← Back to invoices
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{invoice.invoiceNumber}</h1>
          <p className="text-sm text-slate-600">
            Bill from: {invoice.issuerCompany?.companyName || '—'} → Bill to:{' '}
            {invoice.billToLabel || '—'}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${statusClass}`}>
          {invoice.paymentStatus?.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-slate-500">Invoice Date</p>
          <p className="font-medium">{formatDate(invoice.invoiceDate)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Billing Period</p>
          <p className="font-medium">
            {formatDate(invoice.billingPeriodFrom)} — {formatDate(invoice.billingPeriodTo)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Grand Total</p>
          <p className="font-medium text-green-700">{formatCurrency(invoice.grandTotal)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Amount Paid</p>
          <p className="font-medium">{formatCurrency(paidTotal)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-900">Line Items</h2>
        <Table
          columns={[
            { key: 'lineDate', label: 'Date' },
            { key: 'jobTypeName', label: 'Job Type' },
            { key: 'vehicleNumber', label: 'Vehicle' },
            { key: 'driverName', label: 'Driver' },
            { key: 'actualTrips', label: 'Trips' },
            { key: 'ratePerTrip', label: 'Rate' },
            { key: 'amount', label: 'Amount' },
          ]}
          data={(invoice.items || []).map((item) => ({
            ...item,
            lineDate: formatDate(item.lineDate),
            ratePerTrip: formatCurrency(item.ratePerTrip),
            amount: formatCurrency(item.amount),
          }))}
        />
      </div>

      <div className="flex justify-end">
        <dl className="w-full max-w-sm space-y-1 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatCurrency(invoice.totalAmount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Extra Charges</dt>
            <dd>{formatCurrency(invoice.extraCharges)}</dd>
          </div>
          <div className="flex justify-between text-red-700">
            <dt>Discount ({invoice.discountPercent}%)</dt>
            <dd>-{formatCurrency(invoice.discount)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1">
            <dt>Taxable Amount</dt>
            <dd>{formatCurrency(invoice.taxableAmount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>CGST ({invoice.cgstRate ?? 0}%)</dt>
            <dd>{formatCurrency(invoice.cgstAmount ?? 0)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>SGST ({invoice.sgstRate ?? 0}%)</dt>
            <dd>{formatCurrency(invoice.sgstAmount ?? 0)}</dd>
          </div>
          <div className="flex justify-between border-t-2 border-slate-800 pt-2 text-base font-bold text-green-700">
            <dt>Grand Total</dt>
            <dd>{formatCurrency(invoice.grandTotal)}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Payments</h2>
          {canPay && invoice.paymentStatus !== 'paid' && invoice.paymentStatus !== 'cancelled' && (
            <Button onClick={() => setPaymentOpen(true)}>Record Payment</Button>
          )}
        </div>
        {(invoice.payments || []).length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No payments recorded yet.</p>
        ) : (
          <Table
            columns={[
              { key: 'paymentDate', label: 'Date' },
              { key: 'amount', label: 'Amount' },
              { key: 'paymentMode', label: 'Mode' },
              { key: 'referenceNumber', label: 'Reference' },
              { key: 'notes', label: 'Notes' },
            ]}
            data={invoice.payments.map((p) => ({
              ...p,
              paymentDate: formatDate(p.paymentDate),
              amount: formatCurrency(p.amount),
              paymentMode: p.paymentMode?.toUpperCase(),
            }))}
          />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {canPrint && (
          <Button onClick={handleDownload} disabled={pdfLoading}>
            {pdfLoading ? 'Generating PDF…' : 'Download PDF'}
          </Button>
        )}
        {canEdit && ['draft', 'generated'].includes(invoice.paymentStatus) && (
          <Button variant="secondary" onClick={handleMarkSent}>
            Mark as Sent
          </Button>
        )}
        {canDelete && !['paid', 'partially_paid', 'cancelled'].includes(invoice.paymentStatus) && (
          <Button variant="danger" onClick={handleCancel}>
            Cancel Invoice
          </Button>
        )}
      </div>

      <RecordPaymentModal
        invoice={invoice}
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onSuccess={load}
      />
    </div>
  );
}
