import { Component, inject, OnInit, signal } from '@angular/core';
import { AuthStore, LoginStateStore } from 'qubefin-core';
import { UserService } from '../../../app/services/user-service';

@Component({
	selector: 'qfin-register-mfa',
	imports: [],
	templateUrl: './register-mfa.html'
})
export class RegisterMfa implements OnInit {
	private authStore = inject(AuthStore);
	private loginStateStore = inject(LoginStateStore);
	private userService = inject(UserService);

	mfaKey = signal<string>('');
	qrCodeImageUrl = signal<string>('');

	ngOnInit(): void {
		this.userService.registerMfa(this.authStore.sessionToken()!).subscribe({
			next: (response) => {
				if (response) {
					this.mfaKey.set(response.mfaKey);
					this.qrCodeImageUrl.set(response.qrCodeImageUrl);
				}
			},
			error: (err: any) => {
				if (err.error) {
					
				}
			}
		});
	}

	onSubmit() {
		this.userService.enableMfa(this.authStore.sessionToken()!).subscribe({
			next: (response) => {
				if (response) {
					this.authStore.setSessionToken(response.sessionToken);
					this.loginStateStore.setLoginStep('mfa');
				}
			}
		});
	}

	onBack() {
		this.loginStateStore.setLoginStep('mfa');
	}
}
