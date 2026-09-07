import { Component, computed, inject, signal } from '@angular/core';
import { OrganizationUnit } from '../../../../global/models/organization-unit';
import { IDesignation } from '../../../models/designation';
import { OrganizationUnitTypeStore } from '../../../../global/stores/organization-unit-type-store';
import { DateAdapter, MatNativeDateModule } from '@angular/material/core';
import { DatePipe } from '@angular/common';
import { IEmpTransfer } from '../../../models/employee-detail';
import { required, schema, Schema } from '@angular/forms/signals';
import { OrganizationUnitService } from '../../../../global/services/organization-unit-service';
import { EMPTY_UUID } from 'qubefin-core';
import { EmployeeService } from '../../../services/employee-service';
import { MatDialogRef } from '@angular/material/dialog';
@Component({
  selector: 'qfin-employee-transfer-modal',
  providers: [DatePipe],
  imports: [],
  templateUrl: './employee-transfer-modal.html',
  styles: ``,
})
export class EmployeeTransferModal {
  readonly dialogRef = inject(MatDialogRef<EmployeeTransferModal>);
  private dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);
  private readonly employeeService = inject(EmployeeService);
  private readonly organizationUnitService = inject(OrganizationUnitService);
  private readonly organizationUnitTypeStore = inject(OrganizationUnitTypeStore);
  displayedColumns = computed(() => {
    return ['sl', 'orgUnit', 'unitType', 'designation', 'grade', 'grossSalary', 'action'];
  });
  readonly organizationUnitTypes = this.organizationUnitTypeStore.organizationUnitTypes;
  organizationUnits = signal<OrganizationUnit[]>([]);
  designations = signal<IDesignation[]>([]);

  protected readonly transferModel = signal<IEmpTransfer>({
    id: '',
    organizationUnitTypeId: '',
    organizationUnitId: '',
    designationId: '',
    gradeId: '',
    grossSalary: null,
  });
  protected readonly transferSchema: Schema<IEmpTransfer> = schema((path) => {
    required(path.organizationUnitTypeId, { message: 'Organization Unit Type is required' });
    required(path.organizationUnitId, { message: 'Organization Unit is required' });
    required(path.designationId, { message: 'Designation is required' });
    required(path.gradeId, { message: 'Grade is required' });
    required(path.grossSalary, { message: 'Gross Salary is required' });
  });
  constructor() {
    this.dateAdapter.setLocale('en-GB');
  }
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
        salaryGrade: selectedDesignation.salaryGrade || '',
        grossSalary: selectedDesignation.grossSalary || null,
      }));
    }
  }
}
