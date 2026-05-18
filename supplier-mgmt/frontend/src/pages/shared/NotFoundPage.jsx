import { Link } from 'react-router-dom';
import Button from '../../components/Button.jsx';

export default function NotFoundPage() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-6xl font-bold text-slate-300">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/dashboard" className="mt-8">
        <Button>Go to Dashboard</Button>
      </Link>
    </section>
  );
}
