import { DestroyRef, inject } from '@angular/core';

/** Default refresh cadence for live tracking screens. */
export const TRACKING_POLL_MS = 30_000;

/**
 * Calls `refresh` every `ms` while the calling component is alive and the browser tab is visible.
 * Must be called in an injection context (constructor / field initialiser).
 * Swap this for a SignalR subscription later without touching the stores.
 */
export function pollWhileVisible(refresh: () => void, ms = TRACKING_POLL_MS): void {
  const destroyRef = inject(DestroyRef);

  if (typeof window === 'undefined') return;

  const handle = window.setInterval(() => {
    if (document.visibilityState === 'visible') refresh();
  }, ms);

  // Refresh immediately when the user comes back to the tab.
  const onVisible = () => {
    if (document.visibilityState === 'visible') refresh();
  };
  document.addEventListener('visibilitychange', onVisible);

  destroyRef.onDestroy(() => {
    window.clearInterval(handle);
    document.removeEventListener('visibilitychange', onVisible);
  });
}
