import { Component, computed, effect, inject, signal, Type, ViewChild, ViewContainerRef } from '@angular/core';
import { Router } from '@angular/router';
import { LoginStateStore } from 'qubefin-core';
import { ValidateLogin } from '../../components/validate-login/validate-login';
import { VerifyMfa } from '../../components/verify-mfa/verify-mfa';
import { RegisterMfa } from '../../components/register-mfa/register-mfa';
import { NgComponentOutlet } from '@angular/common';

@Component({
	selector: 'qfin-login',
	imports: [NgComponentOutlet],
	templateUrl: './login.html',
})
export class Login {
	private router = inject(Router);
	private loginStateStore = inject(LoginStateStore);

	constructor() {
		effect(() => {
			const step = this.loginStateStore.loginState().step;
			if (step === 'complete') {
				queueMicrotask(() => this.router.navigateByUrl('/secure/home/dashboard'));
			}
		});
	}

	private componentMap: Record<string, Type<any>> = {
		login: ValidateLogin,
		mfa: VerifyMfa,
		'register-mfa': RegisterMfa,
	} as const;

	activeComponent = computed(() => {
		const step = this.loginStateStore.loginState().step;
		if (step === 'complete') {
			// Handle complete state, e.g., redirect to dashboard
			return null;
		}
		return this.componentMap[step] ?? null;
	});

}
