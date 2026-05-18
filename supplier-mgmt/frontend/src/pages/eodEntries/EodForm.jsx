import { useEffect, useMemo, useState } from 'react';
import { createEodEntry, updateEodEntry } from '../../api/eodEntries.js';
import Button from '../../components/Button.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatCurrency } from '../../utils/formatters.js';

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-sm text-slate-900">{value || '—'}</p>
    </div>
  );
}

export default function EodForm({ assignment, entry, onSuccess, onCancel }) {
  const toast = useToast();
  const canApprove = usePermission('eod_entries', 'approve');
  const isEdit = Boolean(entry?.id);
  const isInvoiced = entry?.billingStatus === 'invoiced';
  const locked = isInvoiced && !canApprove;

  const source = assignment || entry?.assignment || {};
  const companyName = entry?.company?.companyName || source.company?.companyName || '—';
  const vehicleLabel =
    entry?.vehicleLabel ||
    entry?.vehicle?.vehicleNumber ||
    source.vehicleLabel ||
    source.vehicle?.vehicleNumber ||
    '—';
  const driverLabel =
    entry?.driverLabel ||
    entry?.driver?.name ||
    source.driverLabel ||
    source.driver?.name ||
    source.outsideDriverName ||
    '—';
  const jobTypeName = entry?.jobType?.name || source.jobType?.name || '—';
  const routeLabel = entry?.routeLabel || source.routeLabel || '—';
  const plannedTrips = entry?.plannedTrips ?? source.expectedTrips ?? source.plannedTrips ?? '—';
  const ratePerTrip =
    entry?.ratePerTrip != null && entry.ratePerTrip !== '' ? Number(entry.ratePerTrip) : null;

  const [actualTrips, setActualTrips] = useState('');
  const [extraCharges, setExtraCharges] = useState('0');
  const [deductions, setDeductions] = useState('0');
  const [dieselFuel, setDieselFuel] = useState('');
  const [expense, setExpense] = useState('');
  const [remarks, setRemarks] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [approved, setApproved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (entry) {
      setActualTrips(String(entry.actualTrips ?? ''));
      setExtraCharges(String(entry.extraCharges ?? 0));
      setDeductions(String(entry.deductions ?? 0));
      setDieselFuel(entry.dieselFuel != null ? String(entry.dieselFuel) : '');
      setExpense(entry.expense != null ? String(entry.expense) : '');
      setRemarks(entry.remarks || '');
      setStartTime(entry.startTime || '');
      setEndTime(entry.endTime || '');
      setApproved(Boolean(entry.isApproved));
    } else {
      setActualTrips('');
      setExtraCharges('0');
      setDeductions('0');
      setDieselFuel(
        source.dieselFuel != null && source.dieselFuel !== ''
          ? String(source.dieselFuel)
          : ''
      );
      setExpense('');
      setRemarks('');
      setStartTime('');
      setEndTime('');
      setApproved(false);
    }
  }, [entry, source.dieselFuel]);

  const totalAmount = useMemo(() => {
    const trips = Number(actualTrips) || 0;
    const extra = Number(extraCharges) || 0;
    const ded = Number(deductions) || 0;
    const rate = ratePerTrip ?? 0;
    return trips * rate + extra - ded;
  }, [actualTrips, extraCharges, deductions, ratePerTrip]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (actualTrips === '' || Number(actualTrips) < 0) {
      toast.error('Actual trips is required');
      return;
    }

    const payload = {
      actualTrips: Number(actualTrips),
      extraCharges: Number(extraCharges) || 0,
      deductions: Number(deductions) || 0,
      dieselFuel: dieselFuel !== '' ? Number(dieselFuel) : null,
      expense: expense !== '' ? Number(expense) : null,
      remarks: remarks || null,
      startTime: startTime || null,
      endTime: endTime || null,
      approved: canApprove ? approved : false,
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateEodEntry(entry.id, payload);
        toast.success('EOD entry updated');
      } else {
        await createEodEntry({
          assignmentId: assignment.id,
          ...payload,
        });
        toast.success('EOD entry created');
      }
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save EOD entry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
        <ReadOnlyField label="Company" value={companyName} />
        <ReadOnlyField label="Vehicle" value={vehicleLabel} />
        <ReadOnlyField label="Driver" value={driverLabel} />
        <ReadOnlyField label="Job Type" value={jobTypeName} />
        <ReadOnlyField label="Route" value={routeLabel} />
        <ReadOnlyField label="Planned Trips" value={plannedTrips} />
        <ReadOnlyField
          label="Rate Per Trip"
          value={ratePerTrip != null ? formatCurrency(ratePerTrip) : 'Set when generating invoice'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Actual Trips <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            className="input-field"
            value={actualTrips}
            onChange={(e) => setActualTrips(e.target.value)}
            disabled={locked}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Extra Charges</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input-field"
            value={extraCharges}
            onChange={(e) => setExtraCharges(e.target.value)}
            disabled={locked}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Deductions</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input-field"
            value={deductions}
            onChange={(e) => setDeductions(e.target.value)}
            disabled={locked}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Diesel/Fuel</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input-field"
            value={dieselFuel}
            onChange={(e) => setDieselFuel(e.target.value)}
            disabled={locked}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Expense</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input-field"
            value={expense}
            onChange={(e) => setExpense(e.target.value)}
            disabled={locked}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Start Time</label>
          <input
            type="time"
            className="input-field"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            disabled={locked}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">End Time</label>
          <input
            type="time"
            className="input-field"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            disabled={locked}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Driver Notes</label>
        <textarea
          rows={3}
          className="input-field"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          disabled={locked}
        />
      </div>

      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <p className="text-sm text-slate-600">
          {ratePerTrip != null ? (
            <>
              {Number(actualTrips) || 0} × {formatCurrency(ratePerTrip)} + {formatCurrency(extraCharges)} −{' '}
              {formatCurrency(deductions)} =
            </>
          ) : (
            <>
              Trip rate applied at billing. Extra {formatCurrency(extraCharges)} − deductions{' '}
              {formatCurrency(deductions)} =
            </>
          )}
        </p>
        <p className="text-xl font-bold text-green-700">{formatCurrency(totalAmount)}</p>
      </div>

      {canApprove && !locked && (
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={approved}
            onChange={(e) => setApproved(e.target.checked)}
          />
          Approve this entry
        </label>
      )}

      {locked && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This entry is invoiced and cannot be edited without approve permission.
        </p>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        {!locked && (
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Update' : 'Create'}
          </Button>
        )}
      </div>
    </form>
  );
}
