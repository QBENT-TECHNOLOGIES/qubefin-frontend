import { CommonModule, DatePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField, required, schema, Schema } from '@angular/forms/signals';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';
import { IJoiningInfo } from '../../../../models/employee-detail';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { EmployeeService } from '../../../../services/employee-service';
import { EmployeeStore } from '../../../../stores/employee-store';
@Component({
  selector: 'qfin-joining-info-modal',
  providers: [provideNativeDateAdapter(), DatePipe],
  imports: [
    CommonModule,
    FormsModule,
    LucideDynamicIcon,
    MatFormFieldModule,
    MatInputModule,
    FormField,
    MatDatepickerModule,
  ],
  templateUrl: './joining-info-modal.html',
  styles: ``,
})
export class JoiningInfoModal {
  private readonly alertService = inject(AlertService);
  private dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);
  readonly dialogRef = inject(MatDialogRef<JoiningInfoModal>);
  private readonly dialogData = inject(MAT_DIALOG_DATA);
  private readonly employeeService = inject(EmployeeService);
  private readonly employeeStore = inject(EmployeeStore);
  readonly joiningInfo = this.employeeStore.joiningInfo;
  readonly today = new Date(new Date().setHours(0, 0, 0, 0));
  protected readonly joiningInfoModel = signal<IJoiningInfo>({
    employeeId: '',
    monthlyCtc: null,
    offerLetterDate: null,
    referenceNo: '',
  });
  protected readonly joiningInfoSchema: Schema<IJoiningInfo> = schema((path) => {
    required(path.monthlyCtc);
    required(path.offerLetterDate);
  });
  protected readonly joiningInfoForm = form(this.joiningInfoModel, this.joiningInfoSchema);
  empId = signal<string>('');
  constructor() {
    this.dateAdapter.setLocale('en-GB');
    const id = this.dialogData?.employeeId;
    this.employeeStore.setJoiningEmployeeId(id);
    if (id) {
      this.empId.set(id);
    }
    effect(() => {
      const data = this.joiningInfo();
      if (data) {
        this.joiningInfoModel.set({
          employeeId: data.employeeId || this.empId(),
          monthlyCtc: data.monthlyCtc ?? null,
          offerLetterDate: data.offerLetterDate ? new Date(data.offerLetterDate) : null,
          referenceNo: data.referenceNo ?? '',
        } as IJoiningInfo);
      }
    });
  }

  onAdd() {
    this.joiningInfoForm().markAsTouched();
    if (this.joiningInfoForm().invalid()) {
      return;
    }
    const formValue = this.joiningInfoForm().value();
    const dataToSave = {
      ...this.joiningInfoForm().value(),
      employeeId: this.empId(),
      offerLetterDate: this.datePipe.transform(formValue.offerLetterDate, 'yyyy-MM-dd'),
    };
    this.employeeService.addJoiningInfo(dataToSave).subscribe({
      next: (resp: any) => {
        this.alertService.success('Success', resp).then(() => {
          this.employeeStore.refreshDetail();
          this.employeeStore.joiningInfoResource.reload();
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
