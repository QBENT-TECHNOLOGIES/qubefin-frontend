import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { EnvConfig } from '../env-config';
import { AuthStore } from '../stores/auth-store';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
	const envConfig = inject(EnvConfig);
	const authStore = inject(AuthStore);

	req = req.clone({
		url: `${envConfig.getGatewayPath()}${req.url}`
	});

	if (authStore.isAuthenticated()) {
		const clonedReq = req.clone({
			headers: req.headers.set('Authorization', 'Bearer ' + authStore.accessToken())
		})

		return next(clonedReq);
	}

	return next(req);
};
