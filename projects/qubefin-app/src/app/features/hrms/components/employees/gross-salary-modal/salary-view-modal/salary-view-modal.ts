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

/**
 * TEMPORARY: set this to false once the real `gross-salary-preview` backend
 * endpoint is ready. While true, the modal ignores the API and renders the
 * static MOCK_SALARY_PREVIEW below - just for checking the UI/layout.
 */
// const DEMO_MODE = true;

// const MOCK_SALARY_PREVIEW: IEmployeeSalaryPreview = {
//   employeeCode: 'WGCBO083',
//   employeeName: 'Tapas Barman',
//   organizationUnitName: 'Mathabhanga Branch',
//   designationTitle: 'Credit Officer II',
//   salaryGradeName: 'VI',
//   earningHeads: [
//     { id: '1', salaryComponentName: 'Basic Salary', amount: 7750 },
//     { id: '2', salaryComponentName: 'House Rent Allowance (HRA)', amount: 3100 },
//     { id: '3', salaryComponentName: 'Conveyance Allowance', amount: 2325 },
//     { id: '4', salaryComponentName: 'Medical Allowance', amount: 2325 },
//   ],
//   deductionHeads: [
//     { id: '1', salaryComponentName: 'Employee PF', amount: 1488 },
//     { id: '2', salaryComponentName: 'ESI', amount: 117 },
//     { id: '3', salaryComponentName: 'Professional Tax (P.F.)', amount: 130 },
//   ],
// };

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

      if (!params.employeeId || params.grossSalary == null || params.pfAmount == null) {
        return of(null);
      }
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
