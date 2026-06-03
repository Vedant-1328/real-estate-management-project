import { useCallback, useEffect, useRef, useState } from 'react';

const PULL_THRESHOLD = 72;
const PULL_MAX = 120;

/**
 * Pull-down (swipe down) gesture to refresh dashboard with animated feedback.
 */
export function useDashboardSwipeRefresh(onRefresh) {
  const rootRef = useRef(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const pullDistanceRef = useRef(0);
  const refreshingRef = useRef(false);

  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [animGeneration, setAnimGeneration] = useState(0);
  const pullRafRef = useRef(null);

  useEffect(() => {
    pullDistanceRef.current = pullDistance;
  }, [pullDistance]);

  const setPullDistanceRaf = useCallback((value) => {
    pullDistanceRef.current = value;
    if (pullRafRef.current != null) return;
    pullRafRef.current = requestAnimationFrame(() => {
      pullRafRef.current = null;
      setPullDistance(pullDistanceRef.current);
    });
  }, []);

  const isAtTop = useCallback(() => {
    const el = rootRef.current;
    if (!el) return true;
    const scrollParent = el.closest('main') || document.documentElement;
    return scrollParent.scrollTop <= 4;
  }, []);

  const triggerRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    setPullDistance(PULL_THRESHOLD);
    try {
      await onRefresh();
      setAnimGeneration((g) => g + 1);
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
      setPullDistance(0);
    }
  }, [onRefresh]);

  const releasePullWithRefresh = useCallback(() => {
    pulling.current = false;
    if (pullDistanceRef.current >= PULL_THRESHOLD) {
      triggerRefresh();
    } else {
      setPullDistance(0);
    }
  }, [triggerRefresh]);

  const onTouchStart = useCallback(
    (e) => {
      if (!isAtTop() || refreshingRef.current) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    },
    [isAtTop]
  );

  const onTouchMove = useCallback(
    (e) => {
      if (!pulling.current || refreshingRef.current) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && isAtTop()) {
        e.preventDefault();
        setPullDistanceRaf(Math.min(delta * 0.55, PULL_MAX));
      } else if (delta <= 0) {
        setPullDistanceRaf(0);
      }
    },
    [isAtTop, setPullDistanceRaf]
  );

  const onTouchEnd = useCallback(() => {
    if (!pulling.current) return;
    releasePullWithRefresh();
  }, [releasePullWithRefresh]);

  const onMouseDown = useCallback(
    (e) => {
      if (e.button !== 0 || !isAtTop() || refreshingRef.current) return;
      const inHero = e.target.closest('.dashboard-hero-3d, .dashboard-pull-zone');
      if (!inHero) return;
      startY.current = e.clientY;
      pulling.current = true;

      const onMove = (ev) => {
        if (!pulling.current) return;
        const delta = ev.clientY - startY.current;
        if (delta > 8 && isAtTop()) {
          setPullDistanceRaf(Math.min(delta * 0.45, PULL_MAX));
        }
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        if (!pulling.current) return;
        releasePullWithRefresh();
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [isAtTop, releasePullWithRefresh, setPullDistanceRaf]
  );

  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const pullReady = pullDistance >= PULL_THRESHOLD;

  return {
    rootRef,
    pullDistance,
    pullProgress,
    pullReady,
    refreshing,
    animGeneration,
    triggerRefresh,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onMouseDown,
    },
  };
}
