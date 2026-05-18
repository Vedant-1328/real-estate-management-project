import { useCallback, useEffect, useState } from 'react';
import { deleteUser, fetchUsers, updateUser } from '../../api/users.js';
import { fetchRoles } from '../../api/roles.js';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import Table from '../../components/Table.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatDate } from '../../utils/formatters.js';
import UserForm from './UserForm.jsx';

const STATUS_BADGE = {
  active: { label: 'Active', variant: 'success' },
  inactive: { label: 'Inactive', variant: 'default' },
};

export default function UserList() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user: currentUser } = useAuth();
  const canView = usePermission('users', 'view');
  const canAdd = usePermission('users', 'add');
  const canEdit = usePermission('users', 'edit');
  const canDelete = usePermission('users', 'delete');
  const isSuperAdmin = currentUser?.roleName === 'Super Admin';

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [roleId, setRoleId] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchRoles()
      .then((res) => setRoles(res.data.data))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await fetchUsers({
        roleId: roleId === 'all' ? undefined : roleId,
        status: status === 'all' ? undefined : status,
        search: search || undefined,
      });
      setUsers(data.data);
    } catch {
      setLoadError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [canView, roleId, status, search, toast]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const openForm = (mode, user = null) => {
    setFormMode(mode);
    setEditing(user);
    setFormOpen(true);
  };

  const handleDeactivate = async (row) => {
    const ok = await confirm({
      title: 'Deactivate user',
      message: `Deactivate user ${row.name}?`,
      confirmLabel: 'Deactivate',
    });
    if (!ok) return;
    try {
      await updateUser(row.id, { status: 'inactive' });
      toast.success('User deactivated');
      load();
    } catch {
      toast.error('Failed to deactivate user');
    }
  };

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: 'Delete user',
      message: `Delete user ${row.name}? This cannot be undone.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteUser(row.id);
      toast.success('User deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  if (!canView) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        You do not have permission to view users.
      </p>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="mt-1 text-sm text-slate-600">Manage system users and access</p>
      </header>

      <section className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          {canAdd && (
            <Button onClick={() => openForm('create')}>Add User</Button>
          )}
        </header>

        <fieldset className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <label className="text-xs text-slate-600">
            Role
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-600">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="text-xs text-slate-600">
            Search
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, mobile"
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </fieldset>

        <Table
            loading={loading}
            error={loadError}
            onRetry={load}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'mobile', label: 'Mobile' },
              { key: 'role', label: 'Role' },
              { key: 'status', label: 'Status' },
              { key: 'lastLogin', label: 'Last Login' },
              { key: 'actions', label: 'Actions' },
            ]}
            data={users.map((u) => ({
              ...u,
              mobile: u.mobile || '—',
              role: <Badge label={u.roleName || '—'} variant="default" />,
              status: (
                <Badge
                  label={STATUS_BADGE[u.status]?.label || u.status}
                  variant={STATUS_BADGE[u.status]?.variant || 'default'}
                />
              ),
              lastLogin: u.lastLogin ? formatDate(u.lastLogin) : '—',
              actions: (
                <span className="flex flex-wrap gap-2">
                  {canEdit && (
                    <button
                      type="button"
                      className="text-sm font-medium text-slate-700"
                      onClick={() => openForm('edit', u)}
                    >
                      Edit
                    </button>
                  )}
                  {canEdit && isSuperAdmin && u.id !== currentUser?.id && (
                    <button
                      type="button"
                      className="text-sm font-medium text-slate-700"
                      onClick={() => openForm('reset', u)}
                    >
                      Reset Password
                    </button>
                  )}
                  {canEdit && u.status === 'active' && u.id !== currentUser?.id && (
                    <button
                      type="button"
                      className="text-sm font-medium text-amber-700"
                      onClick={() => handleDeactivate(u)}
                    >
                      Deactivate
                    </button>
                  )}
                  {canDelete && u.id !== currentUser?.id && (
                    <button
                      type="button"
                      className="text-sm font-medium text-red-600"
                      onClick={() => handleDelete(u)}
                    >
                      Delete
                    </button>
                  )}
                </span>
              ),
            }))}
          />
      </section>

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={
          formMode === 'create'
            ? 'Add User'
            : formMode === 'reset'
              ? 'Reset Password'
              : 'Edit User'
        }
      >
        <UserForm
          user={editing}
          mode={formMode}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSuccess={() => {
            setFormOpen(false);
            setEditing(null);
            load();
          }}
        />
      </Modal>
    </section>
  );
}
