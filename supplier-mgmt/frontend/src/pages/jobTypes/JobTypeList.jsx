import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  createJobType,
  deleteJobType,
  fetchJobTypes,
  updateJobType,
} from '../../api/jobTypes.js';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import Table from '../../components/Table.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';

const UNIT_LABELS = { trip: 'Trip', hour: 'Hour', day: 'Day', fixed: 'Fixed' };

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  defaultUnit: z.enum(['trip', 'hour', 'day', 'fixed']),
  status: z.enum(['active', 'inactive']),
});

export default function JobTypeList() {
  const toast = useToast();
  const confirm = useConfirm();
  const canView = usePermission('job_types', 'view');
  const canAdd = usePermission('job_types', 'add');
  const canEdit = usePermission('job_types', 'edit');
  const canDelete = usePermission('job_types', 'delete');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const { data } = await fetchJobTypes();
      setItems(data.data);
    } catch {
      toast.error('Failed to load job types');
    } finally {
      setLoading(false);
    }
  }, [canView, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = async (row) => {
    if (!canEdit) return;
    const next = row.status === 'active' ? 'inactive' : 'active';
    try {
      await updateJobType(row.id, { status: next });
      toast.success(`Marked as ${next}`);
      load();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: 'Delete job type',
      message: `Delete "${row.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteJobType(row.id);
      toast.success('Job type deleted');
      load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (!canView) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        You do not have permission to view job types.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Job Types</h1>
          <p className="mt-1 text-sm text-slate-600">Define material and job categories</p>
        </div>
        {canAdd && (
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Add Job Type
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table
            loading={loading}
            error={loadError}
            onRetry={load}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'description', label: 'Description' },
              { key: 'defaultUnit', label: 'Default Unit' },
              { key: 'status', label: 'Status' },
              { key: 'actions', label: 'Actions' },
            ]}
            data={items.map((row) => ({
              ...row,
              description: row.description || '—',
              defaultUnit: UNIT_LABELS[row.defaultUnit] || row.defaultUnit,
              status: (
                <Badge variant={row.status === 'active' ? 'success' : 'default'}>
                  {row.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
              ),
              actions: (
                <div className="flex flex-wrap gap-2">
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        className="text-sm font-medium text-slate-700 hover:text-slate-900"
                        onClick={() => {
                          setEditing(row);
                          setModalOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-sm font-medium text-amber-700 hover:text-amber-900"
                        onClick={() => toggleStatus(row)}
                      >
                        {row.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(row)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ),
            }))}
          />
      </div>

      <JobTypeModal
        open={modalOpen}
        item={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSuccess={() => {
          setModalOpen(false);
          setEditing(null);
          load();
        }}
        canEdit={canAdd || canEdit}
      />
    </div>
  );
}

function JobTypeModal({ open, item, onClose, onSuccess, canEdit }) {
  const toast = useToast();
  const isEdit = Boolean(item);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      defaultUnit: 'trip',
      status: 'active',
    },
  });

  useEffect(() => {
    if (open) {
      reset(
        item
          ? {
              name: item.name,
              description: item.description || '',
              defaultUnit: item.defaultUnit,
              status: item.status,
            }
          : { name: '', description: '', defaultUnit: 'trip', status: 'active' }
      );
    }
  }, [open, item, reset]);

  const onSubmit = async (values) => {
    try {
      if (isEdit) {
        await updateJobType(item.id, values);
        toast.success('Job type updated');
      } else {
        await createJobType(values);
        toast.success('Job type created');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Job Type' : 'Add Job Type'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Name *" error={errors.name?.message}>
          <input
            className="input-field"
            disabled={!canEdit}
            {...register('name')}
          />
        </Field>
        <Field label="Description" error={errors.description?.message}>
          <textarea rows={2} className="input-field" disabled={!canEdit} {...register('description')} />
        </Field>
        <Field label="Default Unit" error={errors.defaultUnit?.message}>
          <select className="input-field" disabled={!canEdit} {...register('defaultUnit')}>
            {Object.entries(UNIT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status" error={errors.status?.message}>
          <select className="input-field" disabled={!canEdit} {...register('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {canEdit && (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
