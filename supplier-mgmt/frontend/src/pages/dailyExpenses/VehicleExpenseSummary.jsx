import { useState } from 'react';
import { fetchVehicleExpenseSummary } from '../../api/dailyExpenses.js';
import Button from '../../components/Button.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatCurrency } from '../../utils/formatters.js';

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

function exportCsv(rows, from, to) {
  const lines = ['Vehicle,Expense Type,Amount'];
  for (const row of rows) {
    for (const b of row.breakdown) {
      lines.push(`"${row.vehicleNumber}","${b.expenseType}",${b.total}`);
    }
    lines.push(`"${row.vehicleNumber}","GRAND TOTAL",${row.grandTotal}`);
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vehicle-expenses-${from}-to-${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function VehicleExpenseSummary() {
  const toast = useToast();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data } = await fetchVehicleExpenseSummary({ from, to });
      setRows(data.data);
    } catch {
      toast.error('Failed to generate summary');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
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
        <Button onClick={handleGenerate} disabled={loading}>
          {loading ? 'Generating…' : 'Generate'}
        </Button>
        {rows.length > 0 && (
          <Button variant="secondary" onClick={() => exportCsv(rows, from, to)}>
            Export CSV
          </Button>
        )}
      </div>

      {rows.length === 0 && !loading ? (
        <p className="py-8 text-center text-sm text-slate-500">
          Select a date range and click Generate.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <div
              key={row.vehicleId}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-slate-900">{row.vehicleNumber}</h3>
              <ul className="mt-3 space-y-1 text-sm text-slate-600">
                {row.breakdown.map((b) => (
                  <li key={b.expenseType} className="flex justify-between gap-2">
                    <span>{b.expenseType}</span>
                    <span className="font-medium text-slate-800">{formatCurrency(b.total)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-slate-100 pt-2 text-sm font-bold text-green-700">
                Grand total: {formatCurrency(row.grandTotal)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
