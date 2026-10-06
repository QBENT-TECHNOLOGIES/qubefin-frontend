import { HttpBackend, HttpClient, HttpErrorResponse, HttpHeaders, HttpStatusCode } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, shareReplay, tap, throwError } from 'rxjs';
import { ApiPaths } from '../enums/api-paths';
import { EnvConfig } from '../env-config';
import { AuthStore } from '../stores/auth-store';

const REFUSED_STATUSES: number[] = [
  HttpStatusCode.BadRequest,
  HttpStatusCode.Unauthorized,
  HttpStatusCode.Forbidden,
];

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

@Injectable({
  providedIn: 'root',
})
export class TokenRefreshService {
  // HttpBackend skips every interceptor, so the refresh call can never trigger a refresh itself
  // and a failed refresh does not raise the generic error alert.
  private readonly httpClient = new HttpClient(inject(HttpBackend));
  private readonly envConfig = inject(EnvConfig);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  // Requests that fail together share one refresh call instead of each sending their own,
  // which would invalidate each other when the refresh token rotates.
  private refreshInFlight$: Observable<string> | null = null;

  refresh(): Observable<string> {
    if (!this.refreshInFlight$) {
      // GET refresh-token reads the refresh token from the Refresh-Token header. The expired
      // access token is sent as the usual bearer header in case the API reads the user from it.
      const headers = new HttpHeaders({
        'Refresh-Token': this.authStore.refreshToken() ?? '',
        Authorization: 'Bearer ' + (this.authStore.accessToken() ?? ''),
      });

      this.refreshInFlight$ = this.httpClient
        .get<RefreshTokenResponse>(`${this.envConfig.getGatewayPath()}${ApiPaths.AUTH}/refresh-token`, {
          headers,
        })
        .pipe(
          tap((response) => {
            this.authStore.setAccessToken(response.accessToken);
            this.authStore.setRefreshToken(response.refreshToken);
          }),
          map((response) => response.accessToken),
          catchError((error: HttpErrorResponse) => {
            console.error('Token refresh failed', error.status, error.error);

            // Only a refused refresh token ends the session. A wrong route, a server fault or a
            // lost connection leaves the user signed in and surfaces as that call's own error.
            if (REFUSED_STATUSES.includes(error.status)) {
              this.authStore.logout();
              this.router.navigate(['/public/auth/login']);
            }
            return throwError(() => error);
          }),
          finalize(() => (this.refreshInFlight$ = null)),
          shareReplay(1),
        );
    }

    return this.refreshInFlight$;
  }
}
