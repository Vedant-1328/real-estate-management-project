import { useState } from 'react';
import { fetchProfitReport } from '../../api/reports.js';
import Button from '../../components/Button.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatCurrency } from '../../utils/formatters.js';

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

export default function ProfitReport() {
  const toast = useToast();
  const canView = usePermission('reports', 'view');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generate = async () => {
    setLoading(true);
    setGenerated(true);
    try {
      const { data: res } = await fetchProfitReport({ from, to });
      setData(res.data);
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
        <h1 className="text-2xl font-bold text-slate-900">Profit Report</h1>
        <p className="mt-1 text-sm text-slate-600">Revenue vs expenses and outside driver cost</p>
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
        <Button onClick={generate} disabled={loading}>{loading ? 'Generating…' : 'Generate'}</Button>
        {generated && data && (
          <Button variant="secondary" onClick={() => window.print()}>Print</Button>
        )}
      </fieldset>

      {generated && data && !loading && (
        <table className="report-table w-full max-w-lg border-collapse text-sm">
          <tbody>
            <tr>
              <td className="border border-slate-300 px-4 py-3 font-medium">Total Revenue</td>
              <td className="border border-slate-300 px-4 py-3 text-green-700">
                {formatCurrency(data.totalRevenue)}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-4 py-3 font-medium">Total Expenses</td>
              <td className="border border-slate-300 px-4 py-3 text-red-700">
                {formatCurrency(data.totalExpenses)}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-4 py-3 font-medium">Outside Driver Cost</td>
              <td className="border border-slate-300 px-4 py-3 text-red-700">
                {formatCurrency(data.outsideDriverCost)}
              </td>
            </tr>
            <tr className="font-bold">
              <td className="border border-slate-300 px-4 py-3">Net Profit</td>
              <td className="border border-slate-300 px-4 py-3">
                {formatCurrency(data.netProfit)}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </section>
  );
}
