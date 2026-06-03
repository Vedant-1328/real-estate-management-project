import { useEffect, useState } from 'react';

/** True when the ref element is visible in the viewport. */
export function useInView(ref, rootMargin = '80px') {
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = ref?.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin, threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return inView;
}
