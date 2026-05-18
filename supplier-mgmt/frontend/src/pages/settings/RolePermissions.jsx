import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchRolePermissions, saveRolePermissions } from '../../api/roles.js';
import Button from '../../components/Button.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { ACTION_LABELS, MODULE_LABELS } from '../../utils/reportHelpers.js';

const GRID_ACTIONS = [
  'view',
  'add',
  'edit',
  'delete',
  'approve',
  'export',
  'print',
  'generate_invoice',
];

export default function RolePermissions() {
  const { id } = useParams();
  const toast = useToast();
  const canEdit = usePermission('roles', 'edit');
  const canView = usePermission('roles', 'view');

  const [role, setRole] = useState(null);
  const [modules, setModules] = useState([]);
  const [grid, setGrid] = useState({});
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const { data } = await fetchRolePermissions(id);
      setRole(data.data.role);
      setModules(data.data.modules);
      setGrid(data.data.grid);
      setReadOnly(data.data.readOnly);
    } catch {
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, [canView, id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (moduleName, action) => {
    if (readOnly || !canEdit) return;
    setGrid((prev) => ({
      ...prev,
      [moduleName]: {
        ...prev[moduleName],
        [action]: !prev[moduleName]?.[action],
      },
    }));
  };

  const toggleRow = (moduleName) => {
    if (readOnly || !canEdit) return;
    const allOn = GRID_ACTIONS.every((a) => grid[moduleName]?.[a]);
    setGrid((prev) => ({
      ...prev,
      [moduleName]: Object.fromEntries(GRID_ACTIONS.map((a) => [a, !allOn])),
    }));
  };

  const handleSave = async () => {
    const permissions = [];
    modules.forEach((moduleName) => {
      GRID_ACTIONS.forEach((action) => {
        permissions.push({
          moduleName,
          action,
          allowed: Boolean(grid[moduleName]?.[action]),
        });
      });
    });

    setSaving(true);
    try {
      await saveRolePermissions(id, permissions);
      toast.success('Permissions saved');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!canView) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        You do not have permission to view roles.
      </p>
    );
  }

  if (loading) {
    return <p className="py-8 text-center text-sm text-slate-500">Loading…</p>;
  }

  return (
    <section className="space-y-6">
      <header>
        <Link to="/roles" className="text-sm text-blue-600 hover:underline">
          ← Back to roles
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Permissions for {role?.name}
        </h1>
        {readOnly && (
          <p className="mt-1 text-sm text-amber-700">Super Admin permissions cannot be edited.</p>
        )}
      </header>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[800px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left font-semibold text-slate-800">Module</th>
              {GRID_ACTIONS.map((action) => (
                <th key={action} className="px-2 py-3 text-center font-semibold text-slate-800">
                  {ACTION_LABELS[action] || action}
                </th>
              ))}
              <th className="px-4 py-3 text-center font-semibold text-slate-800">All</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((moduleName) => (
              <tr key={moduleName} className="border-b border-slate-100">
                <td className="px-4 py-2 font-medium text-slate-800">
                  {MODULE_LABELS[moduleName] || moduleName}
                </td>
                {GRID_ACTIONS.map((action) => (
                  <td key={action} className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={Boolean(grid[moduleName]?.[action])}
                      onChange={() => toggle(moduleName, action)}
                      disabled={readOnly || !canEdit}
                    />
                  </td>
                ))}
                <td className="px-4 py-2 text-center">
                  <button
                    type="button"
                    className="text-xs font-medium text-blue-600 hover:underline disabled:text-slate-400"
                    onClick={() => toggleRow(moduleName)}
                    disabled={readOnly || !canEdit}
                  >
                    Toggle row
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {canEdit && !readOnly && (
        <footer>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Permissions'}
          </Button>
        </footer>
      )}
    </section>
  );
}
