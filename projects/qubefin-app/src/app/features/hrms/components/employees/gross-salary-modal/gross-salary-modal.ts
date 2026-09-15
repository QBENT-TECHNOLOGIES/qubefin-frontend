import { Component, computed, effect, inject, signal } from '@angular/core';
import { OrganizationUnit } from '../../../../global/models/organization-unit';
import { IDesignation } from '../../../models/designation';
import { OrganizationUnitTypeStore } from '../../../../global/stores/organization-unit-type-store';
import { DateAdapter, MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { CommonModule, DatePipe } from '@angular/common';
import { IEmpGrossChangeHistory, IGrossSalary } from '../../../models/employee-detail';
import { form, FormField, readonly, required, schema, Schema } from '@angular/forms/signals';
import { OrganizationUnitService } from '../../../../global/services/organization-unit-service';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { EmployeeService } from '../../../services/employee-service';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { EmployeeStore } from '../../../stores/employee-store';
import { ApprovalWorkflowStore } from '../../../stores/approval-workflow-store';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, tap } from 'rxjs';
@Component({
  selector: 'qfin-gross-salary-modal',
  providers: [provideNativeDateAdapter(), DatePipe],
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    LucideDynamicIcon,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormField,
    MatTableModule,
    MatDatepickerModule,
  ],
  templateUrl: './gross-salary-modal.html',
  styles: ``,
})
export class GrossSalaryModal {
  private readonly alertService = inject(AlertService);
  readonly dialogRef = inject(MatDialogRef<GrossSalaryModal>);
  private readonly dialogData = inject(MAT_DIALOG_DATA);
  private dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);
  private readonly employeeService = inject(EmployeeService);
  private readonly organizationUnitService = inject(OrganizationUnitService);
  private readonly organizationUnitTypeStore = inject(OrganizationUnitTypeStore);
  private readonly employeeStore = inject(EmployeeStore);
  private readonly approvalWorkflowStore = inject(ApprovalWorkflowStore);

  readonly displayedColumns = computed(() => {
    return ['sl', 'grossSalary', 'fromDate', 'toDate', 'status'];
  });

  grossChangesHistoryList = signal<IEmpGrossChangeHistory[]>([]);
  readonly salaryGrades = this.approvalWorkflowStore.salaryGrades;

  protected readonly grossChangeModel = signal<IGrossSalary>({
    id: '',
    employeeId: '',
    salaryGradeId: '',
    grossSalary: null,
    effectiveFrom: null,
  });
  protected readonly grossChangeSchema: Schema<IGrossSalary> = schema((path) => {
    required(path.salaryGradeId, { message: 'Grade is required' });
    required(path.grossSalary, { message: 'Gross Salary is required' });
    required(path.effectiveFrom, { message: 'Effective From is required' });
    readonly(path.effectiveFrom, { when: () => true });
  });
  protected readonly grossChangeForm = form(this.grossChangeModel, this.grossChangeSchema);
  empId = signal<string>('');
  constructor() {
    this.dateAdapter.setLocale('en-GB');

    const id = this.dialogData?.id;
    if (id) {
      this.empId.set(id);
    }
  }
  private grossDataResource = rxResource({
    params: () => ({ id: this.empId() }),
    stream: ({ params }) => {
      if (params.id && params.id !== '') {
        return this.employeeService.getGrossSalaryByEmployeeId(params.id).pipe(
          tap((resp: any) => {
            if (resp) {
              if (resp.employeeGrossSalaryHistory) {
                const historyData: IEmpGrossChangeHistory[] = resp.employeeGrossSalaryHistory.map(
                  (item: any) => ({
                    id: item.id,
                    salaryGrade: item.salaryGradeId,
                    grossSalary: item.grossSalary,
                    effectiveFrom: item.effectiveFrom,
                    effectiveTill: item.effectiveTill,
                  }),
                );
                this.grossChangesHistoryList.set(historyData);
              }

              if (resp.currentGrossSalary) {
                const officialInfo = resp.currentGrossSalary;

                this.grossChangeModel.update((state) => ({
                  ...state,
                  grossSalary: officialInfo.grossSalary || null,
                  salaryGradeId: officialInfo.salaryGradeId || '',
                  effectiveFrom: officialInfo.effectiveFrom || null,
                }));
              }
            }
          }),
        );
      } else {
        return of(null);
      }
    },
  });
  getSalaryStatus(effectiveFrom: string, effectiveTill: string | null): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const from = new Date(effectiveFrom);
    from.setHours(0, 0, 0, 0);

    if (from > today) {
      return 'Upcoming';
    }
    if (effectiveTill) {
      const till = new Date(effectiveTill);
      till.setHours(0, 0, 0, 0);

      if (till < today) {
        return 'Inactive';
      }
    }
    return 'Present';
  }
  onSave() {
    this.grossChangeForm().markAsTouched();
    if (!this.grossChangeForm().valid()) {
      return;
    }
    const formValue = this.grossChangeForm().value();
    const dataToSave = {
      ...this.grossChangeForm().value(),
      effectiveFrom: this.datePipe.transform(formValue.effectiveFrom, 'yyyy-MM-dd'),
      employeeId: this.empId(),
    };
    this.employeeService.changeGrossSalary(dataToSave).subscribe({
      next: (resp: any) => {
        this.alertService.success('Success', resp).then(() => {
          // this.dialogRef.close(true);
          this.grossDataResource.reload();
        });
      },
      error: (err: any) => {
        if (err.error?.isError) {
        }
      },
    });
  }

  onGradeChange(id: string) {
    if (!id || id === EMPTY_UUID) {
      return;
    }

    const selectedGrade = this.salaryGrades().find((grade: any) => grade.id === id);

    if (selectedGrade) {
      this.grossChangeModel.update((state) => ({
        ...state,
        grossSalary: selectedGrade.grossSalary,
      }));
    }
  }
  onCancel() {
    this.dialogRef.close(false);
    this.employeeStore.refreshList();
  }
}
