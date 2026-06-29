import { Component, inject, signal } from '@angular/core';
import { AuthStore, LoginStateStore } from 'qubefin-core';
import { AuthService } from '../../services/auth-service';
import { VerifyMfaModel } from '../../models/verify-mfa-model';
import { form, FormField, required, schema, Schema } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
	selector: 'qfin-verify-mfa',
	imports: [FormField, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
	templateUrl: './verify-mfa.html'
})
export class VerifyMfa {
	authStore = inject(AuthStore);
	loginStateStore = inject(LoginStateStore);
	authService = inject(AuthService);

	protected readonly mfaModel = signal<VerifyMfaModel>({
		mfaCode: '',
	});
	protected readonly mfaSchema: Schema<VerifyMfaModel> = schema((path) => {
		required(path.mfaCode, { message: 'MFA code is required' });
	});
	protected readonly mfaForm = form(this.mfaModel, this.mfaSchema);

	protected onSubmit(event: Event) {
		if (this.mfaForm().valid()) {
			const request = { mfaCode: this.mfaForm().value().mfaCode, sessionToken: this.authStore.sessionToken() || '' };
			this.authService.verifyMfa(request).subscribe({
				next: (response) => {
					if (response) {
						this.authStore.setSessionToken(null);
						this.authStore.setAccessToken(response.accessToken);
						this.loginStateStore.setLoginStep('complete');
					}
				},
				error: (err: any) => {
					if (err.error) {
						// this.message.set(err.error.message);
						// this.messageType.set('error');
					}
				}
			});
		}
		event.preventDefault();
	}

	protected onMfaRegister() {
		this.loginStateStore.setLoginStep('register-mfa');
	}
}
