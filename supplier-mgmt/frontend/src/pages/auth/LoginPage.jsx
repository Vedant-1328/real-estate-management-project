import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import Button from '../../components/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { APP_NAME } from '../../utils/constants.js';
import { useServerFieldError } from '../../hooks/useServerFieldError.js';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [error, setError] = useState('');
  const serverEmail = useServerFieldError('email');
  const serverPassword = useServerFieldError('password');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [from, isAuthenticated, isLoading, navigate]);

  const onSubmit = async (values) => {
    setError('');
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch (err) {
      if (!err.response) {
        setError(
          'Cannot reach the API server. In a separate terminal run: cd supplier-mgmt/backend && npm run dev'
        );
        return;
      }
      if (err.response.status === 429) {
        setError(err.response.data?.message || 'Too many login attempts. Try again later.');
        return;
      }
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="auth-spinner mx-auto" />
        <p className="mt-4 text-sm font-medium text-slate-400">Checking session…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-100">Welcome back</h2>
        <p className="mt-1 text-sm text-slate-400">
          Sign in to {APP_NAME} — manage fleet, sites, and billing.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {error && (
          <div className="auth-alert" role="alert">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="auth-label">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="auth-input"
            placeholder="you@company.com"
            {...register('email')}
          />
          {(errors.email || serverEmail) && (
            <p className="auth-error">{errors.email?.message || serverEmail}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="auth-label">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="auth-input"
            placeholder="••••••••"
            {...register('password')}
          />
          {(errors.password || serverPassword) && (
            <p className="auth-error">{errors.password?.message || serverPassword}</p>
          )}
        </div>

        <Button type="submit" className="auth-btn-signin w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
