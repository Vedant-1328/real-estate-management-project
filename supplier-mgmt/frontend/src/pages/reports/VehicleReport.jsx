import { useState } from 'react';
import { fetchVehicleReport } from '../../api/reports.js';
import ReportLayout from '../../components/ReportLayout.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatCurrency } from '../../utils/formatters.js';

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

export default function VehicleReport() {
  const toast = useToast();
  const canView = usePermission('reports', 'view');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const generate = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await fetchVehicleReport({ from, to });
      setRows(
        (data.data ?? []).map((r) => ({
          ...r,
          revenue: formatCurrency(r.revenue),
          expenses: formatCurrency(r.expenses),
          netEarning: formatCurrency(r.netEarning),
          _revenue: r.revenue,
          _expenses: r.expenses,
          _netEarning: r.netEarning,
        }))
      );
      setSummary({
        vehicleNumber: 'Totals',
        totalJobs: data.summary.totalJobs,
        totalTrips: data.summary.totalTrips,
        revenue: formatCurrency(data.summary.totalRevenue),
        expenses: formatCurrency(data.summary.totalExpenses),
        netEarning: formatCurrency(data.summary.totalNet),
      });
      setGenerated(true);
    } catch {
      setLoadError('Failed to generate report.');
      setRows([]);
      setSummary(null);
      setGenerated(true);
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
      title="Vehicle Report"
      subtitle="Revenue, expenses, and net earning per vehicle"
      generated={generated}
      loading={loading}
      error={loadError}
      onRetry={generate}
      onGenerate={generate}
      exportFilename="vehicle-report.csv"
      columns={[
        { key: 'vehicleNumber', label: 'Vehicle' },
        { key: 'vehicleType', label: 'Type' },
        { key: 'totalJobs', label: 'Jobs' },
        { key: 'totalTrips', label: 'Trips' },
        { key: 'revenue', label: 'Revenue' },
        { key: 'expenses', label: 'Expenses' },
        { key: 'netEarning', label: 'Net' },
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
        </>
      }
    />
  );
}
