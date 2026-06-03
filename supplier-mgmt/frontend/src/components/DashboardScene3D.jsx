import { useEffect, useMemo, useRef, useState } from 'react';
import { useInView } from '../hooks/useInView.js';

const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;

/** Dashboard hero — today's progress ring + activity bars */
export default function DashboardScene3D({ refreshing = false, summary = null }) {
  const ref = useRef(null);
  const inView = useInView(ref);
  const [tabVisible, setTabVisible] = useState(() =>
    typeof document !== 'undefined' ? !document.hidden : true
  );
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const onVis = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const animate = inView && tabVisible && !reduceMotion;

  const { jobs, approved, trips, pending, pct, maxBar } = useMemo(() => {
    const j = Number(summary?.jobs);
    const a = Number(summary?.approved);
    const t = Number(summary?.trips);
    const jobsVal = Number.isFinite(j) ? j : null;
    const approvedVal = Number.isFinite(a) ? a : null;
    const tripsVal = Number.isFinite(t) ? t : null;
    const pendingVal =
      jobsVal != null && approvedVal != null ? Math.max(0, jobsVal - approvedVal) : null;
    const percent =
      jobsVal != null && approvedVal != null
        ? jobsVal > 0
          ? Math.round((approvedVal / jobsVal) * 100)
          : 0
        : null;
    const peak = Math.max(jobsVal ?? 0, approvedVal ?? 0, tripsVal ?? 0, pendingVal ?? 0, 1);
    return {
      jobs: jobsVal,
      approved: approvedVal,
      trips: tripsVal,
      pending: pendingVal,
      pct: percent,
      maxBar: peak,
    };
  }, [summary]);

  const ringOffset = pct != null ? RING_C - (RING_C * pct) / 100 : RING_C;
  const isEmptyDay = jobs === 0 && approved === 0 && trips === 0;

  const rows = [
    { key: 'jobs', label: 'Jobs logged', value: jobs, color: 'dash-pulse__bar-fill--blue' },
    { key: 'approved', label: 'Approved EODs', value: approved, color: 'dash-pulse__bar-fill--green' },
    { key: 'trips', label: 'Trips today', value: trips, color: 'dash-pulse__bar-fill--amber' },
    { key: 'pending', label: 'Pending review', value: pending, color: 'dash-pulse__bar-fill--rose' },
  ];

  return (
    <div
      ref={ref}
      className={`dash-pulse${animate ? ' is-animating' : ''}${refreshing ? ' dash-pulse--sync' : ''}`}
      aria-label="Today's progress"
    >
      <p className="dash-pulse__eyebrow">Today&apos;s progress</p>

      <div className="dash-pulse__ring-block">
        <svg className="dash-pulse__ring-svg" viewBox="0 0 120 120" aria-hidden>
          <circle
            className="dash-pulse__ring-track"
            cx="60"
            cy="60"
            r={RING_R}
            fill="none"
            strokeWidth="10"
          />
          <circle
            className="dash-pulse__ring-fill"
            cx="60"
            cy="60"
            r={RING_R}
            fill="none"
            strokeWidth="10"
            strokeDasharray={RING_C}
            strokeDashoffset={ringOffset}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="dash-pulse__ring-center">
          <span className="dash-pulse__ring-pct">{pct != null ? `${pct}%` : '—'}</span>
          <span className="dash-pulse__ring-caption">EOD approved</span>
        </div>
      </div>

      <ul className="dash-pulse__bars">
        {rows.map((row) => {
          const width =
            row.value != null && maxBar > 0
              ? `${Math.max(6, (row.value / maxBar) * 100)}%`
              : '6%';
          return (
            <li key={row.key} className="dash-pulse__row">
              <div className="dash-pulse__row-head">
                <span className="dash-pulse__row-label">{row.label}</span>
                <span className="dash-pulse__row-value">
                  {row.value != null ? row.value : '—'}
                </span>
              </div>
              <div className="dash-pulse__bar-track">
                <span
                  className={`dash-pulse__bar-fill ${row.color}`}
                  style={{ width }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {isEmptyDay && summary != null && (
        <p className="dash-pulse__empty">No EOD entries logged for today yet.</p>
      )}
    </div>
  );
}
