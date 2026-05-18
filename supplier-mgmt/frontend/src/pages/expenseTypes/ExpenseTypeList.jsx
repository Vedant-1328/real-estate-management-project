import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  createExpenseType,
  deleteExpenseType,
  fetchExpenseTypes,
  updateExpenseType,
} from '../../api/expenseTypes.js';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import Table from '../../components/Table.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});

export default function ExpenseTypeList() {
  const toast = useToast();
  const confirm = useConfirm();
  const canView = usePermission('expense_types', 'view');
  const canAdd = usePermission('expense_types', 'add');
  const canEdit = usePermission('expense_types', 'edit');
  const canDelete = usePermission('expense_types', 'delete');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const { data } = await fetchExpenseTypes();
      setItems(data.data);
    } catch {
      toast.error('Failed to load expense types');
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
      await updateExpenseType(row.id, { status: next });
      toast.success(`Marked as ${next}`);
      load();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: 'Delete expense type',
      message: `Delete "${row.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteExpenseType(row.id);
      toast.success('Expense type deleted');
      load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (!canView) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        You do not have permission to view expense types.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expense Types</h1>
          <p className="mt-1 text-sm text-slate-600">Categories for daily expense entries</p>
        </div>
        {canAdd && (
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Add Expense Type
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
              { key: 'status', label: 'Status' },
              { key: 'actions', label: 'Actions' },
            ]}
            data={items.map((row) => ({
              ...row,
              description: row.description || '—',
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

      <ExpenseTypeModal
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
        canSave={canAdd || canEdit}
      />
    </div>
  );
}

function ExpenseTypeModal({ open, item, onClose, onSuccess, canSave }) {
  const toast = useToast();
  const isEdit = Boolean(item);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', status: 'active' },
  });

  useEffect(() => {
    if (open) {
      reset(
        item
          ? { name: item.name, description: item.description || '', status: item.status }
          : { name: '', description: '', status: 'active' }
      );
    }
  }, [open, item, reset]);

  const onSubmit = async (values) => {
    try {
      if (isEdit) {
        await updateExpenseType(item.id, values);
        toast.success('Expense type updated');
      } else {
        await createExpenseType(values);
        toast.success('Expense type created');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Expense Type' : 'Add Expense Type'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Name *</label>
          <input className="input-field" disabled={!canSave} {...register('name')} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea rows={2} className="input-field" disabled={!canSave} {...register('description')} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
          <select className="input-field" disabled={!canSave} {...register('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {canSave && (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
