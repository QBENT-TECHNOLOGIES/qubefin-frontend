import { Component, computed, effect, inject, signal } from '@angular/core';
import { OrganizationUnit } from '../../../../global/models/organization-unit';
import { IDesignation } from '../../../models/designation';
import { OrganizationUnitTypeStore } from '../../../../global/stores/organization-unit-type-store';
import { DateAdapter, MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { CommonModule, DatePipe } from '@angular/common';
import { IEmpTransfer, IEmpTransferHistory } from '../../../models/employee-detail';
import { form, FormField, required, schema, Schema } from '@angular/forms/signals';
import { OrganizationUnitService } from '../../../../global/services/organization-unit-service';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { EmployeeService } from '../../../services/employee-service';
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
  selector: 'qfin-employee-transfer-modal',
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
  ],
  templateUrl: './employee-transfer-modal.html',
  styles: ``,
})
export class EmployeeTransferModal {
  private readonly alertService = inject(AlertService);
  readonly dialogRef = inject(MatDialogRef<EmployeeTransferModal>);
  private readonly dialogData = inject(MAT_DIALOG_DATA);
  private dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);
  private readonly employeeService = inject(EmployeeService);
  private readonly organizationUnitService = inject(OrganizationUnitService);
  private readonly organizationUnitTypeStore = inject(OrganizationUnitTypeStore);
  private readonly employeeStore = inject(EmployeeStore);
  private readonly approvalWorkflowStore = inject(ApprovalWorkflowStore);

  readonly displayedColumns = computed(() => {
    return [
      'sl',
      'orgUnit',
      'unitType',
      'designation',
      'grade',
      'grossSalary',
      'fromDate',
      'toDate',
    ];
  });
  // readonly empTransferHistoryList = [
  //   {
  //     id: '1',
  //     organizationUnitTypeName: 'Block',
  //     organizationUnitName: 'Block 1',
  //     designationName: 'Designation 1',
  //     salaryGrade: 'Grade 1',
  //     grossSalary: 1000,
  //     fromDate: '2023-01-01',
  //     toDate: '2023-01-02',
  //   },
  //   {
  //     id: '2',
  //     organizationUnitTypeName: 'Block',
  //     organizationUnitName: 'Block 2',
  //     designationName: 'Designation 2',
  //     salaryGrade: 'Grade 2',
  //     grossSalary: 2000,
  //     fromDate: '2023-01-03',
  //     toDate: '2023-01-04',
  //   },
  // ];
  empTransferHistoryList = signal<IEmpTransferHistory[]>([]);
  readonly salaryGrades = this.approvalWorkflowStore.salaryGrades;
  readonly organizationUnitTypes = this.organizationUnitTypeStore.organizationUnitTypes;
  organizationUnits = signal<OrganizationUnit[]>([]);
  designations = signal<IDesignation[]>([]);

  protected readonly transferModel = signal<IEmpTransfer>({
    id: '',
    employeeId: '',
    organisationUnitTypeId: '',
    organisationUnitId: '',
    designationId: '',
    salaryGradeId: '',
    grossSalary: null,
  });
  protected readonly transferSchema: Schema<IEmpTransfer> = schema((path) => {
    required(path.organisationUnitTypeId, { message: 'Orga Unit Type required' });
    required(path.organisationUnitId, { message: 'Organization Unit is required' });
    required(path.designationId, { message: 'Designation is required' });
    required(path.salaryGradeId, { message: 'Grade is required' });
    required(path.grossSalary, { message: 'Gross Salary is required' });
  });
  protected readonly empTransferForm = form(this.transferModel, this.transferSchema);
  empId = signal<string>('');
  constructor() {
    this.dateAdapter.setLocale('en-GB');

    const id = this.dialogData?.id;
    if (id) {
      this.empId.set(id);
    }
  }
  private transferDataResource = rxResource({
    params: () => ({ id: this.empId() }),
    stream: ({ params }) => {
      if (params.id && params.id !== '') {
        return this.employeeService.getEmployeeTransfer(params.id).pipe(
          tap((resp: any) => {
            if (resp) {
              if (resp.employeeTransferHistory) {
                const historyData: IEmpTransferHistory[] = resp.employeeTransferHistory.map(
                  (item: any) => ({
                    id: item.id,
                    organizationUnitType: item.organisationUnitType,
                    organizationUnit: item.organisationUnit,
                    designation: item.designation,
                    salaryGrade: item.salaryGrade,
                    grossSalary: item.grossSalary,
                    fromDate: item.fromDate,
                    toDate: item.toDate,
                  }),
                );
                this.empTransferHistoryList.set(historyData);
              }

              if (resp.currentOfficialInfo) {
                const officialInfo = resp.currentOfficialInfo;

                this.transferModel.update((state) => ({
                  ...state,
                  organisationUnitTypeId: officialInfo.organisationUnitTypeId || '',
                  organisationUnitId: officialInfo.organisationUnitId || '',
                  designationId: officialInfo.designationId || '',
                  grossSalary: officialInfo.grossSalary || null,
                  salaryGradeId: officialInfo.salaryGradeId || '',
                }));

                if (officialInfo.organisationUnitTypeId) {
                  this.onOrganizationUnitTypeChange(officialInfo.organisationUnitTypeId);
                }
                if (officialInfo.organisationUnitId) {
                  this.onOrganizationUnitChange(officialInfo.organisationUnitId);
                }
                if (officialInfo.designationId) {
                  this.onDesignationChange(officialInfo.designationId);
                }
              }
            }
          }),
        );
      } else {
        return of(null);
      }
    },
  });
  onOrganizationUnitTypeChange(typeId: string) {
    if (!typeId || typeId === EMPTY_UUID) {
      return;
    }
    this.organizationUnitService.getOrganizationUnitByType(typeId).subscribe({
      next: (res: any) => {
        this.organizationUnits.set(res);
      },
    });
  }
  onOrganizationUnitChange(id: string) {
    if (!id || id === EMPTY_UUID) {
      return;
    }

    const units = this.organizationUnits();
    const selectedUnit = units.find((x: any) => x.id === id);

    if (selectedUnit) {
      this.transferModel.update((state) => ({
        ...state,
        organizationUnitId: id,
      }));
    }
    this.employeeService.getDisignationByOrganizationUnit(id).subscribe({
      next: (res: any) => {
        this.designations.set(res);
      },
    });
  }
  onDesignationChange(id: string) {
    if (!id || id === EMPTY_UUID) {
      return;
    }

    const designations = this.designations();
    const selectedDesignation = designations.find((x: any) => x.id === id);

    if (selectedDesignation) {
      this.transferModel.update((state) => ({
        ...state,
        designationId: id,
        salaryGradeId: selectedDesignation.salaryGradeId || '',
        grossSalary: selectedDesignation.grossSalary || null,
      }));
    }
  }
  onSave() {
    this.empTransferForm().markAsTouched();
    if (!this.empTransferForm().valid()) {
      return;
    }

    const dataToSave = {
      ...this.empTransferForm().value(),
      employeeId: this.empId(),
    };
    this.employeeService.transferEmployee(dataToSave).subscribe({
      next: (resp: any) => {
        this.alertService.success('Success', resp).then(() => {
          // this.dialogRef.close(true);
          this.transferDataResource.reload();
        });
      },
      error: (err: any) => {
        if (err.error?.isError) {
        }
      },
    });
  }
  onCancel() {
    this.dialogRef.close(false);
    this.employeeStore.refreshList();
  }
}
