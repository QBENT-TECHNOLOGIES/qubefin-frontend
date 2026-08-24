import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmployeeService } from '../../../../hrms/services/employee-service';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { EmployeeSearchByText } from '../../../../hrms/models/employee-search-by-text';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { form, required, Schema, schema } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { LucideDynamicIcon } from '@lucide/angular';
import Swal from 'sweetalert2';
import { UserStore } from '../../../stores/user-store';
import { UserService } from '../../../services/user-service';
import { IUserDetail } from '../../../models/user';

@Component({
  selector: 'qfin-user-detail',
  imports: [
    CommonModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatIconModule,
    MatInputModule,
    LucideDynamicIcon,
  ],
  templateUrl: './user-detail.html',
})
export class UserDetail {
  private readonly userStore = inject(UserStore);
  private readonly userService = inject(UserService);
  private readonly employeeService = inject(EmployeeService);
  private readonly alertService = inject(AlertService);

  readonly userId = input<string>(EMPTY_UUID);

  readonly cancel = output<void>();
  readonly save = output<void>();

  readonly isEditMode = computed(() => this.userId() !== EMPTY_UUID);

  protected readonly formModel = signal<IUserDetail>(this.createEmptyModel());

  private createEmptyModel(): IUserDetail {
    return {
      userId: null,
      userName: '',
      password: '',
      employeeId: null,
      isActive: true,
      hasMfaEnabled: false,
      employeeName: '',
    };
  }

  protected updateField<K extends keyof IUserDetail>(field: K, value: IUserDetail[K]) {
    this.formModel.update((current) => ({
      ...current,
      [field]: value,
    }));
  }

  protected readonly userSchema: Schema<IUserDetail> = schema((path) => {
    required(path.userName, { message: 'Username is required' });
  });

  protected readonly userForm = form(this.formModel, this.userSchema);

  readonly employeeOptions = signal<EmployeeSearchByText[]>([]);
  readonly employeeSearchText = signal('');
  private readonly employeeSearch$ = new Subject<{ searchText: string }>();

  constructor() {
    this.employeeSearch$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((x) => this.employeeService.getEmployeesBySearchText(x)),
      )
      .subscribe((resp: any) => {
        this.employeeOptions.set(resp ?? []);
      });

    effect(() => {
      this.userStore.setUserId(this.userId());
    });

    effect(() => {
      const user = this.userStore.user();

      if (!user || !this.isEditMode()) {
        return;
      }

      this.formModel.set({
        userId: user.id,
        userName: user.userName,
        employeeId: user.employeeId,
        isActive: user.isActive,
        hasMfaEnabled: user.hasMfaEnabled,
        employeeName: user.employee,
      });

      if (user.employee) {
        this.employeeSearchText.set(user.employee);
      }
    });
  }

  protected searchEmployees(searchText: string) {
    this.employeeSearchText.set(searchText);

    if (!searchText.trim()) {
      this.employeeOptions.set([]);
      this.employeeSearchText.set('');
      this.updateField('employeeId', null);
      this.updateField('employeeName', '');
      return;
    }

    this.employeeSearch$.next({
      searchText,
    });
  }

  protected selectEmployee(event: MatAutocompleteSelectedEvent) {
    const employee = event.option.value as EmployeeSearchByText;

    this.updateField('employeeId', employee.id);
    this.updateField('employeeName', employee.employeeName);
    this.employeeSearchText.set(employee.employeeName);

    // Autofill username with employeeCode if available and not in edit mode
    if (!this.isEditMode()) {
      if (employee.employeeCode) {
        this.updateField('userName', employee.employeeCode);
      }
    }
  }

  displayEmployeeName(employee: EmployeeSearchByText | string | null): string {
    if (!employee) return '';
    return typeof employee === 'string' ? employee : employee.employeeName;
  }

  protected onSubmit() {
    if (!this.userForm().valid()) {
      return;
    }

    if (!this.isEditMode() && !this.formModel().password) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Password is required for new user.',
      });
      return;
    }

    if (!this.formModel().employeeId) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Please select an employee.',
      });
      return;
    }
    this.alertService
      .confirm(
        'Confirmation',
        `You want to ${this.isEditMode() ? 'update' : 'create'} this user!`,
        'Yes',
        'No',
      )
      .then((result) => {
        if (result.isConfirmed) {
          const payload = { ...this.formModel() };

          if (!this.isEditMode()) {
            this.userService.create(payload).subscribe({
              next: (resp: any) => {
                if (resp)
                  this.alertService.success('Success', 'User created successfully.').then(() => {
                    this.userStore.setPageIndex(0); // Refresh list by re-triggering search
                    this.save.emit();
                  });
              },
            });
            return;
          }

          this.userService.update(payload, payload.userId).subscribe({
            next: (resp: any) => {
              this.alertService.success('Success', resp).then(() => {
                this.userStore.setPageIndex(0); // Refresh list
                this.save.emit();
              });
            },
          });
        }
      });
  }

  protected onCancelClicked() {
    this.cancel.emit();
  }
}
