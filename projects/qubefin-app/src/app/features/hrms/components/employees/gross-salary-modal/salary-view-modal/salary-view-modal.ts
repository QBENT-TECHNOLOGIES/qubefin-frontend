import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { LucideDynamicIcon } from '@lucide/angular';
import { delay, of } from 'rxjs';
import {
  IEmployeeSalaryPreview,
  IGrossSalaryPreviewRequest,
} from '../../../../models/employee-detail';
import { EmployeeService } from '../../../../services/employee-service';

@Component({
  selector: 'qfin-salary-view-modal',
  imports: [CommonModule, MatDialogModule, LucideDynamicIcon],
  templateUrl: './salary-view-modal.html',
  styles: ``,
})
export class SalaryViewModal {
  readonly dialogRef = inject(MatDialogRef<SalaryViewModal>);
  private readonly dialogData = inject(MAT_DIALOG_DATA);
  private readonly employeeService = inject(EmployeeService);

  private readonly previewResource = rxResource({
    params: (): IGrossSalaryPreviewRequest => ({
      employeeId: this.dialogData?.employeeId,
      salaryGradeId: this.dialogData?.salaryGradeId,
      grossSalary: this.dialogData?.grossSalary,
      pfAmount: this.dialogData?.pfAmount,
    }),
    stream: ({ params }) => {
      // if (DEMO_MODE) {
      //   return of(MOCK_SALARY_PREVIEW).pipe(delay(600));
      // }

      // if (!params.employeeId || !params.salaryGradeId || params.grossSalary == null || params.pfAmount == null) {
      //   return of(null);
      // }
      return this.employeeService.getGrossSalaryPreview(params);
    },
  });

  readonly salaryPreview = computed<IEmployeeSalaryPreview | null>(
    () => (this.previewResource.value() as IEmployeeSalaryPreview | undefined) ?? null,
  );
  readonly loading = computed(() => this.previewResource.isLoading());

  readonly earningHeads = computed(() => this.salaryPreview()?.earningHeads ?? []);
  readonly deductionHeads = computed(() => this.salaryPreview()?.deductionHeads ?? []);

  readonly totalEarnings = computed(() =>
    this.earningHeads().reduce((acc, item) => acc + (Number(item.amount) || 0), 0),
  );
  readonly totalDeductions = computed(() =>
    this.deductionHeads().reduce((acc, item) => acc + (Number(item.amount) || 0), 0),
  );
  readonly netPay = computed(() => this.totalEarnings() - this.totalDeductions());

  onClose(): void {
    this.dialogRef.close();
  }
}
