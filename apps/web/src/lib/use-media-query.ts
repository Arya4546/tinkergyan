import { useSyncExternalStore } from 'react';

/** Tailwind's `md` breakpoint is 768px, so "mobile" is anything narrower. */
export const MOBILE_QUERY = '(max-width: 767px)';

/** True when the viewport matches the CSS media query; updates on resize/rotate. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Phones and small tablets in portrait (< 768px wide). */
export const useIsMobile = (): boolean => useMediaQuery(MOBILE_QUERY);

/** Same check without subscribing — for one-off decisions inside handlers. */
export const isMobileNow = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches;
