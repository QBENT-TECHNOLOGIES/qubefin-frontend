import { Component, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ValidateLoginModel } from '../../models/validate-login-model';

@Component({
	selector: 'qfin-validate-login',
	imports: [FormField, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
	templateUrl: './validate-login.html'
})
export class ValidateLogin {
	hidePassword = signal(true);

	protected readonly loginModel = signal<ValidateLoginModel>({
		username: '',
		password: ''
	});

	protected readonly loginForm = form(this.loginModel);

	submit() {

		// if (this.loginForm.invalid()) {
		// 	this.loginForm.markAllAsTouched();
		// 	return;
		// }

		console.log(this.loginForm().value());

	}
}

