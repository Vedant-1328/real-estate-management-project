import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  createVehicleType,
  deleteVehicleType,
  fetchVehicleTypes,
  updateVehicleType,
} from '../../api/vehicleTypes.js';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import Table from '../../components/Table.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';

const BILLING_LABELS = {
  trip: 'Per trip',
  hour: 'Per hour',
  both: 'Per hour & per trip',
};

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  billingUnit: z.enum(['trip', 'hour', 'both']),
  showsCapacity: z.boolean(),
  status: z.enum(['active', 'inactive']),
});

export default function VehicleTypeList() {
  const toast = useToast();
  const confirm = useConfirm();
  const canView = usePermission('vehicle_types', 'view');
  const canAdd = usePermission('vehicle_types', 'add');
  const canEdit = usePermission('vehicle_types', 'edit');
  const canDelete = usePermission('vehicle_types', 'delete');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await fetchVehicleTypes();
      setItems(data.data ?? []);
    } catch {
      setLoadError('Failed to load vehicle types.');
      toast.error('Failed to load vehicle types');
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
      await updateVehicleType(row.id, { status: next });
      toast.success(`Marked as ${next}`);
      load();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: 'Delete vehicle type',
      message: `Delete "${row.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteVehicleType(row.id);
      toast.success('Vehicle type deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  if (!canView) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        You do not have permission to view vehicle types.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vehicle Types</h1>
          <p className="mt-1 text-sm text-slate-600">
            Fleet categories — hour-based types (e.g. JCB) bill EOD by hours, not trips
          </p>
        </div>
        {canAdd && (
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Add Vehicle Type
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table
          showSrNo
          loading={loading}
          error={loadError}
          onRetry={load}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'description', label: 'Description' },
            { key: 'billingUnit', label: 'EOD billing' },
            { key: 'showsCapacity', label: 'Capacity on vehicle' },
            { key: 'status', label: 'Status' },
            { key: 'actions', label: 'Actions' },
          ]}
          data={items.map((row) => ({
            ...row,
            description: row.description || '—',
            billingUnit: BILLING_LABELS[row.billingUnit] || row.billingUnit,
            showsCapacity: row.showsCapacity ? 'Yes' : '—',
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

      <VehicleTypeModal
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

function VehicleTypeModal({ open, item, onClose, onSuccess, canEdit }) {
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
      billingUnit: 'trip',
      showsCapacity: false,
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
              billingUnit: item.billingUnit,
              showsCapacity: Boolean(item.showsCapacity),
              status: item.status,
            }
          : {
              name: '',
              description: '',
              billingUnit: 'trip',
              showsCapacity: false,
              status: 'active',
            }
      );
    }
  }, [open, item, reset]);

  const onSubmit = async (values) => {
    try {
      if (isEdit) {
        await updateVehicleType(item.id, values);
        toast.success('Vehicle type updated');
      } else {
        await createVehicleType(values);
        toast.success('Vehicle type created');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Vehicle Type' : 'Add Vehicle Type'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Name *</label>
          <input className="input-field" {...register('name')} disabled={!canEdit} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea className="input-field" rows={2} {...register('description')} disabled={!canEdit} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">EOD billing *</label>
          <select className="input-field" {...register('billingUnit')} disabled={!canEdit}>
            <option value="trip">Per trip (tipper, truck, dumper, …)</option>
            <option value="hour">Per hour (JCB, Hitachi, …)</option>
            <option value="both">Per hour &amp; per trip (choose on each EOD entry)</option>
          </select>
          {errors.billingUnit && (
            <p className="mt-1 text-xs text-red-600">{errors.billingUnit.message}</p>
          )}
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            id="showsCapacity"
            className="h-4 w-4 rounded border-slate-300"
            {...register('showsCapacity')}
            disabled={!canEdit}
          />
          <label htmlFor="showsCapacity" className="text-sm text-slate-700">
            Show capacity field when adding a vehicle (e.g. Dumper)
          </label>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
          <select className="input-field" {...register('status')} disabled={!canEdit}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {canEdit && (
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            </Button>
          </div>
        )}
      </form>
    </Modal>
  );
}
