import { useCallback, useEffect, useState } from 'react';
import {
  fetchEmployeeSalarySummary,
  processEmployeeSalary,
} from '../../api/employeeAdvances.js';
import Button from '../../components/Button.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import Table from '../../components/Table.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const TYPE_LABELS = {
  supervisor: 'Supervisor',
  accountant: 'Accountant',
  office_staff: 'Office Staff',
  helper: 'Helper',
  site_staff: 'Site Staff',
  driver: 'Driver',
};

const TYPE_BADGE_CLASS = {
  supervisor: 'bg-purple-100 text-purple-800',
  accountant: 'bg-blue-100 text-blue-800',
  office_staff: 'bg-teal-100 text-teal-800',
  helper: 'bg-orange-100 text-orange-800',
  site_staff: 'bg-stone-200 text-stone-800',
  driver: 'bg-slate-100 text-slate-700',
};

function EmployeeTypeBadge({ type }) {
  const label = TYPE_LABELS[type] || type;
  const className = TYPE_BADGE_CLASS[type] || TYPE_BADGE_CLASS.driver;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export default function EmployeeSalaryProcessing() {
  const toast = useToast();
  const confirm = useConfirm();
  const canView = usePermission('employee_advances', 'view');
  const canApprove = usePermission('employee_advances', 'approve');
  const now = new Date();

  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [employeeType, setEmployeeType] = useState('all');
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await fetchEmployeeSalarySummary({
        month: Number(month),
        year: Number(year),
        employeeType: employeeType === 'all' ? undefined : employeeType,
      });
      setRows(data.data ?? []);
      setSelected(new Set());
    } catch {
      setLoadError('Failed to load salary summary.');
    } finally {
      setLoading(false);
    }
  }, [canView, month, year, employeeType, toast]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const toggleAll = () => {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.employeeId)));
    }
  };

  const toggleOne = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleProcess = async () => {
    if (selected.size === 0) {
      toast.error('Select at least one employee');
      return;
    }
    const label = MONTHS.find((m) => m.value === month)?.label || month;
    const ok = await confirm({
      title: 'Process salary',
      message: `Process salary for ${selected.size} employee(s) for ${label} ${year}? Pending advances will be marked as deducted. This cannot be undone.`,
      confirmLabel: 'Process salary',
    });
    if (!ok) return;

    setProcessing(true);
    try {
      const { data } = await processEmployeeSalary({
        employeeIds: [...selected],
        month: Number(month),
        year: Number(year),
      });
      toast.success(data.message || 'Salary processed');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process salary');
    } finally {
      setProcessing(false);
    }
  };

  if (!canView) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        You do not have permission to view salary processing.
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <fieldset className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-xs text-slate-600">
          Month
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-600">
          Year
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="mt-1 block w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs text-slate-600">
          Employee Type
          <select
            value={employeeType}
            onChange={(e) => setEmployeeType(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {canApprove && (
          <Button onClick={handleProcess} disabled={processing || selected.size === 0}>
            {processing ? 'Processing…' : `Process Selected (${selected.size})`}
          </Button>
        )}
      </fieldset>

          <Table
            loading={loading}
            error={loadError}
            onRetry={load}
            emptyMessage="No employees with gross salary configured for this period."
            columns={[
              {
                key: 'select',
                label: (
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selected.size === rows.length}
                    onChange={toggleAll}
                    disabled={!canApprove}
                  />
                ),
              },
              { key: 'name', label: 'Employee' },
              { key: 'employeeType', label: 'Type' },
              { key: 'mobile', label: 'Mobile' },
              { key: 'grossSalary', label: 'Gross Salary' },
              { key: 'totalAdvance', label: 'Total Advance' },
              { key: 'finalSalary', label: 'Final Salary' },
              { key: 'advances', label: 'Advances' },
            ]}
            data={rows.map((r) => ({
              select: (
                <input
                  type="checkbox"
                  checked={selected.has(r.employeeId)}
                  onChange={() => toggleOne(r.employeeId)}
                  disabled={!canApprove}
                />
              ),
              name: r.name || r.employeeName,
              employeeType: <EmployeeTypeBadge type={r.employeeType} />,
              mobile: r.mobile || '—',
              grossSalary: formatCurrency(r.grossSalary),
              totalAdvance: formatCurrency(r.totalAdvance),
              finalSalary: (
                <span className="font-semibold text-green-700">
                  {formatCurrency(r.finalSalary)}
                </span>
              ),
              advances: (
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() =>
                    setExpanded(expanded === r.employeeId ? null : r.employeeId)
                  }
                >
                  {r.advances?.length || 0} pending
                </button>
              ),
            }))}
          />
          {rows.map(
            (r) =>
              expanded === r.employeeId &&
              r.advances?.length > 0 && (
                <ul
                  key={r.employeeId}
                  className="ml-4 space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                >
                  {r.advances.map((a) => (
                    <li key={a.id} className="flex flex-wrap gap-3 text-slate-700">
                      <span>{formatDate(a.advanceDate)}</span>
                      <span>{formatCurrency(a.amount)}</span>
                      <span className="capitalize">{a.paymentMode}</span>
                      {a.reason && <span className="text-slate-500">{a.reason}</span>}
                    </li>
                  ))}
                </ul>
              )
          )}
    </section>
  );
}
