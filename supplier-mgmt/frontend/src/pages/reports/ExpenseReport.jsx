import { useEffect, useState } from 'react';
import { fetchExpenseTypes } from '../../api/expenseTypes.js';
import { fetchExpenseReport } from '../../api/reports.js';
import { fetchVehicles } from '../../api/vehicles.js';
import Button from '../../components/Button.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { exportToCsv } from '../../utils/reportHelpers.js';
import { formatCurrency } from '../../utils/formatters.js';

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

export default function ExpenseReport() {
  const toast = useToast();
  const canView = usePermission('reports', 'view');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [vehicleId, setVehicleId] = useState('');
  const [expenseTypeId, setExpenseTypeId] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [grouped, setGrouped] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    Promise.all([fetchVehicles(), fetchExpenseTypes()])
      .then(([v, t]) => {
        setVehicles(v.data.data);
        setExpenseTypes(t.data.data);
      })
      .catch(() => {});
  }, []);

  const generate = async () => {
    setLoading(true);
    setGenerated(true);
    try {
      const { data } = await fetchExpenseReport({
        from,
        to,
        vehicleId: vehicleId || undefined,
        expenseTypeId: expenseTypeId || undefined,
      });
      setGrouped(
        data.data.grouped.map((g) => ({
          ...g,
          total: formatCurrency(g.total),
          _total: g.total,
        }))
      );
      setMonthly(
        data.data.monthlyTotals.map((m) => ({
          ...m,
          total: formatCurrency(m.total),
          _total: m.total,
        }))
      );
      setSummary(data.summary);
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
    <section className="report-page space-y-6">
      <header className="no-print">
        <h1 className="text-2xl font-bold text-slate-900">Expense Report</h1>
        <p className="mt-1 text-sm text-slate-600">Expenses by type, vehicle, and month</p>
      </header>

      <fieldset className="no-print flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-xs text-slate-600">
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selectClass} />
        </label>
        <label className="text-xs text-slate-600">
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selectClass} />
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
          Expense Type
          <select value={expenseTypeId} onChange={(e) => setExpenseTypeId(e.target.value)} className={selectClass}>
            <option value="">All</option>
            {expenseTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
        <Button onClick={generate} disabled={loading}>{loading ? 'Generating…' : 'Generate'}</Button>
      </fieldset>

      {generated && !loading && (
        <section className="report-output space-y-6">
          <header className="no-print flex gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                exportToCsv('expense-by-type-vehicle.csv', [
                  { key: 'expenseType', label: 'Type' },
                  { key: 'vehicle', label: 'Vehicle' },
                  { key: 'count', label: 'Count' },
                  { key: 'total', label: 'Total' },
                ], grouped.map((g) => ({ ...g, total: g._total })))
              }
            >
              Export CSV
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>Print</Button>
          </header>

          {summary && (
            <p className="text-sm font-semibold text-slate-800">
              Total: {formatCurrency(summary.totalExpenses)} ({summary.recordCount} records)
            </p>
          )}

          <table className="report-table w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-slate-300 px-3 py-2 text-left">Expense Type</th>
                <th className="border border-slate-300 px-3 py-2 text-left">Vehicle</th>
                <th className="border border-slate-300 px-3 py-2 text-left">Count</th>
                <th className="border border-slate-300 px-3 py-2 text-left">Total</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((g, i) => (
                <tr key={i}>
                  <td className="border border-slate-300 px-3 py-2">{g.expenseType}</td>
                  <td className="border border-slate-300 px-3 py-2">{g.vehicle}</td>
                  <td className="border border-slate-300 px-3 py-2">{g.count}</td>
                  <td className="border border-slate-300 px-3 py-2">{g.total}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="text-sm font-semibold text-slate-800">Monthly Totals</h3>
          <table className="report-table w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-slate-300 px-3 py-2 text-left">Month</th>
                <th className="border border-slate-300 px-3 py-2 text-left">Total</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((m) => (
                <tr key={m.month}>
                  <td className="border border-slate-300 px-3 py-2">{m.month}</td>
                  <td className="border border-slate-300 px-3 py-2">{m.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </section>
  );
}
