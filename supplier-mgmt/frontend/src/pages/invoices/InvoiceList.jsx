import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchCompanies } from '../../api/companies.js';
import { deleteInvoice, downloadInvoicePdf, fetchInvoices } from '../../api/invoices.js';
import Button from '../../components/Button.jsx';
import Table from '../../components/Table.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const STATUS_CLASS = {
  draft: 'bg-slate-100 text-slate-700',
  generated: 'bg-blue-100 text-blue-800',
  sent: 'bg-indigo-100 text-indigo-800',
  paid: 'bg-green-100 text-green-800',
  partially_paid: 'bg-yellow-100 text-yellow-900',
  cancelled: 'bg-red-100 text-red-800',
};

function StatusBadge({ status }) {
  const label = status?.replace(/_/g, ' ') || status;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_CLASS[status] || STATUS_CLASS.draft}`}
    >
      {label}
    </span>
  );
}

export default function InvoiceList() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const canView = usePermission('invoices', 'view');
  const canGenerate = usePermission('invoices', 'generate_invoice');
  const canEdit = usePermission('invoices', 'edit');
  const canDelete = usePermission('invoices', 'delete');
  const canPrint = usePermission('invoices', 'print');

  const [invoices, setInvoices] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [companyId, setCompanyId] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');

  useEffect(() => {
    fetchCompanies({ limit: 500, status: 'active', companyType: 'customer' })
      .then((res) => setCompanies(res.data?.data ?? []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await fetchInvoices({
        from,
        to,
        companyId: companyId === 'all' ? undefined : companyId,
        paymentStatus: paymentStatus === 'all' ? undefined : paymentStatus,
        limit: 50,
      });
      setInvoices(data.data ?? []);
    } catch {
      setLoadError('Failed to load invoices.');
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [canView, from, to, companyId, paymentStatus, toast]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const handleDownload = async (row) => {
    setDownloadingId(row.id);
    try {
      const { data } = await downloadInvoicePdf(row.id);
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${row.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (row) => {
    if (deletingId != null) return;
    const hasPayments = ['paid', 'partially_paid'].includes(row.paymentStatus);
    const ok = await confirm({
      title: 'Delete invoice',
      message: hasPayments
        ? `Delete invoice ${row.invoiceNumber}? All recorded payments on this invoice will be removed and linked EOD trips will return to pending billing. This cannot be undone.`
        : `Delete invoice ${row.invoiceNumber}? Linked EOD trips will return to pending billing. This cannot be undone.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    setDeletingId(row.id);
    try {
      await deleteInvoice(row.id);
      toast.success('Invoice deleted');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete invoice');
    } finally {
      setDeletingId(null);
    }
  };

  if (!canView) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        You do not have permission to view invoices.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="mt-1 text-sm text-slate-600">Billing and payment tracking</p>
        </div>
        {canGenerate && (
          <Button onClick={() => navigate('/invoices/generate')}>Generate Invoice</Button>
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
          <label className="mb-1 block text-xs text-slate-600">Status</label>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="generated">Generated</option>
            <option value="sent">Sent</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table
            loading={loading}
            error={loadError}
            onRetry={load}
            columns={[
              { key: 'invoiceNumber', label: 'Invoice Number' },
              { key: 'invoiceDate', label: 'Date' },
              { key: 'company', label: 'Bill To' },
              { key: 'grandTotal', label: 'Grand Total' },
              { key: 'paymentStatus', label: 'Payment Status' },
              { key: 'actions', label: 'Actions' },
            ]}
            data={invoices.map((inv) => ({
              ...inv,
              invoiceDate: formatDate(inv.invoiceDate),
              company: inv.billToLabel || inv.company?.companyName || '—',
              grandTotal: formatCurrency(inv.grandTotal),
              paymentStatus: <StatusBadge status={inv.paymentStatus} />,
              actions: (
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/invoices/${inv.id}`}
                    className="text-sm font-medium text-slate-700 hover:text-slate-900"
                  >
                    View
                  </Link>
                  {canEdit && !['paid', 'cancelled'].includes(inv.paymentStatus) && (
                    <Link
                      to={`/invoices/${inv.id}/edit`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Edit
                    </Link>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                      disabled={deletingId === inv.id}
                      onClick={() => handleDelete(inv)}
                    >
                      {deletingId === inv.id ? 'Deleting…' : 'Delete'}
                    </button>
                  )}
                  {canPrint && (
                    <button
                      type="button"
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      disabled={downloadingId === inv.id}
                      onClick={() => handleDownload(inv)}
                    >
                      {downloadingId === inv.id ? '…' : 'PDF'}
                    </button>
                  )}
                </div>
              ),
            }))}
          />
      </div>
    </div>
  );
}
