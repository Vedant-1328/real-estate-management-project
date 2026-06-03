import { useMemo, useState } from 'react';

/**
 * Searchable picker for customer companies from the Companies master.
 * Auto-fills bill-to name, address, and GST when a row is selected.
 */
export default function CustomerCompanyPicker({
  companies = [],
  value,
  onChange,
  excludeCompanyId = '',
  disabled = false,
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => companies.find((c) => String(c.id) === String(value)) ?? null,
    [companies, value]
  );

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return companies
      .filter((c) => String(c.id) !== String(excludeCompanyId))
      .filter((c) => {
        if (!q) return true;
        const name = (c.companyName || '').toLowerCase();
        const gst = (c.gstNumber || '').toLowerCase();
        return name.includes(q) || gst.includes(q);
      })
      .slice(0, 12);
  }, [companies, excludeCompanyId, query]);

  const pick = (company) => {
    onChange?.(company);
    setQuery('');
    setOpen(false);
  };

  const clear = () => {
    onChange?.(null);
    setQuery('');
  };

  return (
    <div className="relative">
      {selected && !open ? (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{selected.companyName}</p>
            {selected.gstNumber && (
              <p className="truncate text-xs text-slate-500">GSTIN: {selected.gstNumber}</p>
            )}
          </div>
          {!disabled && (
            <button
              type="button"
              className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800"
              onClick={() => setOpen(true)}
            >
              Change
            </button>
          )}
        </div>
      ) : (
        <>
          <input
            type="text"
            className="input-field w-full"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            placeholder="Search customer from Companies master…"
            disabled={disabled}
            autoComplete="off"
          />
          {open && options.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Companies master
              </p>
              {options.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="block w-full px-3 py-2 text-left hover:bg-slate-50"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(c);
                  }}
                >
                  <span className="block text-sm font-medium text-slate-800">{c.companyName}</span>
                  {(c.gstNumber || c.billingAddress) && (
                    <span className="block truncate text-xs text-slate-500">
                      {[c.gstNumber, c.billingAddress?.split('\n')[0]].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          {open && query.trim() && options.length === 0 && (
            <p className="mt-1 text-xs text-amber-700">
              No matching company in master. Add the customer under Companies first.
            </p>
          )}
        </>
      )}
      {selected && open && !disabled && (
        <button
          type="button"
          className="mt-1 text-xs text-slate-500 hover:text-slate-700"
          onClick={() => {
            clear();
            setOpen(true);
          }}
        >
          Clear selection
        </button>
      )}
    </div>
  );
}
