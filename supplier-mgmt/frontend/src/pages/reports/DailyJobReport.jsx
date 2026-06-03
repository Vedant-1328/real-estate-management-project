import { useEffect, useState } from 'react';
import { fetchCompanies } from '../../api/companies.js';
import { fetchDrivers } from '../../api/drivers.js';
import { fetchJobTypes } from '../../api/jobTypes.js';
import { fetchDailyJobReport } from '../../api/reports.js';
import { fetchVehicles } from '../../api/vehicles.js';
import ReportLayout from '../../components/ReportLayout.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatCurrency } from '../../utils/formatters.js';

const today = () => new Date().toISOString().slice(0, 10);

export default function DailyJobReport() {
  const toast = useToast();
  const canView = usePermission('reports', 'view');
  const [date, setDate] = useState(today());
  const [companyId, setCompanyId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [jobTypeId, setJobTypeId] = useState('');
  const [companies, setCompanies] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [jobTypes, setJobTypes] = useState([]);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetchCompanies({ limit: 500, status: 'active', companyType: 'customer' }),
      fetchDrivers({ limit: 500 }),
      fetchVehicles({ limit: 500 }),
      fetchJobTypes(),
    ])
      .then(([c, d, v, j]) => {
        setCompanies(c.data?.data ?? []);
        setDrivers(d.data?.data ?? []);
        setVehicles(v.data?.data ?? []);
        setJobTypes(j.data?.data ?? []);
      })
      .catch(() => {});
  }, []);

  const generate = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await fetchDailyJobReport({
        date,
        companyId: companyId || undefined,
        driverId: driverId || undefined,
        vehicleId: vehicleId || undefined,
        jobTypeId: jobTypeId || undefined,
      });
      setRows(
        (data.data ?? []).map((r) => ({
          ...r,
          billingAmount: formatCurrency(r.billingAmount),
          _billingAmount: r.billingAmount,
        }))
      );
      setSummary({
        companyName: `${data.summary.totalJobs} jobs`,
        plannedTrips: data.summary.totalPlannedTrips,
        actualTrips: data.summary.totalActualTrips,
        billingAmount: formatCurrency(data.summary.totalBilling),
      });
      setGenerated(true);
    } catch {
      setLoadError('Failed to generate report. Check the date and try again.');
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
      title="Daily Job Report"
      subtitle="EOD entries and billing for a single day"
      generated={generated}
      loading={loading}
      error={loadError}
      onRetry={generate}
      onGenerate={generate}
      exportFilename="daily-job-report.csv"
      columns={[
        { key: 'companyName', label: 'Company' },
        { key: 'jobType', label: 'Job Type' },
        { key: 'driver', label: 'Driver' },
        { key: 'vehicle', label: 'Vehicle' },
        { key: 'route', label: 'Route' },
        { key: 'plannedTrips', label: 'Planned' },
        { key: 'actualTrips', label: 'Actual' },
        { key: 'billingAmount', label: 'Billing' },
        { key: 'status', label: 'Status' },
      ]}
      rows={rows}
      summary={summary}
      filters={
        <>
          <label className="text-xs text-slate-600">
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={selectClass} />
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
          <label className="text-xs text-slate-600">
            Driver
            <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className={selectClass}>
              <option value="">All</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-600">
            Vehicle
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className={selectClass}>
              <option value="">All</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.vehicleNumber}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-600">
            Job Type
            <select value={jobTypeId} onChange={(e) => setJobTypeId(e.target.value)} className={selectClass}>
              <option value="">All</option>
              {jobTypes.map((j) => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>
          </label>
        </>
      }
    />
  );
}
