import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { AlertService } from 'qubefin-core';
import { IResetPassword } from '../../../models/user';
import { form, FormField, required, schema, Schema, validate } from '@angular/forms/signals';
import { UserService } from '../../../services/user-service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucideDynamicIcon } from '@lucide/angular';
import { CommonModule } from '@angular/common';
import { Validators } from '@angular/forms';
@Component({
  selector: 'qfin-reset-password-modal',
  imports: [
    MatDialogModule,
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    FormField,
    LucideDynamicIcon,
  ],
  templateUrl: './reset-password-modal.html',
  styles: ``,
})
export class ResetPasswordModal {
  private readonly alertService = inject(AlertService);
  private readonly userService = inject(UserService);
  private readonly dialogData = inject(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<ResetPasswordModal>);
  readonly userId = this.dialogData.userId;
  protected readonly resetModel = signal<IResetPassword>({
    password: '',
    confirmPassword: '',
  });
  protected readonly resetSchema: Schema<IResetPassword> = schema((path) => {
    required(path.password, { message: 'Password is required' });
    required(path.confirmPassword, { message: 'Confirm Password is required' });
    validate(path.confirmPassword, ({ value, valueOf }) => {
      return value() === valueOf(path.password)
        ? null
        : { kind: 'passwordMismatch', message: 'Passwords do not match' };
    });
  });
  protected readonly resetForm = form(this.resetModel, this.resetSchema);

  onSubmit() {
    this.resetForm().markAsTouched();
    if (!this.resetForm().valid()) {
      return;
    }
    const data = this.resetForm().value();
    this.userService.resetPassword(data, this.userId).subscribe({
      next: (resp: any) => {
        this.alertService.success('Success', resp).then(() => {
          this.dialogRef.close(true);
        });
      },
      error: (err: any) => {},
    });
  }
  onCancel() {
    this.dialogRef.close(false);
  }
}
