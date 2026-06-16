import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { fetchVehicleTypes } from '../../api/vehicleTypes.js';
import {
  createVehicle,
  deleteVehicleDocument,
  fetchVehicle,
  updateVehicle,
  uploadVehicleDocument,
} from '../../api/vehicles.js';
import Button from '../../components/Button.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatDate } from '../../utils/formatters.js';

const DOC_TYPES = [
  { value: 'rc_book', label: 'RC Book' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'permit', label: 'Permit' },
  { value: 'fitness_certificate', label: 'Fitness Certificate' },
  { value: 'pollution_certificate', label: 'Pollution Certificate' },
  { value: 'other', label: 'Other' },
];

const schema = z.object({
  vehicleNumber: z.string().min(1, 'Vehicle number is required'),
  vehicleTypeId: z.coerce.number().min(1, 'Vehicle type is required'),
  vehicleModel: z.string().min(1, 'Model is required'),
  capacity: z.string().optional(),
  ownerType: z.enum(['own', 'rented', 'third_party']),
  insuranceExpiry: z.string().optional(),
  fitnessExpiry: z.string().optional(),
  permitExpiry: z.string().optional(),
  pollutionExpiry: z.string().optional(),
  status: z.enum(['available', 'assigned', 'maintenance', 'inactive']),
  notes: z.string().optional(),
});

