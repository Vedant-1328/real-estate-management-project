import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createRole, fetchRoles } from '../../api/roles.js';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import Table from '../../components/Table.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';

export default function RoleList() {
  const toast = useToast();
  const canView = usePermission('roles', 'view');
  const canAdd = usePermission('roles', 'add');
  const canEdit = usePermission('roles', 'edit');

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const { data } = await fetchRoles();
      setRoles(data.data);
    } catch {
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, [canView, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createRole({ name, description: description || null });
      toast.success('Role created');
      setCreateOpen(false);
      setName('');
      setDescription('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create role');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canView) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        You do not have permission to view roles.
      </p>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-slate-600">Configure access for each role</p>
        </div>
        {canAdd && <Button onClick={() => setCreateOpen(true)}>Add Role</Button>}
      </header>

      <Table
            loading={loading}
            error={loadError}
            onRetry={load}
          columns={[
            { key: 'name', label: 'Role Name' },
            { key: 'description', label: 'Description' },
            { key: 'permissionCount', label: 'Permissions' },
            { key: 'actions', label: 'Actions' },
          ]}
          data={roles.map((r) => ({
            ...r,
            description: r.description || '—',
            actions:
              canEdit && r.name !== 'Super Admin' ? (
                <Link
                  to={`/roles/${r.id}/permissions`}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Edit Permissions
                </Link>
              ) : r.name === 'Super Admin' ? (
                <span className="text-sm text-slate-400">Locked</span>
              ) : (
                '—'
              ),
          }))}
        />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Role">
        <form onSubmit={handleCreate} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Name
            <input
              className="input-field mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Description
            <textarea
              className="input-field mt-1"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <footer className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create'}
            </Button>
          </footer>
        </form>
      </Modal>
    </section>
  );
}
