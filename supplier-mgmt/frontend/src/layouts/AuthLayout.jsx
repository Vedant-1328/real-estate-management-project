import { Outlet } from 'react-router-dom';
import { APP_NAME, APP_TAGLINE } from '../utils/constants.js';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-slate-600">{APP_TAGLINE}</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
