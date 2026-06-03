import { useEffect, useState } from 'react';
import { createEmployeeAdvance, updateEmployeeAdvance } from '../../api/employeeAdvances.js';
import { fetchEmployees } from '../../api/employees.js';
import Button from '../../components/Button.jsx';
import { useToast } from '../../context/ToastContext.jsx';

import { PAYMENT_MODE_OPTIONS } from '../../utils/paymentModes.js';

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

const now = new Date();

export default function EmployeeAdvanceForm({ advance, onSuccess, onCancel }) {
  const toast = useToast();
  const isEdit = Boolean(advance?.id);
  const readOnly = isEdit && advance?.status === 'deducted';

  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [advanceDate, setAdvanceDate] = useState(now.toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [givenBy, setGivenBy] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [reason, setReason] = useState('');
  const [salaryPeriodMonth, setSalaryPeriodMonth] = useState(String(now.getMonth() + 1));
  const [salaryPeriodYear, setSalaryPeriodYear] = useState(String(now.getFullYear()));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEmployees({ status: 'active' })
      .then((res) => setEmployees(res.data?.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (advance) {
      setEmployeeId(String(advance.employeeId || ''));
      setAdvanceDate(advance.advanceDate?.slice(0, 10) || '');
      setAmount(String(advance.amount ?? ''));
      setGivenBy(advance.givenBy || '');
      setPaymentMode(advance.paymentMode || 'cash');
      setReason(advance.reason || '');
      setSalaryPeriodMonth(String(advance.salaryPeriodMonth || now.getMonth() + 1));
      setSalaryPeriodYear(String(advance.salaryPeriodYear || now.getFullYear()));
    }
  }, [advance]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (readOnly) return;
    if (!employeeId || !amount || !givenBy) {
      toast.error('Please fill all required fields');
      return;
    }

    const payload = {
      employeeId: Number(employeeId),
      advanceDate,
      amount: Number(amount),
      givenBy,
      paymentMode,
      reason: reason || null,
      salaryPeriodMonth: Number(salaryPeriodMonth),
      salaryPeriodYear: Number(salaryPeriodYear),
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateEmployeeAdvance(advance.id, payload);
        toast.success('Advance updated');
      } else {
        await createEmployeeAdvance(payload);
        toast.success('Advance recorded');
      }
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save advance');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = 'rounded-lg border border-slate-300 px-3 py-2 text-sm w-full';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Employee <span className="text-red-500">*</span>
          <select
            className={`${fieldClass} mt-1`}
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            disabled={readOnly}
            required
          >
            <option value="">Select employee</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.mobile})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Advance Date <span className="text-red-500">*</span>
          <input
            type="date"
            className={`${fieldClass} mt-1`}
            value={advanceDate}
            onChange={(e) => setAdvanceDate(e.target.value)}
            disabled={readOnly}
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Amount <span className="text-red-500">*</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            className={`${fieldClass} mt-1`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={readOnly}
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Given By <span className="text-red-500">*</span>
          <input
            className={`${fieldClass} mt-1`}
            value={givenBy}
            onChange={(e) => setGivenBy(e.target.value)}
            disabled={readOnly}
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Payment Mode
          <select
            className={`${fieldClass} mt-1`}
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            disabled={readOnly}
          >
            {PAYMENT_MODE_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Salary Period
          <span className="mt-1 flex gap-2">
            <select
              className={fieldClass}
              value={salaryPeriodMonth}
              onChange={(e) => setSalaryPeriodMonth(e.target.value)}
              disabled={readOnly}
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              className={fieldClass}
              value={salaryPeriodYear}
              onChange={(e) => setSalaryPeriodYear(e.target.value)}
              disabled={readOnly}
              min={2000}
              max={2100}
            />
          </span>
        </label>
        <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
          Reason
          <textarea
            rows={2}
            className={`${fieldClass} mt-1`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={readOnly}
          />
        </label>
      </section>

      {readOnly && (
        <p className="text-sm text-amber-700">This advance was deducted and cannot be edited.</p>
      )}

      <footer className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        {!readOnly && (
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Update' : 'Save'}
          </Button>
        )}
      </footer>
    </form>
  );
}
