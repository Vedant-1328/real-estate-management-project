import Button from './Button.jsx';

function TableSkeleton({ columns, rows = 5 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {columns.map((col) => (
            <td key={col.key} className="px-4 py-3">
              <span className="block h-4 shimmer rounded-md" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

function EmptyState({ colSpan, message }) {
  return (
    <tbody>
      <tr>
        <td colSpan={colSpan} className="px-4 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 13V7a2 2 0 00-2-2h-3l-2-2H9L7 5H4a2 2 0 00-2 2v6m18 0v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4m18 0H2"
              />
            </svg>
          </div>
          <p className="mt-4 text-sm font-medium text-slate-600">{message || 'No records found'}</p>
          <p className="mt-1 text-xs text-slate-400">Data will appear here when available</p>
        </td>
      </tr>
    </tbody>
  );
}

function ErrorState({ colSpan, message, onRetry }) {
  return (
    <tbody>
      <tr>
        <td colSpan={colSpan} className="px-4 py-12 text-center">
          <p className="text-sm font-medium text-rose-600">{message || 'Failed to load data.'}</p>
          {onRetry && (
            <Button variant="secondary" className="mt-3" onClick={onRetry}>
              Retry
            </Button>
          )}
        </td>
      </tr>
    </tbody>
  );
}

export default function Table({
  columns = [],
  data = [],
  loading = false,
  error = null,
  onRetry,
  emptyMessage = 'No records found',
  embedded = false,
}) {
  const colSpan = columns.length || 1;

  const table = (
    <table className="table-premium min-w-full text-sm">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key}>{col.label}</th>
          ))}
        </tr>
      </thead>
      {loading ? (
        <TableSkeleton columns={columns} />
      ) : error ? (
        <ErrorState colSpan={colSpan} message={error} onRetry={onRetry} />
      ) : data.length === 0 ? (
        <EmptyState colSpan={colSpan} message={emptyMessage} />
      ) : (
        <tbody className="bg-white">
          {data.map((row, i) => (
            <tr key={row.id ?? row._key ?? i}>
              {columns.map((col) => (
                <td key={col.key}>{row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      )}
    </table>
  );

  if (embedded) return table;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="overflow-x-auto">{table}</div>
    </section>
  );
}
