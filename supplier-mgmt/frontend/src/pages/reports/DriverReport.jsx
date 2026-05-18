import { useEffect, useState } from 'react';
import { fetchDrivers } from '../../api/drivers.js';
import { fetchDriverReport } from '../../api/reports.js';
import ReportLayout from '../../components/ReportLayout.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatCurrency } from '../../utils/formatters.js';

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

export default function DriverReport() {
  const toast = useToast();
  const canView = usePermission('reports', 'view');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [driverId, setDriverId] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    fetchDrivers().then((res) => setDrivers(res.data.data)).catch(() => {});
  }, []);

  const generate = async () => {
    setLoading(true);
    setGenerated(true);
    try {
      const { data } = await fetchDriverReport({
        from,
        to,
        driverId: driverId || undefined,
      });
      setRows(
        data.data.map((r) => ({
          ...r,
          outsideDriverPayments: formatCurrency(r.outsideDriverPayments),
          _outsideDriverPayments: r.outsideDriverPayments,
        }))
      );
      setSummary({
        name: 'Totals',
        totalJobs: data.summary.totalJobs,
        totalTrips: data.summary.totalTrips,
        assignedDays: '',
        outsideDriverPayments: formatCurrency(data.summary.totalOutsidePayments),
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
      title="Driver Report"
      subtitle="Jobs, trips, and outside driver payments"
      generated={generated}
      loading={loading}
      onGenerate={generate}
      exportFilename="driver-report.csv"
      columns={[
        { key: 'name', label: 'Driver' },
        { key: 'mobile', label: 'Mobile' },
        { key: 'driverType', label: 'Type' },
        { key: 'totalJobs', label: 'Jobs' },
        { key: 'totalTrips', label: 'Trips' },
        { key: 'assignedDays', label: 'Days' },
        { key: 'outsideDriverPayments', label: 'Outside Pay' },
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
            Driver
            <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className={selectClass}>
              <option value="">All</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>
        </>
      }
    />
  );
}
