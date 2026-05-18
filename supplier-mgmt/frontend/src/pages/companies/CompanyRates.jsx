import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  createCompanyRate,
  deleteCompanyRate,
  fetchCompanyRates,
  updateCompanyRate,
} from '../../api/companies.js';
import { fetchJobTypes } from '../../api/jobTypes.js';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import SlideOver from '../../components/SlideOver.jsx';
import Table from '../../components/Table.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

const RATE_TYPES = [
  { value: 'per_trip', label: 'Per Trip' },
  { value: 'per_day', label: 'Per Day' },
  { value: 'per_hour', label: 'Per Hour' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'per_ton', label: 'Per Ton' },
];

const rateSchema = z.object({
  jobTypeId: z.coerce.number().min(1, 'Job type is required'),
  vehicleType: z.string().optional(),
  rateType: z.enum(['per_trip', 'per_day', 'per_hour', 'fixed', 'per_ton']),
  rateAmount: z.coerce.number().min(0, 'Rate must be positive'),
  effectiveFrom: z.string().min(1, 'Effective from is required'),
});

export default function CompanyRates({ company, open, onClose }) {
  const toast = useToast();
  const confirm = useConfirm();
  const canEdit = usePermission('companies', 'edit');
  const canDelete = usePermission('companies', 'delete');

  const [rates, setRates] = useState([]);
  const [jobTypes, setJobTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRate, setEditingRate] = useState(null);

  const loadRates = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await fetchCompanyRates(company.id);
      setRates(data.data);
    } catch {
      setLoadError('Failed to load rates.');
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    if (open && company) {
      loadRates();
      fetchJobTypes()
        .then((res) => setJobTypes(res.data.data))
        .catch(() => toast.error('Failed to load job types'));
    }
  }, [open, company, loadRates, toast]);

  const handleDelete = async (rateId) => {
    const ok = await confirm({
      title: 'Delete rate',
      message: 'Delete this rate? This cannot be undone.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteCompanyRate(company.id, rateId);
      toast.success('Rate deleted');
      loadRates();
    } catch {
      toast.error('Failed to delete rate');
    }
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={`Job Rates — ${company?.companyName || ''}`}
      wide
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Rates use the most recent effective date on or before the assignment date.
        </p>
        {canEdit && (
          <Button
            onClick={() => {
              setEditingRate(null);
              setShowForm(true);
            }}
          >
            Add Rate
          </Button>
        )}
      </div>

      {showForm && (
        <RateForm
          companyId={company.id}
          jobTypes={jobTypes}
          rate={editingRate}
          onCancel={() => {
            setShowForm(false);
            setEditingRate(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingRate(null);
            loadRates();
          }}
        />
      )}

        <Table
          loading={loading}
          error={loadError}
          onRetry={loadRates}
          columns={[
            { key: 'jobType', label: 'Job Type' },
            { key: 'vehicleType', label: 'Vehicle Type' },
            { key: 'rateType', label: 'Rate Type' },
            { key: 'rateAmount', label: 'Rate Amount' },
            { key: 'effectiveFrom', label: 'Effective From' },
            { key: 'actions', label: 'Actions' },
          ]}
          data={rates.map((r) => ({
            id: r.id,
            jobType: r.jobType?.name ?? '—',
            vehicleType: r.vehicleType || '—',
            rateType: <Badge>{r.rateTypeLabel || r.rateType}</Badge>,
            rateAmount: formatCurrency(r.rateAmount),
            effectiveFrom: formatDate(r.effectiveFrom),
            actions: (
              <div className="flex gap-2">
                {canEdit && (
                  <button
                    type="button"
                    className="text-sm font-medium text-slate-700 hover:text-slate-900"
                    onClick={() => {
                      setEditingRate(r);
                      setShowForm(true);
                    }}
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    className="text-sm font-medium text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(r.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            ),
          }))}
        />
    </SlideOver>
  );
}

function RateForm({ companyId, jobTypes, rate, onCancel, onSuccess }) {
  const toast = useToast();
  const isEdit = Boolean(rate);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(rateSchema),
    defaultValues: {
      jobTypeId: rate?.jobTypeId || '',
      vehicleType: rate?.vehicleType || '',
      rateType: rate?.rateType || 'per_trip',
      rateAmount: rate?.rateAmount ?? '',
      effectiveFrom: rate?.effectiveFrom || new Date().toISOString().slice(0, 10),
    },
  });

  const onSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        vehicleType: values.vehicleType || null,
      };
      if (isEdit) {
        await updateCompanyRate(companyId, rate.id, payload);
        toast.success('Rate updated');
      } else {
        await createCompanyRate(companyId, payload);
        toast.success('Rate added');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save rate');
    }
  };

  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">
        {isEdit ? 'Edit Rate' : 'Add Rate'}
      </h3>
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Job Type *</label>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            {...register('jobTypeId')}
          >
            <option value="">Select…</option>
            {jobTypes.map((jt) => (
              <option key={jt.id} value={jt.id}>
                {jt.name}
              </option>
            ))}
          </select>
          {errors.jobTypeId && (
            <p className="mt-1 text-xs text-red-600">{errors.jobTypeId.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Vehicle Type</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. Truck, Tipper"
            {...register('vehicleType')}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Rate Type *</label>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            {...register('rateType')}
          >
            {RATE_TYPES.map((rt) => (
              <option key={rt.value} value={rt.value}>
                {rt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Rate Amount (₹) *</label>
          <input
            type="number"
            step="0.01"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            {...register('rateAmount')}
          />
          {errors.rateAmount && (
            <p className="mt-1 text-xs text-red-600">{errors.rateAmount.message}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">Effective From *</label>
          <input
            type="date"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            {...register('effectiveFrom')}
          />
          {errors.effectiveFrom && (
            <p className="mt-1 text-xs text-red-600">{errors.effectiveFrom.message}</p>
          )}
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEdit ? 'Update' : 'Add'}
          </Button>
        </div>
      </form>
    </div>
  );
}
