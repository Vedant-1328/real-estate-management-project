import { useCallback, useEffect, useState } from 'react';
import { deleteVehicle, fetchVehicles } from '../../api/vehicles.js';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import Table from '../../components/Table.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatDate } from '../../utils/formatters.js';
import VehicleForm from './VehicleForm.jsx';

const STATUS_BADGE = {
  available: { label: 'Available', variant: 'success' },
  assigned: { label: 'Assigned', variant: 'info' },
  maintenance: { label: 'Maintenance', variant: 'warning' },
  inactive: { label: 'Inactive', variant: 'default' },
};

const OWNER_LABELS = { own: 'Own', rented: 'Rented', third_party: 'Third Party' };

function ExpiryAlertIcon({ alerts }) {
  if (!alerts?.length) return <span className="text-slate-300">—</span>;

  const tooltip = alerts
    .map((a) => `${a.type}: ${formatDate(a.expiryDate)}`)
    .join('\n');

  return (
    <span
      className="group relative inline-flex cursor-help text-lg"
      title={tooltip}
      aria-label="Expiry alert"
    >
      ⚠️
      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-48 -translate-x-1/2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-left text-xs text-amber-900 shadow-lg group-hover:block">
        <p className="mb-1 font-semibold">Expiring within 30 days</p>
        <ul className="space-y-0.5">
          {alerts.map((a) => (
            <li key={a.type}>
              {a.type}: {formatDate(a.expiryDate)}
            </li>
          ))}
        </ul>
      </span>
    </span>
  );
}

export default function VehicleList() {
  const toast = useToast();
  const confirm = useConfirm();
  const canView = usePermission('vehicles', 'view');
  const canAdd = usePermission('vehicles', 'add');
  const canEdit = usePermission('vehicles', 'edit');
  const canDelete = usePermission('vehicles', 'delete');

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [status, setStatus] = useState('all');
  const [ownerType, setOwnerType] = useState('all');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await fetchVehicles({
        status: status === 'all' ? undefined : status,
        ownerType: ownerType === 'all' ? undefined : ownerType,
        search: search || undefined,
      });
      setVehicles(data.data ?? []);
    } catch {
      setLoadError('Failed to load vehicles.');
    } finally {
      setLoading(false);
    }
  }, [canView, status, ownerType, search, toast]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: 'Delete vehicle',
      message: `Delete vehicle ${row.vehicleNumber}? This cannot be undone.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteVehicle(row.id);
      toast.success('Vehicle deleted');
      load();
    } catch {
      toast.error('Failed to delete vehicle');
    }
  };

  if (!canView) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        You do not have permission to view vehicles.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vehicles</h1>
          <p className="mt-1 text-sm text-slate-600">Fleet registry, compliance dates, and documents</p>
        </div>
        {canAdd && (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Add Vehicle
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <input
          type="search"
          placeholder="Search vehicle number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[180px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="assigned">Assigned</option>
          <option value="maintenance">Maintenance</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={ownerType}
          onChange={(e) => setOwnerType(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">All Owner Types</option>
          <option value="own">Own</option>
          <option value="rented">Rented</option>
          <option value="third_party">Third Party</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <Table
            showSrNo
            loading={loading}
            error={loadError}
            onRetry={load}
            columns={[
              { key: 'vehicleNumber', label: 'Vehicle Number' },
              { key: 'vehicleType', label: 'Type' },
              { key: 'vehicleModel', label: 'Model' },
              { key: 'ownerType', label: 'Owner Type' },
              { key: 'status', label: 'Status' },
              { key: 'expiry', label: 'Expiry' },
              { key: 'actions', label: 'Actions' },
            ]}
            data={vehicles.map((v) => {
              const st = STATUS_BADGE[v.status] || STATUS_BADGE.inactive;
              return {
                ...v,
                ownerType: (
                  <Badge variant="default">{OWNER_LABELS[v.ownerType] || v.ownerType}</Badge>
                ),
                status: <Badge variant={st.variant}>{st.label}</Badge>,
                expiry: <ExpiryAlertIcon alerts={v.expiryAlerts} />,
                actions: (
                  <div className="flex gap-2">
                    {canEdit && (
                      <button
                        type="button"
                        className="text-sm font-medium text-slate-700 hover:text-slate-900"
                        onClick={() => {
                          setEditing(v);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(v)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ),
              };
            })}
          />
      </div>

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? `Edit — ${editing.vehicleNumber}` : 'Add Vehicle'}
        size="lg"
      >
        <VehicleForm
          vehicle={editing}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSuccess={(created) => {
            load();
            if (created) {
              setEditing(created);
            } else {
              setFormOpen(false);
              setEditing(null);
            }
          }}
        />
      </Modal>
    </div>
  );
}
