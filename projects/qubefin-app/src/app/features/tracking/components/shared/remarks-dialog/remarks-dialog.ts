import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucideDynamicIcon } from '@lucide/angular';

export interface RemarksDialogData {
  title: string;
  message?: string;
  label?: string;
  placeholder?: string;
  confirmText?: string;
  icon?: string;
  tone?: 'primary' | 'danger' | 'success';
  required?: boolean;
}

/** Asks for a short reason before an audited action. Closes with the text, or undefined. */
@Component({
  selector: 'qfin-remarks-dialog',
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, LucideDynamicIcon],
  templateUrl: './remarks-dialog.html',
})
export class RemarksDialog {
  readonly data = inject<RemarksDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<RemarksDialog, string>);

  readonly remarks = signal('');
  readonly submitted = signal(false);
  readonly valid = computed(() => !(this.data.required ?? true) || this.remarks().trim().length >= 3);
  readonly tone = this.data.tone ?? 'primary';

  cancel() {
    this.dialogRef.close();
  }

  confirm() {
    this.submitted.set(true);
    if (this.valid()) this.dialogRef.close(this.remarks().trim());
  }
}