export default function VehicleForm({ vehicle, onSuccess, onCancel }) {
  const toast = useToast();
  const confirm = useConfirm();
  const canEdit = usePermission('vehicles', 'edit');
  const canDelete = usePermission('vehicles', 'delete');
  const isEdit = Boolean(vehicle?.id);

  const [documents, setDocuments] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [docType, setDocType] = useState('rc_book');
  const [uploading, setUploading] = useState(false);

  const [vehicleTypeId, setVehicleTypeId] = useState('');

  const selectedVehicleType = useMemo(
    () => vehicleTypes.find((vt) => String(vt.id) === String(vehicleTypeId)),
    [vehicleTypes, vehicleTypeId]
  );

  const showCapacity = Boolean(selectedVehicleType?.showsCapacity);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      vehicleNumber: '',
      vehicleTypeId: '',
      vehicleModel: '',
      capacity: '',
      ownerType: 'own',
      insuranceExpiry: '',
      fitnessExpiry: '',
      permitExpiry: '',
      pollutionExpiry: '',
      status: 'available',
      notes: '',
    },
  });

  const loadDocuments = useCallback(async () => {
    if (!vehicle?.id) return;
    try {
      const { data } = await fetchVehicle(vehicle.id);
      setDocuments(data.data.documents || []);
    } catch {
      toast.error('Failed to load documents');
    }
  }, [vehicle?.id, toast]);

  useEffect(() => {
    fetchVehicleTypes({ status: 'active' })
      .then((res) => setVehicleTypes(res.data?.data ?? []))
      .catch(() => setVehicleTypes([]));
  }, []);

  useEffect(() => {
    if (!showCapacity) {
      setValue('capacity', '');
    }
  }, [showCapacity, setValue]);

  useEffect(() => {
    if (vehicle) {
      const typeId = vehicle.vehicleTypeId || vehicle.vehicleTypeRef?.id || '';
      setVehicleTypeId(typeId ? String(typeId) : '');
      reset({
        vehicleNumber: vehicle.vehicleNumber || '',
        vehicleTypeId: typeId,
        vehicleModel: vehicle.vehicleModel || '',
        capacity: vehicle.capacity || '',
        ownerType: vehicle.ownerType || 'own',
        insuranceExpiry: vehicle.insuranceExpiry?.slice(0, 10) || '',
        fitnessExpiry: vehicle.fitnessExpiry?.slice(0, 10) || '',
        permitExpiry: vehicle.permitExpiry?.slice(0, 10) || '',
        pollutionExpiry: vehicle.pollutionExpiry?.slice(0, 10) || '',
        status: vehicle.status || 'available',
        notes: vehicle.notes || '',
      });
      loadDocuments();
    } else {
      setVehicleTypeId('');
      reset();
      setDocuments([]);
    }
  }, [vehicle, reset, loadDocuments]);

  const onSubmit = async (values) => {
    if (showCapacity && !values.capacity?.trim()) {
      toast.error('Capacity is required for dumper vehicles');
      return;
    }
    const payload = {
      ...values,
      capacity: showCapacity && values.capacity?.trim() ? values.capacity.trim() : null,
      insuranceExpiry: values.insuranceExpiry || null,
      fitnessExpiry: values.fitnessExpiry || null,
      permitExpiry: values.permitExpiry || null,
      pollutionExpiry: values.pollutionExpiry || null,
      notes: values.notes || null,
    };
    try {
      if (isEdit) {
        await updateVehicle(vehicle.id, payload);
        toast.success('Vehicle updated');
        onSuccess?.();
      } else {
        const { data } = await createVehicle(payload);
        toast.success('Vehicle created — you can now upload documents');
        onSuccess?.(data.data);
      }
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        toast.error(apiErrors.map((e) => e.message).join(' · '));
      } else {
        toast.error(err.response?.data?.message || 'Failed to save vehicle');
      }
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !vehicle?.id) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);
    setUploading(true);
    try {
      await uploadVehicleDocument(vehicle.id, formData);
      toast.success('Document uploaded');
      loadDocuments();
      e.target.value = '';
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    const ok = await confirm({
      title: 'Delete document',
      message: 'Delete this document? This cannot be undone.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteVehicleDocument(vehicle.id, docId);
      toast.success('Document deleted');
      loadDocuments();
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const err = (name) =>
    errors[name] && <p className="mt-1 text-xs text-red-600">{errors[name].message}</p>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Vehicle Number <span className="text-red-500">*</span>
          </label>
          <input className="input-field" {...register('vehicleNumber')} />
          {err('vehicleNumber')}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Vehicle Type <span className="text-red-500">*</span>
          </label>
          <select
            className="input-field"
            {...register('vehicleTypeId', {
              onChange: (e) => setVehicleTypeId(e.target.value),
            })}
          >
            <option value="">Select type…</option>
            {vehicleTypes.map((vt) => (
              <option key={vt.id} value={vt.id}>
                {vt.name}
                {vt.billingUnit === 'hour'
                  ? ' (hourly)'
                  : vt.billingUnit === 'both'
                  ? ' (hour or trip)'
                  : ''}
              </option>
            ))}
          </select>
          {vehicleTypes.length === 0 && (
            <p className="mt-1 text-xs text-amber-700">
              Add types under Masters → Vehicle Types first.
            </p>
          )}
          {err('vehicleTypeId')}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Model <span className="text-red-500">*</span>
          </label>
          <input className="input-field" {...register('vehicleModel')} />
          {err('vehicleModel')}
        </div>
        {showCapacity && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Capacity <span className="text-red-500">*</span>
            </label>
            <input className="input-field" placeholder="e.g. 16 Ton" {...register('capacity')} />
            {err('capacity')}
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Owner Type <span className="text-red-500">*</span>
          </label>
          <select className="input-field" {...register('ownerType')}>
            <option value="own">Own</option>
            <option value="rented">Rented</option>
            <option value="third_party">Third Party</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Status <span className="text-red-500">*</span>
          </label>
          <select className="input-field" {...register('status')}>
            <option value="available">Available</option>
            <option value="assigned">Assigned</option>
            <option value="maintenance">Maintenance</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Certificate expiry dates</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-600">Insurance Expiry</label>
            <input type="date" className="input-field" {...register('insuranceExpiry')} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">Fitness Expiry</label>
            <input type="date" className="input-field" {...register('fitnessExpiry')} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">Permit Expiry</label>
            <input type="date" className="input-field" {...register('permitExpiry')} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">Pollution Certificate Expiry</label>
            <input type="date" className="input-field" {...register('pollutionExpiry')} />
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
        <textarea rows={2} className="input-field" {...register('notes')} />
      </div>

      {isEdit && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Documents</h3>
          {documents.length > 0 ? (
            <ul className="mb-4 space-y-2">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800">{doc.docTypeLabel}</p>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-blue-600 hover:underline"
                    >
                      {doc.originalName || 'View file'}
                    </a>
                    <p className="text-xs text-slate-500">{formatDate(doc.uploadedAt)}</p>
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      className="shrink-0 text-sm text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteDoc(doc.id)}
                    >
                      Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-slate-500">No documents uploaded yet.</p>
          )}
          {canEdit && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[140px] flex-1">
                <label className="mb-1 block text-xs text-slate-600">Document type</label>
                <select
                  className="input-field"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                >
                  {DOC_TYPES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="cursor-pointer">
                <span className="inline-flex items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
                  {uploading ? 'Uploading…' : 'Upload document'}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          )}
        </div>
      )}

      {!isEdit && (
        <p className="text-xs text-slate-500">
          Save the vehicle first, then edit it to upload documents.
        </p>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEdit ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
