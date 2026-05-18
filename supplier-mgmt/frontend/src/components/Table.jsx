import Button from './Button.jsx';

function TableSkeleton({ columns, rows = 5 }) {
  return (
    <tbody className="divide-y divide-slate-200 bg-white">
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {columns.map((col) => (
            <td key={col.key} className="px-4 py-3">
              <span className="block h-4 animate-pulse rounded bg-slate-200" />
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
        <td colSpan={colSpan} className="px-4 py-12 text-center">
          <svg
            className="mx-auto h-10 w-10 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V7a2 2 0 00-2-2h-3l-2-2H9L7 5H4a2 2 0 00-2 2v6m18 0v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4m18 0H2"
            />
          </svg>
          <p className="mt-3 text-sm text-slate-500">{message || 'No records found'}</p>
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
          <p className="text-sm text-red-600">{message || 'Failed to load data.'}</p>
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
}) {
  const colSpan = columns.length || 1;

  return (
    <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left font-medium text-slate-600"
              >
                {col.label}
              </th>
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
          <tbody className="divide-y divide-slate-200 bg-white">
            {data.map((row, i) => (
              <tr key={row.id ?? row._key ?? i} className="hover:bg-slate-50/80">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-slate-700">
                    {row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </section>
  );
}
