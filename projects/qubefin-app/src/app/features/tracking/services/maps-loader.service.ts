import { Injectable, inject, signal } from '@angular/core';
import { ENV_CONFIG } from 'qubefin-core';

export type MapsStatus = 'idle' | 'loading' | 'ready' | 'no-key' | 'error';

declare global {
  interface Window {
    __qfinMapsReady?: () => void;
    gm_authFailure?: () => void;
  }
}

/**
 * Loads the Google Maps JavaScript API once, on demand, using `MAP_API_KEY` from the environment.
 * Screens render <google-map> only when `status()` is 'ready'.
 */
@Injectable({ providedIn: 'root' })
export class MapsLoaderService {
  private readonly env = inject(ENV_CONFIG);
  private loading?: Promise<void>;

  readonly status = signal<MapsStatus>('idle');
  readonly errorMessage = signal<string | null>(null);

  /** Map ID required by Advanced Markers. 'DEMO_MAP_ID' works for development only. */
  get mapId(): string {
    return this.env?.MAP_ID || 'DEMO_MAP_ID';
  }

  load(): Promise<void> {
    if (this.loading) return this.loading;

    const key: string | undefined = this.env?.MAP_API_KEY;
    if (!key) {
      this.status.set('no-key');
      this.errorMessage.set('MAP_API_KEY is not set in the environment file.');
      this.loading = Promise.reject(new Error('missing key'));
      this.loading.catch(() => undefined);
      return this.loading;
    }

    this.status.set('loading');

    this.loading = new Promise<void>((resolve, reject) => {
      // Invalid / restricted key: Google calls this global.
      window.gm_authFailure = () => {
        this.status.set('error');
        this.errorMessage.set(
          'Google rejected the API key. Check that the Maps JavaScript API is enabled and that this site is an allowed referrer.',
        );
      };

      window.__qfinMapsReady = async () => {
        try {
          await Promise.all([
            google.maps.importLibrary('maps'),
            google.maps.importLibrary('marker'),
            google.maps.importLibrary('geometry'),
            google.maps.importLibrary('geocoding'),
          ]);
          this.status.set('ready');
          resolve();
        } catch (err) {
          this.fail('The Google Maps libraries could not be loaded.', reject, err);
        }
      };

      const script = document.createElement('script');
      script.src =
        `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}` +
        `&v=weekly&loading=async&libraries=marker,geometry&callback=__qfinMapsReady`;
      script.async = true;
      script.defer = true;
      script.onerror = (err) => this.fail('Could not reach maps.googleapis.com.', reject, err);
      document.head.appendChild(script);
    });

    this.loading.catch(() => undefined);
    return this.loading;
  }

  private fail(message: string, reject: (e: unknown) => void, err: unknown) {
    this.status.set('error');
    this.errorMessage.set(message);
    // Allow a retry on the next screen visit.
    this.loading = undefined;
    reject(err);
  }
}
