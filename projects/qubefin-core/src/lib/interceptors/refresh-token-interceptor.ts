import { HttpErrorResponse, HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { TokenRefreshService } from '../services/token-refresh-service';
import { AuthStore } from '../stores/auth-store';

/**
 * When the API answers 401 (expired or invalid access token), renews the access token once
 * and sends the same request again with it. A second 401 is a real refusal and is passed on.
 */
export const RefreshTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const tokenRefreshService = inject(TokenRefreshService);

  return next(req).pipe(
    catchError((error) => {
      const isUnauthorized =
        error instanceof HttpErrorResponse && error.status === HttpStatusCode.Unauthorized;

      // Nothing to renew with (login calls, signed-out user), so the 401 is passed on unchanged.
      if (!isUnauthorized || !authStore.refreshToken()) {
        return throwError(() => error);
      }

      return tokenRefreshService
        .refresh()
        .pipe(
          switchMap((accessToken) =>
            next(req.clone({ headers: req.headers.set('Authorization', 'Bearer ' + accessToken) })),
          ),
        );
    }),
  );
};
