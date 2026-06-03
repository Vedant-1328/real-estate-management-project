import { useCallback, useEffect, useState } from 'react';
import { deleteDriver, fetchDrivers, quickAddOutsideDriver } from '../../api/drivers.js';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import Table from '../../components/Table.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatDate } from '../../utils/formatters.js';
import DriverForm from './DriverForm.jsx';

const STATUS_BADGE = {
  available: { label: 'Available', variant: 'success' },
  assigned: { label: 'Assigned', variant: 'info' },
  inactive: { label: 'Inactive', variant: 'default' },
};

const DRIVER_TYPE_LABELS = { own: 'Own', outside: 'Outside' };

function LicenseExpiryCell({ driver }) {
  if (!driver.licenseExpiry) return <span className="text-slate-400">—</span>;

  const expiring = driver.licenseExpiringSoon;
  return (
    <div>
      <span className={expiring ? 'font-medium text-red-600' : 'text-slate-700'}>
        {formatDate(driver.licenseExpiry)}
      </span>
      {driver.licenseNumber && (
        <p className="text-xs text-slate-500">{driver.licenseNumber}</p>
      )}
      {expiring && (
        <p className="text-xs font-medium text-red-600">Expires within 30 days</p>
      )}
    </div>
  );
}

function QuickAddOutsideForm({ onSuccess, onCancel }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSubmitting(true);
    try {
      await quickAddOutsideDriver({
        name: name.trim(),
        mobile: mobile.trim() || undefined,
        vehicleNumber: vehicleNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success('Outside driver added');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add driver');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field w-full"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Mobile</label>
        <input
          type="text"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          className="input-field w-full"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Vehicle Number</label>
        <input
          type="text"
          value={vehicleNumber}
          onChange={(e) => setVehicleNumber(e.target.value)}
          className="input-field w-full"
          placeholder="Links to fleet if found"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="input-field w-full"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Add Driver'}
        </Button>
      </div>
    </form>
  );
}

export default function DriverList() {
  const toast = useToast();
  const confirm = useConfirm();
  const canView = usePermission('drivers', 'view');
  const canAdd = usePermission('drivers', 'add');
  const canEdit = usePermission('drivers', 'edit');
  const canDelete = usePermission('drivers', 'delete');

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [status, setStatus] = useState('all');
  const [driverType, setDriverType] = useState('all');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await fetchDrivers({
        status: status === 'all' ? undefined : status,
        driverType: driverType === 'all' ? undefined : driverType,
        search: search || undefined,
      });
      setDrivers(data.data ?? []);
    } catch {
      setLoadError('Failed to load drivers.');
      toast.error('Failed to load drivers');
    } finally {
      setLoading(false);
    }
  }, [canView, status, driverType, search, toast]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: 'Delete driver',
      message: `Delete driver ${row.name}? This cannot be undone.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteDriver(row.id);
      toast.success('Driver deleted');
      load();
    } catch {
      toast.error('Failed to delete driver');
    }
  };

  if (!canView) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        You do not have permission to view drivers.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Drivers</h1>
          <p className="mt-1 text-sm text-slate-600">
            Own and outside drivers, licenses, and documents
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAdd && (
            <>
              <Button variant="secondary" onClick={() => setQuickOpen(true)}>
                Quick Add Outside
              </Button>
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Add Driver
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <input
          type="search"
          placeholder="Search name or mobile…"
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
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={driverType}
          onChange={(e) => setDriverType(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">All Types</option>
          <option value="own">Own</option>
          <option value="outside">Outside</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <Table
            loading={loading}
            error={loadError}
            onRetry={load}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'mobile', label: 'Mobile' },
              { key: 'driverType', label: 'Type' },
              { key: 'status', label: 'Status' },
              { key: 'license', label: 'License Expiry' },
              { key: 'vehicle', label: 'Default Vehicle' },
              { key: 'actions', label: 'Actions' },
            ]}
            data={drivers.map((d) => {
              const st = STATUS_BADGE[d.status] || STATUS_BADGE.inactive;
              return {
                ...d,
                driverType: (
                  <Badge variant={d.driverType === 'outside' ? 'warning' : 'default'}>
                    {DRIVER_TYPE_LABELS[d.driverType] || d.driverType}
                  </Badge>
                ),
                status: <Badge variant={st.variant}>{st.label}</Badge>,
                license: <LicenseExpiryCell driver={d} />,
                vehicle: d.defaultVehicle?.vehicleNumber || (
                  <span className="text-slate-400">—</span>
                ),
                actions: (
                  <div className="flex gap-2">
                    {canEdit && (
                      <button
                        type="button"
                        className="text-sm font-medium text-slate-700 hover:text-slate-900"
                        onClick={() => {
                          setEditing(d);
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
                        onClick={() => handleDelete(d)}
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
        title={editing ? `Edit — ${editing.name}` : 'Add Driver'}
        size="lg"
      >
        <DriverForm
          driver={editing}
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

      <Modal
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        title="Quick Add Outside Driver"
        size="md"
      >
        <QuickAddOutsideForm
          onCancel={() => setQuickOpen(false)}
          onSuccess={() => {
            setQuickOpen(false);
            load();
          }}
        />
      </Modal>
    </div>
  );
}
