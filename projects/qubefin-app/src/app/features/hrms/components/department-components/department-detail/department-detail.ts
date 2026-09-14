import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { form, FormField, readonly, required, schema, Schema } from '@angular/forms/signals';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { LucideDynamicIcon } from '@lucide/angular';
import { DepartmentStore } from '../../../stores/department-store';
import { DepartmentService } from '../../../services/department-service';
import { EmployeeSearchByText } from '../../../models/employee-search-by-text';
import { IDepartment } from '../../../models/department';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { EmployeeService } from '../../../../hrms/services/employee-service';
@Component({
  selector: 'qfin-department-detail',
  imports: [
    CommonModule,
    MatAutocompleteModule,
    FormField,
    MatFormFieldModule,
    MatCheckboxModule,
    MatIconModule,
    MatInputModule,
    LucideDynamicIcon,
  ],
  templateUrl: './department-detail.html',
  styles: ``,
})
export class DepartmentDetail {
  private readonly departmentService = inject(DepartmentService);
  private readonly employeeService = inject(EmployeeService);
  private readonly alertService = inject(AlertService);
  private readonly departmentStore = inject(DepartmentStore);

  readonly departmentId = input<string>(EMPTY_UUID);

  readonly cancel = output<void>();
  readonly save = output<void>();

  readonly isEditMode = computed(() => !!this.departmentId() && this.departmentId() !== EMPTY_UUID);

  readonly employeeOptions = signal<EmployeeSearchByText[]>([]);
  readonly employeeSearchText = signal('');

  private readonly employeeSearch$ = new Subject<{ searchText: string }>();

  protected readonly formModel = signal<IDepartment>(this.createEmptyModel());

  protected readonly departmentSchema: Schema<IDepartment> = schema((path) => {
    required(path.name, {
      message: 'Name is required',
    });

    readonly(path.isActive, {
      when: () => true,
    });
  });

  protected readonly departmentForm = form(this.formModel, this.departmentSchema);

  readonly departmentLoading = this.departmentStore.departmentLoading;
  readonly departmentError = this.departmentStore.departmentError;

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

    effect(() => {
      const id = this.departmentId();
      const editMode = this.isEditMode();

      this.departmentStore.setDepartmentId(editMode && id !== EMPTY_UUID ? id : undefined);

      if (!editMode || id === EMPTY_UUID) {
        this.formModel.set(this.createEmptyModel());
        this.employeeSearchText.set('');
        this.employeeOptions.set([]);
      }
    });

    effect(() => {
      const department = this.departmentStore.department();

      if (!this.isEditMode() || !department) {
        return;
      }

      this.formModel.set({
        id: department.id,
        name: department.name || '',
        isActive: department.isActive ?? true,
        hodEmployeeId: department.hodEmployeeId || '',
      });

      this.employeeSearchText.set((department as any).hodEmployeeName || '');
    });
  }

  private createEmptyModel(): IDepartment {
    return {
      id: '',
      hodEmployeeId: '',
      name: '',
      isActive: true,
    };
  }

  protected updateField<K extends keyof IDepartment>(field: K, value: IDepartment[K]) {
    this.formModel.update((current) => ({
      ...current,
      [field]: value,
    }));
  }

  protected searchEmployees(searchText: string) {
    this.employeeSearchText.set(searchText);

    if (!searchText.trim()) {
      this.updateField('hodEmployeeId', '');
      this.employeeOptions.set([]);
      return;
    }

    this.employeeSearch$.next({
      searchText,
    });
  }

  protected selectEmployee(event: MatAutocompleteSelectedEvent) {
    const employee = event.option.value as EmployeeSearchByText;

    this.employeeSearchText.set(employee.employeeName);

    this.updateField('hodEmployeeId', employee.id);
  }

  protected displayEmployeeName(employee: EmployeeSearchByText | string | null): string {
    if (!employee) {
      return '';
    }

    return typeof employee === 'string' ? employee : employee.employeeName;
  }

  onCancel() {
    this.cancel.emit();
  }

  onSubmit() {
    this.departmentForm().markAsTouched();

    if (!this.departmentForm().valid()) {
      return;
    }

    const data = this.departmentForm().value();

    const payLoad: any = {
      name: data.name,
      isActive: data.isActive,
    };

    if (data.id && data.id !== '') {
      payLoad.id = data.id;
    }

    if (data.hodEmployeeId && data.hodEmployeeId !== '') {
      payLoad.hodEmployeeId = data.hodEmployeeId;
    }
    if (!this.isEditMode()) {
      this.departmentService.createDepartment(payLoad).subscribe({
        next: (resp: any) => {
          this.alertService.success('Success', resp).then(() => {
            this.departmentStore.refreshList();
            this.save.emit();
          });
        },
      });

      return;
    }

    this.departmentService.updateDepartment(data.id, payLoad).subscribe({
      next: (resp: any) => {
        this.alertService.success('Success', resp).then(() => {
          this.departmentStore.refreshList();
          this.departmentStore.refreshDetail();
          this.save.emit();
        });
      },
    });
  }
}
