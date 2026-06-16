import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { fetchVehicles } from '../../api/vehicles.js';
import {
  createDriver,
  deleteDriverDocument,
  fetchDriver,
  updateDriver,
  uploadDriverDocument,
} from '../../api/drivers.js';
import Button from '../../components/Button.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatDate } from '../../utils/formatters.js';

const DOC_TYPES = [
  { value: 'driving_license', label: 'Driving License' },
  { value: 'id_proof', label: 'ID Proof' },
  { value: 'address_proof', label: 'Address Proof' },
  { value: 'other', label: 'Other' },
];

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  mobile: z.string().min(1, 'Mobile is required'),
  address: z.string().optional(),
  licenseNumber: z.string().optional(),
  driverType: z.enum(['own', 'outside']),
  defaultVehicleId: z.string().optional(),
  status: z.enum(['available', 'assigned', 'inactive']),
  grossSalary: z.coerce.number().min(0).optional().or(z.literal('')),
  notes: z.string().optional(),
});

export default function DriverForm({ driver, onSuccess, onCancel }) {
  const toast = useToast();
  const confirm = useConfirm();
  const canDelete = usePermission('drivers', 'delete');
  const isEdit = Boolean(driver?.id);

  const [vehicles, setVehicles] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [docType, setDocType] = useState('driving_license');
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      mobile: '',
      address: '',
      licenseNumber: '',
      driverType: 'own',
      defaultVehicleId: '',
      status: 'available',
      grossSalary: '',
      notes: '',
    },
  });

  const loadDocuments = useCallback(async () => {
    if (!driver?.id) return;
    try {
      const { data } = await fetchDriver(driver.id);
      setDocuments(data.data.documents || []);
    } catch {
      toast.error('Failed to load documents');
    }
  }, [driver?.id, toast]);

  useEffect(() => {
    fetchVehicles({ status: 'available' })
      .then((res) => setVehicles(res.data?.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (driver) {
      reset({
        name: driver.name || '',
        mobile: driver.mobile || '',
        address: driver.address || '',
        licenseNumber: driver.licenseNumber || '',
        driverType: driver.driverType || 'own',
        defaultVehicleId: driver.defaultVehicleId ? String(driver.defaultVehicleId) : '',
        status: driver.status || 'available',
        grossSalary: driver.grossSalary ?? '',
        notes: driver.notes || '',
      });
      loadDocuments();
    } else {
      reset();
      setDocuments([]);
    }
  }, [driver, reset, loadDocuments]);

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      address: values.address || null,
      licenseNumber: values.licenseNumber?.trim() || null,
      defaultVehicleId: values.defaultVehicleId ? Number(values.defaultVehicleId) : null,
      grossSalary: values.grossSalary === '' || values.grossSalary == null ? null : Number(values.grossSalary),
      notes: values.notes || null,
    };
    if (!isEdit) {
      payload.licenseExpiry = null;
    }
    try {
      if (isEdit) {
        await updateDriver(driver.id, payload);
        toast.success('Driver updated');
        onSuccess?.();
      } else {
        const { data } = await createDriver(payload);
        toast.success('Driver created — you can upload documents after saving');
        onSuccess?.(data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save driver');
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !driver?.id) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);
    setUploading(true);
    try {
      await uploadDriverDocument(driver.id, formData);
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
      await deleteDriverDocument(driver.id, docId);
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
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Name <span className="text-red-500">*</span>
          </label>
          <input className="input-field" {...register('name')} />
          {err('name')}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Mobile <span className="text-red-500">*</span>
          </label>
          <input className="input-field" {...register('mobile')} />
          {err('mobile')}
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
          <textarea rows={2} className="input-field" {...register('address')} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">License Number</label>
          <input className="input-field" {...register('licenseNumber')} />
          {err('licenseNumber')}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Driver Type <span className="text-red-500">*</span>
          </label>
          <select className="input-field" {...register('driverType')}>
            <option value="own">Own</option>
            <option value="outside">Outside</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Default Vehicle</label>
          <select className="input-field" {...register('defaultVehicleId')}>
            <option value="">None</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vehicleNumber}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
          <select className="input-field" {...register('status')}>
            <option value="available">Available</option>
            <option value="assigned">Assigned</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Gross Salary (monthly)</label>
        <input type="number" min="0" step="0.01" className="input-field" {...register('grossSalary')} />
        {err('grossSalary')}
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
        </div>
      )}

      {!isEdit && (
        <p className="text-xs text-slate-500">Save the driver first, then edit to upload documents.</p>
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
