import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

import { AuthInterceptor, ENV_CONFIG } from 'qubefin-core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ENV_CONFIG } from 'qubefin-core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';

export const appConfig: ApplicationConfig = {
	providers: [
		provideBrowserGlobalErrorListeners(),
		provideHttpClient(withInterceptors([AuthInterceptor])),
		{
			provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
			useValue: { appearance: 'fill' }
		},
		provideRouter(routes),
		{
			provide: ENV_CONFIG,
			useValue: environment
		}
	]
};
