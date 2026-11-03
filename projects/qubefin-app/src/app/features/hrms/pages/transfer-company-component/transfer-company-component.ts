import { Component, effect, inject, signal, untracked } from '@angular/core';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { CommonModule } from '@angular/common';
import { form, FormField, required, Schema, schema } from '@angular/forms/signals';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { OrganizationUnitService } from '../../../global/services/organization-unit-service';
import { CompanyService } from '../../../global/services/company-service';
import { IComapnyList } from '../../../global/models/company';
import { EmployeeSearchByText } from '../../models/employee-search-by-text';
import { debounceTime, delay, distinctUntilChanged, finalize, of, Subject, switchMap } from 'rxjs';
import { EmployeeService } from '../../services/employee-service';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { ICompanyTransferDetails, IEmployeeCurrentDetails } from '../../models/employee-detail';
import { OrganizationUnit } from '../../../global/models/organization-unit';
import { IDesignation } from '../../models/designation';
import { ApprovalWorkflowStore } from '../../stores/approval-workflow-store';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { OrganizationUnitTypeStore } from '../../../global/stores/organization-unit-type-store';

@Component({
  selector: 'qfin-transfer-company-component',
  providers: [provideNativeDateAdapter(), DatePipe],
  imports: [
    FormField,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    LucideDynamicIcon,
    CommonModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatSelectModule,
  ],
  templateUrl: './transfer-company-component.html',
  styles: ``,
})
export class TransferCompanyComponent {
  private readonly employeeService = inject(EmployeeService);
  private readonly alertService = inject(AlertService);
  private readonly datePipe = inject(DatePipe);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly organizationUnitService = inject(OrganizationUnitService);
  private readonly companyService = inject(CompanyService);
  private readonly organizationUnitTypeStore = inject(OrganizationUnitTypeStore);
  private readonly approvalWorkflowStore = inject(ApprovalWorkflowStore);

  readonly employeeOptions = signal<EmployeeSearchByText[]>([]);
  readonly employeeSearchText = signal('');
  private readonly employeeSearch$ = new Subject<{ searchText: string }>();
  selectedEmployee = signal<EmployeeSearchByText | null>(null);

  readonly currentDetails = signal<IEmployeeCurrentDetails | null>(null);

  readonly organizationUnitTypes = this.organizationUnitTypeStore.organizationUnitTypes;
  readonly salaryGrades = this.approvalWorkflowStore.salaryGrades;
  companies = signal<IComapnyList[]>([]);
  organizationUnits = signal<OrganizationUnit[]>([]);
  designations = signal<IDesignation[]>([]);

  readonly saving = signal(false);

  private emptyTransfer(): ICompanyTransferDetails {
    return {
      companyId: '',
      organizationUnitTypeId: '',
      OrganisationUnitId: '',
      designation: '',
      gradeId: '',
      grossSalary: null,
      joiningDate: null,
      separationDate: null,
    };
  }

  protected readonly transferModel = signal<ICompanyTransferDetails>(this.emptyTransfer());

  protected readonly transferSchema: Schema<ICompanyTransferDetails> = schema((path) => {
    required(path.companyId, { message: 'Company is required' });
    required(path.organizationUnitTypeId, { message: 'Org Unit Type required' });
    required(path.OrganisationUnitId, { message: 'Org Unit required' });
    required(path.designation, { message: 'Designation is required' });
    required(path.gradeId, { message: 'Grade is required' });
    required(path.grossSalary, { message: 'Gross Salary is required' });
    required(path.joiningDate, { message: 'Joining date is required' });
    required(path.separationDate, { message: 'Separation date is required' });
  });

  protected readonly compTransferForm = form(this.transferModel, this.transferSchema);

  constructor() {
    this.dateAdapter.setLocale('en-GB');

    this.companyService.getAll().subscribe((companies: any) => {
      this.companies.set(
        (companies ?? []).map((company: any) => ({ ...company, name: company.name.trim() })),
      );
    });

    effect(() => {
      const current = this.currentDetails();
      const companies = this.companies();
      if (!current) return;

      const currentId = current.companyId;
      const other = companies.find((c) => c.id !== currentId);

      untracked(() =>
        this.transferModel.update((state) => ({ ...state, companyId: other?.id ?? '' })),
      );
    });

    this.employeeSearch$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((x) => this.employeeService.getEmployeesBySearchText(x)),
      )
      .subscribe((resp: any) => {
        this.employeeOptions.set(resp ?? []);
      });
  }

  protected searchEmployees(searchText: string) {
    this.employeeSearchText.set(searchText);

    if (!searchText.trim()) {
      this.employeeOptions.set([]);
      this.employeeSearchText.set('');
      this.selectedEmployee.set(null);
      this.currentDetails.set(null);
      return;
    }

    this.employeeSearch$.next({
      searchText,
    });
  }

  protected selectEmployee(event: MatAutocompleteSelectedEvent) {
    const employee = event.option.value as EmployeeSearchByText;

    this.selectedEmployee.set(employee);
    this.employeeSearchText.set(employee.employeeName);
    this.loadCurrentDetails(employee.id);
  }

  private loadCurrentDetails(employeeId: string) {
    this.employeeService.getOfficialData(employeeId).subscribe({
      next: (res: any) => {
        if (this.selectedEmployee()?.id !== employeeId) return;

        this.transferModel.set({
          ...this.emptyTransfer(),
          designation: res?.designationName ?? '',
          separationDate: res?.separationDate ? new Date(res?.separationDate) : null,
        });
        this.organizationUnits.set([]);
        this.designations.set([]);

        this.currentDetails.set(res);
      },
      error: () => this.currentDetails.set(null),
    });
  }

  displayEmployeeName(employee: EmployeeSearchByText | string | null): string {
    if (!employee) return '';

    return typeof employee === 'string' ? employee : employee.employeeName;
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

  onSalaryGradeChange(id: string) {
    if (!id || id === EMPTY_UUID) {
      return;
    }

    const selectedGrade = this.salaryGrades().find((grade: any) => grade.id === id);

    if (selectedGrade) {
      this.transferModel.update((state) => ({
        ...state,
        gradeId: id,
        grossSalary: selectedGrade.grossSalary,
      }));
    }
  }

  onSave() {
    this.compTransferForm().markAsTouched();

    const employee = this.selectedEmployee();
    if (!employee) {
      this.alertService.warning(null, 'Please select an employee.');
      return;
    }
    if (this.compTransferForm().invalid()) {
      return;
    }

    const v = this.compTransferForm().value();
    const payload = {
      employeeId: employee.id,
      ...v,
      joiningDate: this.datePipe.transform(v.joiningDate, 'yyyy-MM-dd'),
      separationDate: this.datePipe.transform(v.separationDate, 'yyyy-MM-dd'),
    };

    this.saving.set(true);
    this.employeeService
      .transferCompany(payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.alertService
            .success('Success', 'Company transfer saved successfully.')
            .then(() => this.onCancel());
        },
        error: () => {},
      });
  }

  onCancel() {
    this.selectedEmployee.set(null);
    this.employeeSearchText.set('');
    this.employeeOptions.set([]);
    this.currentDetails.set(null);
    this.organizationUnits.set([]);
    this.designations.set([]);
    this.transferModel.set(this.emptyTransfer());
  }
}
