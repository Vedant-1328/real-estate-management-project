import { useEffect, useState } from 'react';
import { createUser, resetUserPassword, updateUser } from '../../api/users.js';
import { fetchRoles } from '../../api/roles.js';
import Button from '../../components/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useServerFieldError } from '../../hooks/useServerFieldError.js';

export default function UserForm({ user, onSuccess, onCancel, mode = 'edit' }) {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const isCreate = mode === 'create';
  const isReset = mode === 'reset';

  const [roles, setRoles] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [roleId, setRoleId] = useState('');
  const [status, setStatus] = useState('active');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const serverEmail = useServerFieldError('email');
  const serverPassword = useServerFieldError('password');

  useEffect(() => {
    fetchRoles()
      .then((res) => setRoles(res.data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user && !isReset) {
      setName(user.name || '');
      setEmail(user.email || '');
      setMobile(user.mobile || '');
      setRoleId(String(user.roleId || ''));
      setStatus(user.status || 'active');
    }
    if (isReset) {
      setPassword('');
    }
  }, [user, isReset]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isReset) {
        await resetUserPassword(user.id, { password });
        toast.success('Password reset');
      } else if (isCreate) {
        await createUser({
          name,
          email,
          mobile: mobile || null,
          roleId: Number(roleId),
          status,
          password,
        });
        toast.success('User created');
      } else {
        await updateUser(user.id, {
          name,
          email,
          mobile: mobile || null,
          roleId: Number(roleId),
          status,
        });
        toast.success('User updated');
      }
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = 'input-field';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isReset && (
        <>
          <label className="block text-sm font-medium text-slate-700">
            Name <span className="text-red-500">*</span>
            <input className={`${fieldClass} mt-1`} value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Email <span className="text-red-500">*</span>
            <input
              type="email"
              className={`${fieldClass} mt-1`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {serverEmail && <p className="mt-1 text-xs text-red-600">{serverEmail}</p>}
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Mobile
            <input className={`${fieldClass} mt-1`} value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Role <span className="text-red-500">*</span>
            <select
              className={`${fieldClass} mt-1`}
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              required
              disabled={user?.id === currentUser?.id}
            >
              <option value="">Select role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {user?.id === currentUser?.id && (
              <p className="mt-1 text-xs text-slate-500">You cannot change your own role.</p>
            )}
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Status
            <select
              className={`${fieldClass} mt-1`}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </>
      )}

      {(isCreate || isReset) && (
        <label className="block text-sm font-medium text-slate-700">
          {isReset ? 'New Password' : 'Password'} <span className="text-red-500">*</span>
          <input
            type="password"
            className={`${fieldClass} mt-1`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          {serverPassword && <p className="mt-1 text-xs text-red-600">{serverPassword}</p>}
        </label>
      )}

      <footer className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : isReset ? 'Reset Password' : isCreate ? 'Create' : 'Update'}
        </Button>
      </footer>
    </form>
  );
}
