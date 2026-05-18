import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboardSummary } from '../../api/dashboard.js';
import { useAuth } from '../../hooks/useAuth.js';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import { Skeleton, StatCardSkeleton, TableSkeleton } from '../../components/Skeleton.jsx';
import StatCard from '../../components/StatCard.jsx';
import Table from '../../components/Table.jsx';
import { formatCurrency } from '../../utils/formatters.js';
import {
  getAssignmentStatusBadge,
  getInvoiceStatusBadge,
} from '../../utils/statusBadges.js';

const REFRESH_MS = 60_000;

export default function HomePage() {
  const { accessToken, isLoading: authLoading } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSummary = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const { data: res } = await fetchDashboardSummary();
      setData(res.data);
    } catch (err) {
      if (!err.response) {
        setError(
          'Cannot reach the API server. Start the backend (cd supplier-mgmt/backend && npm run dev), then refresh.'
        );
      } else {
        setError(err.response?.data?.message || 'Failed to load dashboard');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !accessToken) return;
    loadSummary();
    const interval = setInterval(() => loadSummary(true), REFRESH_MS);
    return () => clearInterval(interval);
  }, [loadSummary, authLoading, accessToken]);

  const stats = data
    ? [
        { label: "Today's Jobs", value: data.todayJobsTotal, accent: 'blue' },
        { label: 'Completed', value: data.todayJobsCompleted, accent: 'green' },
        { label: 'Pending EOD', value: data.pendingEodCount, accent: 'amber' },
        { label: "Today's Trips", value: data.todayTripsTotal, accent: 'slate' },
        {
          label: "Today's Revenue",
          value: formatCurrency(data.todayRevenue),
          accent: 'green',
        },
        {
          label: "Today's Expenses",
          value: formatCurrency(data.todayExpenses),
          accent: 'red',
        },
        { label: 'Vehicles Assigned', value: data.vehiclesAssignedToday, accent: 'blue' },
        { label: 'Vehicles Available', value: data.vehiclesAvailable, accent: 'slate' },
        { label: 'Pending Invoices', value: data.pendingInvoicesCount, accent: 'amber' },
        {
          label: 'Outstanding',
          value: formatCurrency(data.outstandingAmount),
          accent: 'red',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Overview for today · auto-refreshes every 60 seconds
          </p>
        </div>
        <Button variant="secondary" onClick={() => loadSummary()} disabled={loading}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
        {loading && !data
          ? Array.from({ length: 10 }).map((_, i) => <StatCardSkeleton key={i} />)
          : stats.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} accent={stat.accent} />
            ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <DashboardPanel title="Today's Assignments" loading={loading && !data}>
          {loading && !data ? (
            <TableSkeleton rows={6} cols={4} />
          ) : (
            <Table
              columns={[
                { key: 'driver', label: 'Driver' },
                { key: 'vehicle', label: 'Vehicle' },
                { key: 'company', label: 'Company' },
                { key: 'jobType', label: 'Job' },
                { key: 'route', label: 'Route' },
                { key: 'status', label: 'Status' },
              ]}
              data={(data?.todayAssignments ?? []).map((row) => {
                const badge = getAssignmentStatusBadge(row.status);
                return {
                  ...row,
                  route: `${row.fromSite} → ${row.toSite}`,
                  status: <Badge variant={badge.variant}>{badge.label}</Badge>,
                };
              })}
            />
          )}
        </DashboardPanel>

        <DashboardPanel title="Pending EOD Entries" loading={loading && !data}>
          {loading && !data ? (
            <TableSkeleton rows={6} cols={4} />
          ) : (
            <Table
              columns={[
                { key: 'date', label: 'Date' },
                { key: 'driver', label: 'Driver' },
                { key: 'vehicle', label: 'Vehicle' },
                { key: 'company', label: 'Company' },
                { key: 'jobType', label: 'Job' },
                { key: 'action', label: '' },
              ]}
              data={(data?.pendingEodList ?? []).map((row) => ({
                ...row,
                action: (
                  <Link to={`/eod-entries?assignmentId=${row.assignmentId}`}>
                    <Button className="text-xs">Add EOD</Button>
                  </Link>
                ),
              }))}
            />
          )}
        </DashboardPanel>

        <DashboardPanel title="Pending Invoices" loading={loading && !data}>
          {loading && !data ? (
            <TableSkeleton rows={6} cols={3} />
          ) : (
            <Table
              columns={[
                { key: 'company', label: 'Company' },
                { key: 'billingAmount', label: 'Amount' },
                { key: 'status', label: 'Status' },
              ]}
              data={(data?.pendingInvoicesList ?? []).map((row) => {
                const badge = getInvoiceStatusBadge(row.status);
                return {
                  ...row,
                  billingAmount: formatCurrency(row.billingAmount),
                  status: <Badge variant={badge.variant}>{badge.label}</Badge>,
                };
              })}
            />
          )}
        </DashboardPanel>
      </div>
    </div>
  );
}

function DashboardPanel({ title, children, loading }) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {loading && <Skeleton className="mt-1 h-3 w-20" />}
      </div>
      <div className="min-h-[200px] flex-1 overflow-x-auto">{children}</div>
    </div>
  );
}
