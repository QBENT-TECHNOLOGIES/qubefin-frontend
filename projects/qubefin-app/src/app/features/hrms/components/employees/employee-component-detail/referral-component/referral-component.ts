import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { form, FormField, readonly, required, schema, Schema } from '@angular/forms/signals';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatStepperModule } from '@angular/material/stepper';
import { EmployeeStore } from '../../../../stores/employee-store';
import { EmployeeService } from '../../../../services/employee-service';
import { rxResource } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, of, Subject, switchMap, tap } from 'rxjs';
import { EmployeeReferralInfo, IEmployeeReferralInfo } from '../../../../models/employee-detail';
import { EmployeeSearchByText } from '../../../../models/employee-search-by-text';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';

interface IReferralEmployeeOption extends EmployeeSearchByText {
  designation?: string;
}

@Component({
  selector: 'qfin-referral-component',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    FormField,
    MatStepperModule,
    LucideDynamicIcon,
    MatAutocompleteModule,
  ],
  templateUrl: './referral-component.html',
  styles: ``,
})
export class ReferralComponentDetail {
  empId = input<string>(EMPTY_UUID);
  onRefferalUpdate = output<void>();

  private readonly employeeStore = inject(EmployeeStore);
  private readonly employeeService = inject(EmployeeService);
  private readonly alertService = inject(AlertService);

  isEditMode = computed(() => !!this.empId() && this.empId() !== EMPTY_UUID);

  readonly employeeOptions = signal<IReferralEmployeeOption[]>([]);
  readonly employeeSearchText = signal('');
  private readonly employeeSearch$ = new Subject<{ searchText: string }>();

  public readonly referralModel = signal<IEmployeeReferralInfo>(new EmployeeReferralInfo());
  public readonly referralSchema: Schema<IEmployeeReferralInfo> = schema((path) => {
    required(path.referedBy, { message: 'Referral Emp Name is required' });
    readonly(path.employeeCode, { when: () => true });
    readonly(path.designation, { when: () => true });
  });
  protected readonly referralForm = form(this.referralModel, this.referralSchema);

  constructor() {
    this.employeeSearch$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((searchText) => this.employeeService.getEmployeesBySearchText(searchText)),
      )
      .subscribe((resp: any) => {
        this.employeeOptions.set(resp ?? []);
      });
  }

  private readonly referralResource = rxResource({
    params: () => ({ id: this.empId(), editMode: this.isEditMode() }),
    stream: ({ params }) => {
      if (params.editMode && params.id !== EMPTY_UUID) {
        return this.employeeService.getReferralData(params.id).pipe(
          tap((resp: any) => {
            this.referralModel.set(
              new EmployeeReferralInfo({
                ...resp,
                employeeCode: resp.code ?? '',
              }),
            );

            this.employeeSearchText.set(resp.referralEmployeeName || resp.employeeName || '');
          }),
        );
      }

      this.referralModel.set(new EmployeeReferralInfo());
      this.employeeSearchText.set('');
      this.employeeOptions.set([]);
      return of(null);
    },
  });

  protected updateField<K extends keyof IEmployeeReferralInfo>(
    field: K,
    value: IEmployeeReferralInfo[K],
  ) {
    this.referralModel.update((state) => ({
      ...state,
      [field]: value,
    }));
  }

  protected searchEmployees(searchText: string) {
    this.employeeSearchText.set(searchText);

    if (!searchText.trim()) {
      this.updateField('referedBy', '');
      this.updateField('employeeCode', '');
      this.updateField('designation', '');
      this.employeeOptions.set([]);
      return;
    }

    this.employeeSearch$.next({ searchText });
  }

  protected selectEmployee(event: MatAutocompleteSelectedEvent) {
    const employee = event.option.value as IReferralEmployeeOption;

    this.employeeSearchText.set(employee.employeeName);

    this.updateField('referedBy', employee.id);
    this.updateField('employeeCode', employee.employeeCode || '');
    this.updateField('designation', employee.designation || '');
  }

  protected displayEmployeeName(employee: IReferralEmployeeOption | string | null): string {
    if (!employee) {
      return '';
    }

    return typeof employee === 'string' ? employee : employee.employeeName;
  }

  onSubmit() {
    this.referralForm().markAsTouched();

    if (!this.referralForm().valid()) {
      return;
    }

    if (!this.empId() || this.empId() === EMPTY_UUID) {
      return;
    }

    const data = this.referralForm().value();

    this.employeeService.updateReferralInfo(this.empId(), data).subscribe({
      next: (resp: any) => {
        this.alertService.success('Success', resp).then(() => {
          this.employeeStore.refreshList();
          this.employeeStore.refreshDetail();
          this.onRefferalUpdate.emit();
        });
      },
    });
  }
}
