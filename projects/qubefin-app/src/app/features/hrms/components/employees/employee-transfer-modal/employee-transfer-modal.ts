import { Component, computed, effect, inject, signal } from '@angular/core';
import { OrganizationUnit } from '../../../../global/models/organization-unit';
import { OrganizationUnitTypeStore } from '../../../../global/stores/organization-unit-type-store';
import { DateAdapter, MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { CommonModule, DatePipe } from '@angular/common';
import { IEmpTransfer, IEmpTransferHistory } from '../../../models/employee-detail';
import {
  disabled,
  form,
  FormField,
  required,
  schema,
  Schema,
  validate,
} from '@angular/forms/signals';
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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { EmployeeStore } from '../../../stores/employee-store';
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
    MatDatepickerModule,
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

  empTransferHistoryList = signal<IEmpTransferHistory[]>([]);
  readonly organizationUnitTypes = this.organizationUnitTypeStore.organizationUnitTypes;
  organizationUnits = signal<OrganizationUnit[]>([]);
  // Latest 'From Date' in the transfer history (date part only)
  readonly lastFromDate = computed<Date | null>(() => {
    const times = this.empTransferHistoryList()
      .filter((x) => x.fromDate)
      .map((x) => {
        const d = new Date(x.fromDate);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      });
    return times.length ? new Date(Math.max(...times)) : null;
  });
  // New transfer must start after the last 'From Date'
  readonly minEffectiveDate = computed<Date | null>(() => {
    const last = this.lastFromDate();
    if (!last) return null;
    const minDate = new Date(last);
    minDate.setDate(minDate.getDate() + 1);
    return minDate;
  });

  protected readonly transferModel = signal<IEmpTransfer>({
    id: '',
    employeeId: '',
    organisationUnitTypeId: '',
    organisationUnitId: '',
    effectiveFrom: null,
  });
  protected readonly transferSchema: Schema<IEmpTransfer> = schema((path) => {
    required(path.organisationUnitTypeId, { message: 'Orga Unit Type required' });
    disabled(path.organisationUnitTypeId);
    required(path.organisationUnitId, { message: 'Organization Unit is required' });
    required(path.effectiveFrom, { message: 'Effective From is required' });
    validate(path.effectiveFrom, ({ value }) => {
      const minDate = this.minEffectiveDate();
      const selected = value();
      if (!selected || !minDate) {
        return null;
      }
      const d = new Date(selected);
      const selectedDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return selectedDate < minDate
        ? {
            kind: 'minEffectiveDate',
            message: `Effective From must be after ${this.datePipe.transform(this.lastFromDate(), 'dd-MM-yyyy')}`,
          }
        : null;
    });
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
                  effectiveFrom: null,
                }));

                if (officialInfo.organisationUnitTypeId) {
                  this.onOrganizationUnitTypeChange(officialInfo.organisationUnitTypeId);
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
  onSave() {
    this.empTransferForm().markAsTouched();
    if (!this.empTransferForm().valid()) {
      return;
    }

    const formValue = this.empTransferForm().value();
    const dataToSave = {
      employeeId: this.empId(),
      organisationUnitId: formValue.organisationUnitId,
      effectiveFrom: this.datePipe.transform(formValue.effectiveFrom, 'yyyy-MM-dd'),
    };
    this.alertService
      .confirm('Confirmation', 'Do you want to transfer this employee?')
      .then((result: any) => {
        if (result.isConfirmed) {
          this.employeeService.transferEmployee(dataToSave).subscribe({
            next: (resp: any) => {
              this.alertService.success('Success', resp).then(() => {
                this.transferDataResource.reload();
              });
            },
            error: (err: any) => {
              if (err.error?.isError) {
              }
            },
          });
        }
      });
  }
  onCancel() {
    this.dialogRef.close(false);
    this.employeeStore.refreshList();
  }
}
