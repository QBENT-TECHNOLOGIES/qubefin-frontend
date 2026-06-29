import { Component, inject, signal } from '@angular/core';
import { FormField, Schema, form, required, schema } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ValidateLoginModel } from '../../models/validate-login-model';
import { AuthService } from '../../services/auth-service';
import { AuthStore, LoginStateStore } from 'qubefin-core';

@Component({
	selector: 'qfin-validate-login',
	imports: [FormField, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
	imports: [FormField, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
	templateUrl: './validate-login.html'
})
export class ValidateLogin {
	authStore = inject(AuthStore)
	loginStateStore = inject(LoginStateStore);
	authService = inject(AuthService);

	hidePassword = signal(true);

	protected readonly loginModel = signal<ValidateLoginModel>({
		userName: '',
		password: ''
	});
	protected readonly loginSchema: Schema<ValidateLoginModel> = schema((path) => {
		required(path.userName, { message: 'User Name is required' });
		required(path.password, { message: 'Password is required' });
	});
	protected readonly loginForm = form(this.loginModel);

	protected onSubmit(event: Event) {
		if (this.loginForm().valid()) {
			this.authService.validateLogin(this.loginForm().value()).subscribe({
				next: (response) => {
					if (response) {
						this.authStore.setSessionToken(response.sessionToken);
						this.loginStateStore.setLoginStep('mfa');
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
}

