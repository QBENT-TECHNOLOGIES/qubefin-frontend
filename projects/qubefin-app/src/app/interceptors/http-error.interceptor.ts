import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, map } from 'rxjs';
import { AlertService } from 'qubefin-core';

const MESSAGES = {
  INTERNAL_ERROR: 'An internal error has occurred. Please try again later.',
  NO_CONNECTION: 'No network connection. Please try again later.',
};

class HttpNoNetworkConnectionError extends Error {
  // Flag to indicate if this error has been handled
  wasCaught = false;

  constructor() {
    super('No network connection');
  }
}

/**
 * Set on a request (`context: new HttpContext().set(SKIP_ERROR_ALERT, true)`) when a failure is expected and handled by
 * the caller, e.g. background lookups that some users are not allowed to call. The error is still passed on, just no popup.
 */
export const SKIP_ERROR_ALERT = new HttpContextToken<boolean>(() => false);

export const HttpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_ERROR_ALERT)) return next(req);
  const alertService = inject(AlertService);

  return next(req).pipe(
    map((response: any) => {
      return response;
    }),
    catchError((errResponse) => {
      let errorMessage: string;

      if (checkNoNetworkConnection(errResponse)) {
        errorMessage = MESSAGES.NO_CONNECTION;

        errResponse = new HttpNoNetworkConnectionError();
        errResponse.wasCaught = true;
      } else if (is400ResponseError(errResponse)) {
        errorMessage = errResponse.error.message
          ? errResponse.error.message
          : errResponse.error.errors && errResponse.error.errors.length > 0
            ? errResponse.error.errors[0]
            : MESSAGES.INTERNAL_ERROR;
      } else if (is504ResponseError(errResponse)) {
        errorMessage = 'The request is taking longer than expected. Please try again in a moment.';
      } else {
        errorMessage = errResponse.error.message ?? errResponse.error.detail;
      }

      if (errorMessage) {
        alertService.error('Oops ....', errorMessage);
      }

      throw errResponse;
    }),
  );
};

function checkNoNetworkConnection(error: any): boolean {
  return (
    error instanceof HttpErrorResponse && !error.headers.keys().length && !error.ok && !error.status
  );
}

function is400ResponseError(error: any) {
  return error instanceof HttpErrorResponse && error.status === HttpStatusCode.BadRequest;
}

function is504ResponseError(error: any) {
  return error instanceof HttpErrorResponse && error.status === HttpStatusCode.GatewayTimeout;
}
