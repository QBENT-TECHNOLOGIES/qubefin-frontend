import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

import { AuthInterceptor, ENV_CONFIG } from 'qubefin-core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';

import { provideLucideIcons } from '@lucide/angular';
import { APP_ICONS } from './lucide-icons';
import { HttpErrorInterceptor } from './interceptors/http-error.interceptor';
import { trackingMockInterceptor } from './features/tracking/mocks/tracking-mock.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // trackingMockInterceptor must stay last; it only answers tracking-api calls when environment.useTrackingMocks is true.
    provideHttpClient(withInterceptors([AuthInterceptor, HttpErrorInterceptor, trackingMockInterceptor])),
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'fill' },
    },
    provideRouter(routes),
    {
      provide: ENV_CONFIG,
      useValue: environment,
    },
    provideLucideIcons(...APP_ICONS),
  ],
};
