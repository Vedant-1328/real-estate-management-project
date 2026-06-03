import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchDashboardSummary } from '../../api/dashboard.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useDashboardSwipeRefresh } from '../../hooks/useDashboardSwipeRefresh.js';
import Badge from '../../components/Badge.jsx';
import { Skeleton, StatCardSkeleton, TableSkeleton } from '../../components/Skeleton.jsx';
import DashboardScene3D from '../../components/DashboardScene3D.jsx';
import StatCard from '../../components/StatCard.jsx';
import Table from '../../components/Table.jsx';
import { formatCurrency } from '../../utils/formatters.js';
import { getInvoiceStatusBadge } from '../../utils/statusBadges.js';

const REFRESH_MS = 60_000;

const todayLabel = () =>
  new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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
      return true;
    } catch (err) {
      if (!err.response) {
        setError(
          'Cannot reach the API server. Start the backend (cd supplier-mgmt/backend && npm run dev), then refresh.'
        );
      } else {
        setError(err.response?.data?.message || 'Failed to load dashboard');
      }
      return false;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const refreshWithAnimation = useCallback(async () => {
    return loadSummary(true);
  }, [loadSummary]);

  const swipe = useDashboardSwipeRefresh(refreshWithAnimation);

  useEffect(() => {
    if (authLoading || !accessToken) return;
    loadSummary();
    const interval = setInterval(() => {
      if (!document.hidden) loadSummary(true);
    }, REFRESH_MS);
    return () => clearInterval(interval);
  }, [loadSummary, authLoading, accessToken]);

  const stats = useMemo(
    () =>
      data
        ? [
        { label: "Today's EODs", value: data.todayJobsTotal, accent: 'blue' },
        { label: 'Approved', value: data.todayJobsCompleted, accent: 'green' },
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
        { label: 'Vehicles On Job', value: data.vehiclesAssignedToday, accent: 'blue' },
        { label: 'Vehicles Available', value: data.vehiclesAvailable, accent: 'slate' },
        { label: 'Drivers Available', value: data.driversAvailable ?? 0, accent: 'green' },
        { label: 'Pending Invoices', value: data.pendingInvoicesCount, accent: 'amber' },
        {
          label: 'Outstanding',
          value: formatCurrency(data.outstandingAmount),
          accent: 'red',
        },
          ]
        : [],
    [data]
  );

  const detailAnim = swipe.animGeneration > 0;
  const pullStyle = {
    '--pull-offset': `${swipe.pullDistance}px`,
    '--pull-progress': swipe.pullProgress,
  };

  return (
    <div
      ref={swipe.rootRef}
      className={`dashboard-premium dashboard-swipe-root${swipe.refreshing ? ' dashboard-swipe-root--refreshing' : ''}${swipe.pullReady ? ' dashboard-swipe-root--ready' : ''}`}
      style={pullStyle}
      {...swipe.handlers}
    >
      <div
        className="dashboard-pull-indicator"
        aria-hidden
        style={{ opacity: swipe.pullDistance > 8 || swipe.refreshing ? 1 : 0 }}
      >
        <div
          className={`dashboard-pull-indicator__ring${swipe.refreshing ? ' dashboard-pull-indicator__ring--spin' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
        <span className="dashboard-pull-indicator__text">
          {swipe.refreshing
            ? 'Updating telemetry…'
            : swipe.pullReady
              ? 'Release to refresh'
              : 'Swipe down to refresh'}
        </span>
      </div>

      <div
        className={`dashboard-content-shift${swipe.pullDistance > 0 || swipe.refreshing ? ' dashboard-content-shift--pulled' : ''}`}
      >
        <div className="dashboard-hero-3d dashboard-pull-zone">
          <div className="dashboard-hero-3d__mesh" aria-hidden />
          <div className="dashboard-hero-3d__orb dashboard-hero-3d__orb--1" aria-hidden />
          <div className="dashboard-hero-3d__orb dashboard-hero-3d__orb--2" aria-hidden />
          <div className="relative grid items-center gap-6 p-6 lg:grid-cols-[1fr_minmax(280px,360px)] lg:gap-10 lg:p-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="dashboard-badge-live">
                    <span className="live-dot h-1.5 w-1.5 rounded-full" />
                    Today's pulse
                  </span>
                  <span className="dashboard-badge-date">{todayLabel()}</span>
                </div>
                <p className="dashboard-hero-eyebrow">Command Center</p>
                <h1 className="dashboard-hero-title">Dashboard</h1>
                <p className="dashboard-hero-sub">
                  Swipe down to refresh · auto-sync every 60 seconds
                </p>
              </div>
              <button
                type="button"
                className="dashboard-btn-refresh"
                onClick={() => swipe.triggerRefresh()}
                disabled={loading || swipe.refreshing}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Sync now
              </button>
            </div>
            <DashboardScene3D
              refreshing={swipe.refreshing}
              summary={
                data
                  ? {
                      jobs: data.todayJobsTotal,
                      approved: data.todayJobsCompleted,
                      trips: data.todayTripsTotal,
                    }
                  : null
              }
            />
          </div>
        </div>

        {error && (
          <div className="dashboard-detail-item rounded-xl border border-rose-200/80 bg-gradient-to-r from-rose-50 to-white px-4 py-3 text-sm font-medium text-rose-700 shadow-sm ring-1 ring-rose-100">
            {error}
          </div>
        )}

        <div
          key={swipe.animGeneration}
          className={`dashboard-details-stream${detailAnim ? ' dashboard-details-stream--animate' : ''}`}
        >
          <section>
            <div className="dashboard-section-head dashboard-detail-item" style={{ animationDelay: '0ms' }}>
              <h2 className="dashboard-section-title">Today at a glance</h2>
              <span className="dashboard-section-line" aria-hidden />
            </div>
            <div className="dashboard-stats-3d grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
              {loading && !data
                ? Array.from({ length: 11 }).map((_, i) => <StatCardSkeleton key={i} />)
                : stats.map((stat, i) => (
                    <StatCard
                      key={stat.label}
                      label={stat.label}
                      value={stat.value}
                      accent={stat.accent}
                      variant="3d"
                      animate={detailAnim}
                      animDelay={Math.min(i * 35, 280)}
                    />
                  ))}
            </div>
          </section>

          <DashboardPanel
            title="Drivers Available"
            subtitle="Fleet drivers on payroll with available status"
            loading={loading && !data}
            animDelay={120}
            animate={detailAnim}
          >
            {loading && !data ? (
              <div className="flex flex-wrap gap-3 p-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 min-w-[180px] flex-1 rounded-xl" />
                ))}
              </div>
            ) : (data?.driversAvailableList ?? []).length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                No fleet drivers are marked available right now.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3 p-5">
                {(data?.driversAvailableList ?? []).map((driver, i) => (
                  <div
                    key={driver.id}
                    className={`driver-chip-premium flex min-w-[200px] max-w-full flex-1 flex-col sm:max-w-[280px]${detailAnim ? ' dashboard-detail-item' : ''}`}
                    style={detailAnim ? { animationDelay: `${160 + i * 40}ms` } : undefined}
                  >
                    <p className="driver-chip-premium__name">{driver.name}</p>
                    {driver.mobile && (
                      <p className="driver-chip-premium__meta">{driver.mobile}</p>
                    )}
                    {driver.vehicle && (
                      <p className="driver-chip-premium__meta">Vehicle · {driver.vehicle}</p>
                    )}
                    {driver.licenseNumber && (
                      <p className="driver-chip-premium__meta dim">Lic · {driver.licenseNumber}</p>
                    )}
                    <span className="driver-chip-premium__badge">Available</span>
                  </div>
                ))}
              </div>
            )}
          </DashboardPanel>

          <DashboardPanel
            title="Today's EOD Entries"
            subtitle="Captured trips, drivers, and amounts"
            loading={loading && !data}
            animDelay={200}
            animate={detailAnim}
          >
            {loading && !data ? (
              <TableSkeleton rows={8} cols={7} />
            ) : (
              <Table
                embedded
                columns={[
                  { key: 'driver', label: 'Driver' },
                  { key: 'vehicle', label: 'Vehicle' },
                  { key: 'company', label: 'Company' },
                  { key: 'jobType', label: 'Job' },
                  { key: 'route', label: 'Route' },
                  { key: 'actualTrips', label: 'Trips' },
                  { key: 'totalAmount', label: 'Amount' },
                  { key: 'approved', label: 'Approved' },
                ]}
                data={(data?.todayEodEntries ?? []).map((row) => ({
                  ...row,
                  route: `${row.fromSite} → ${row.toSite}`,
                  totalAmount: formatCurrency(row.totalAmount),
                  approved: (
                    <Badge variant={row.approved ? 'success' : 'default'}>
                      {row.approved ? 'Approved' : 'Pending'}
                    </Badge>
                  ),
                }))}
              />
            )}
          </DashboardPanel>

          <DashboardPanel
            title="Pending Invoices"
            subtitle="Billing follow-up"
            loading={loading && !data}
            animDelay={280}
            animate={detailAnim}
          >
            {loading && !data ? (
              <TableSkeleton rows={6} cols={3} />
            ) : (
              <Table
                embedded
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
    </div>
  );
}

function DashboardPanel({ title, subtitle, children, loading, animDelay = 0, animate = false }) {
  return (
    <section
      className={`dashboard-panel-premium${animate ? ' dashboard-detail-item' : ''}`}
      style={animate ? { animationDelay: `${animDelay}ms` } : undefined}
    >
      <div className="dashboard-panel-premium__head">
        <div className="dashboard-panel-premium__accent" aria-hidden />
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="dashboard-panel-premium__title">{title}</h2>
            {subtitle && <p className="dashboard-panel-premium__sub">{subtitle}</p>}
          </div>
          {loading && <Skeleton className="h-3 w-16 rounded-full opacity-40" />}
        </div>
      </div>
      <div className="dashboard-panel-premium__body">{children}</div>
    </section>
  );
}
