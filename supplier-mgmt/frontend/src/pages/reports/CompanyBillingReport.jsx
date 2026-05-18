import { useEffect, useState } from 'react';
import { fetchCompanies } from '../../api/companies.js';
import { fetchCompanyBillingReport } from '../../api/reports.js';
import ReportLayout from '../../components/ReportLayout.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatCurrency } from '../../utils/formatters.js';

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

export default function CompanyBillingReport() {
  const toast = useToast();
  const canView = usePermission('reports', 'view');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [companyId, setCompanyId] = useState('');
  const [companies, setCompanies] = useState([]);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    fetchCompanies().then((res) => setCompanies(res.data.data)).catch(() => {});
  }, []);

  const generate = async () => {
    setLoading(true);
    setGenerated(true);
    try {
      const { data } = await fetchCompanyBillingReport({
        from,
        to,
        companyId: companyId || undefined,
      });
      setRows(
        data.data.map((r) => ({
          ...r,
          totalInvoiced: formatCurrency(r.totalInvoiced),
          totalPaid: formatCurrency(r.totalPaid),
          outstanding: formatCurrency(r.outstanding),
          _totalInvoiced: r.totalInvoiced,
          _totalPaid: r.totalPaid,
          _outstanding: r.outstanding,
        }))
      );
      setSummary({
        companyName: 'Totals',
        totalJobs: data.summary.totalJobs,
        totalInvoiced: formatCurrency(data.summary.totalInvoiced),
        totalPaid: formatCurrency(data.summary.totalPaid),
        outstanding: formatCurrency(data.summary.totalOutstanding),
      });
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  if (!canView) {
    return <p className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">No permission.</p>;
  }

  const selectClass = 'mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm';

  return (
    <ReportLayout
      title="Company Billing Report"
      subtitle="Invoiced, paid, and outstanding by company"
      generated={generated}
      loading={loading}
      onGenerate={generate}
      exportFilename="company-billing-report.csv"
      columns={[
        { key: 'companyName', label: 'Company' },
        { key: 'totalJobs', label: 'Jobs' },
        { key: 'totalInvoiced', label: 'Invoiced' },
        { key: 'totalPaid', label: 'Paid' },
        { key: 'outstanding', label: 'Outstanding' },
      ]}
      rows={rows}
      summary={summary}
      filters={
        <>
          <label className="text-xs text-slate-600">
            From
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selectClass} />
          </label>
          <label className="text-xs text-slate-600">
            To
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selectClass} />
          </label>
          <label className="text-xs text-slate-600">
            Company
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={selectClass}>
              <option value="">All</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              ))}
            </select>
          </label>
        </>
      }
    />
  );
}
