import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

import { AuthInterceptor, ENV_CONFIG } from 'qubefin-core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
	providers: [
		provideBrowserGlobalErrorListeners(),
		provideHttpClient(withInterceptors([AuthInterceptor])),
		provideRouter(routes),
		{
			provide: ENV_CONFIG,
			useValue: environment
		}
	]
};
