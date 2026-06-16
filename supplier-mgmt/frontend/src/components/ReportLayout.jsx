import { useMemo, useState } from 'react';
import Button from './Button.jsx';
import { exportToCsv, sortRows } from '../utils/reportHelpers.js';

export default function ReportLayout({
  title,
  subtitle,
  filters,
  columns,
  rows = [],
  summary = null,
  summaryColumns = null,
  loading = false,
  generated = false,
  onGenerate,
  error = null,
  onRetry,
  exportFilename = 'report.csv',
  emptyMessage = 'No data for the selected filters.',
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const sortedRows = useMemo(
    () => sortRows(rows, sortKey, sortDir),
    [rows, sortKey, sortDir]
  );

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const csvColumns = columns.filter((c) => c.key !== 'actions');
  const csvRows = sortedRows.map((row) => {
    const out = {};
    csvColumns.forEach((c) => {
      out[c.key] = row[`_${c.key}`] ?? row[c.key];
    });
    return out;
  });

  const summaryCols = summaryColumns || columns.filter((c) => c.summary !== false && c.key !== 'actions');

  return (
    <section className="report-page space-y-6">
      <header className="no-print">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </header>

      <fieldset className="no-print flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        {filters}
        <Button onClick={onGenerate} disabled={loading}>
          {loading ? 'Generating…' : 'Generate'}
        </Button>
      </fieldset>

      {generated && (
        <section className="report-output space-y-3">
          <header className="no-print flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => exportToCsv(exportFilename, csvColumns, csvRows)}
              disabled={!sortedRows.length}
            >
              Export CSV
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              Print
            </Button>
          </header>

          <h2 className="hidden print:block text-lg font-bold text-black">{title}</h2>

          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
              <p>{error}</p>
              {onRetry && (
                <Button variant="secondary" className="mt-3" onClick={onRetry}>
                  Retry
                </Button>
              )}
            </div>
          ) : sortedRows.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              {emptyMessage}
            </p>
          ) : (
            <table className="report-table w-full border-collapse text-sm">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="cursor-pointer border border-slate-300 bg-slate-100 px-3 py-2 text-left font-semibold text-slate-800 print:bg-white"
                      onClick={() => col.sortable !== false && handleSort(col.key)}
                    >
                      {col.label}
                      {sortKey === col.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, i) => (
                  <tr key={row.id ?? row._key ?? i}>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className="border border-slate-600/50 px-3 py-2 text-slate-100"
                      >
                        {row[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {summary && (
                <tfoot>
                  <tr className="font-semibold">
                    {summaryCols.map((col, idx) => (
                      <td
                        key={col.key}
                        className="border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 print:bg-white"
                      >
                        {idx === 0 && !summary[col.key] ? 'Total' : (summary[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </section>
      )}
    </section>
  );
}
