import { useState } from 'react';
import { fetchSalaryReport } from '../../api/reports.js';
import ReportLayout from '../../components/ReportLayout.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

export default function SalaryReport() {
  const toast = useToast();
  const canView = usePermission('reports', 'view');
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [type, setType] = useState('driver');
  const [rows, setRows] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const generate = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await fetchSalaryReport({
        month: Number(month),
        year: Number(year),
        type,
      });
      setRows(
        (data.data ?? []).map((r) => ({
          ...r,
          id: r.driverId ?? r.employeeId,
          name: r.name,
          grossSalary: formatCurrency(r.grossSalary),
          totalAdvance: formatCurrency(r.totalAdvance),
          finalSalary: formatCurrency(r.finalSalary),
          _grossSalary: r.grossSalary,
          _totalAdvance: r.totalAdvance,
          _finalSalary: r.finalSalary,
          history: (
            <button
              type="button"
              className="text-sm text-blue-600 hover:underline"
              onClick={() => {
                const rowId = r.driverId ?? r.employeeId;
                setExpanded(expanded === rowId ? null : rowId);
              }}
            >
              {r.advanceHistory?.length || 0}
            </button>
          ),
          _advanceHistory: r.advanceHistory,
        }))
      );
      setGenerated(true);
    } catch {
      setLoadError('Failed to generate report.');
      setRows([]);
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
  const columns =
    type === 'employee'
      ? [
          { key: 'name', label: 'Employee' },
          { key: 'employeeType', label: 'Type' },
          { key: 'grossSalary', label: 'Gross' },
          { key: 'totalAdvance', label: 'Advance' },
          { key: 'finalSalary', label: 'Final' },
          { key: 'history', label: 'Advances', sortable: false },
        ]
      : [
          { key: 'name', label: 'Driver' },
          { key: 'mobile', label: 'Mobile' },
          { key: 'grossSalary', label: 'Gross' },
          { key: 'totalAdvance', label: 'Advance' },
          { key: 'finalSalary', label: 'Final' },
          { key: 'history', label: 'Advances', sortable: false },
        ];

  return (
    <>
      <ReportLayout
        title="Salary Report"
        subtitle="Gross salary, advances, and net pay"
        generated={generated}
        loading={loading}
        error={loadError}
        onRetry={generate}
        onGenerate={generate}
        exportFilename="salary-report.csv"
        columns={columns}
        rows={rows}
        filters={
          <>
            <label className="text-xs text-slate-600">
              Type
              <select value={type} onChange={(e) => setType(e.target.value)} className={selectClass}>
                <option value="driver">Driver</option>
                <option value="employee">Employee</option>
              </select>
            </label>
            <label className="text-xs text-slate-600">
              Month
              <input
                type="number"
                min={1}
                max={12}
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className={selectClass}
              />
            </label>
            <label className="text-xs text-slate-600">
              Year
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className={selectClass}
              />
            </label>
          </>
        }
      />
      {rows.map(
        (r) =>
          expanded === r.id &&
          r._advanceHistory?.length > 0 && (
            <ul
              key={`hist-${r.id}`}
              className="ml-4 space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
            >
              {r._advanceHistory.map((a) => (
                <li key={a.id} className="flex flex-wrap gap-3">
                  <span>{formatDate(a.advanceDate)}</span>
                  <span>{formatCurrency(a.amount)}</span>
                  <span className="capitalize">{a.status}</span>
                  {a.reason && <span className="text-slate-500">{a.reason}</span>}
                </li>
              ))}
            </ul>
          )
      )}
    </>
  );
}
