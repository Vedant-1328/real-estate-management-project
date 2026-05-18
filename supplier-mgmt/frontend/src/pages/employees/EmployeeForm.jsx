import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  createEmployee,
  deleteEmployeeDocument,
  fetchEmployee,
  updateEmployee,
  uploadEmployeeDocument,
} from '../../api/employees.js';
import Button from '../../components/Button.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatDate } from '../../utils/formatters.js';

const DOC_TYPES = [
  { value: 'id_proof', label: 'ID Proof' },
  { value: 'address_proof', label: 'Address Proof' },
  { value: 'other', label: 'Other' },
];

const EMPLOYEE_TYPE_OPTIONS = [
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'office_staff', label: 'Office Staff' },
  { value: 'helper', label: 'Helper' },
  { value: 'site_staff', label: 'Site Staff' },
];

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  mobile: z.string().min(1, 'Mobile is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  roleDepartment: z.string().min(1, 'Role/Department is required'),
  joiningDate: z.string().min(1, 'Joining date is required'),
  grossSalary: z.coerce.number().min(0, 'Gross salary is required'),
  employeeType: z.enum([
    'supervisor',
    'accountant',
    'office_staff',
    'helper',
    'site_staff',
    'driver',
  ]),
  status: z.enum(['active', 'inactive']),
  notes: z.string().optional(),
});

export default function EmployeeForm({ employee, onSuccess, onCancel }) {
  const toast = useToast();
  const confirm = useConfirm();
  const canDelete = usePermission('employees', 'delete');
  const isEdit = Boolean(employee?.id);

  const [documents, setDocuments] = useState([]);
  const [docType, setDocType] = useState('id_proof');
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
      email: '',
      roleDepartment: '',
      joiningDate: '',
      grossSalary: '',
      employeeType: 'office_staff',
      status: 'active',
      notes: '',
    },
  });

  const loadDocuments = useCallback(async () => {
    if (!employee?.id) return;
    try {
      const { data } = await fetchEmployee(employee.id);
      setDocuments(data.data.documents || []);
    } catch {
      toast.error('Failed to load documents');
    }
  }, [employee?.id, toast]);

  useEffect(() => {
    if (employee) {
      reset({
        name: employee.name || '',
        mobile: employee.mobile || '',
        email: employee.email || '',
        roleDepartment: employee.roleDepartment || '',
        joiningDate: employee.joiningDate?.slice(0, 10) || '',
        grossSalary: employee.grossSalary ?? '',
        employeeType: employee.employeeType || 'office_staff',
        status: employee.status || 'active',
        notes: employee.notes || '',
      });
      loadDocuments();
    } else {
      reset();
      setDocuments([]);
    }
  }, [employee, reset, loadDocuments]);

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      email: values.email || null,
      notes: values.notes || null,
    };
    try {
      if (isEdit) {
        await updateEmployee(employee.id, payload);
        toast.success('Employee updated');
        onSuccess?.();
      } else {
        const { data } = await createEmployee(payload);
        toast.success('Employee created — you can upload documents after saving');
        onSuccess?.(data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save employee');
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !employee?.id) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);
    setUploading(true);
    try {
      await uploadEmployeeDocument(employee.id, formData);
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
      await deleteEmployeeDocument(employee.id, docId);
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
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input type="email" className="input-field" {...register('email')} />
          {err('email')}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Role / Department <span className="text-red-500">*</span>
          </label>
          <input className="input-field" {...register('roleDepartment')} />
          {err('roleDepartment')}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Joining Date <span className="text-red-500">*</span>
          </label>
          <input type="date" className="input-field" {...register('joiningDate')} />
          {err('joiningDate')}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Gross Salary <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input-field"
            {...register('grossSalary')}
          />
          {err('grossSalary')}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Employee Type <span className="text-red-500">*</span>
          </label>
          <select className="input-field" {...register('employeeType')}>
            {EMPLOYEE_TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {err('employeeType')}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
          <select className="input-field" {...register('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
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
        <p className="text-xs text-slate-500">
          Save the employee first, then edit to upload documents.
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
