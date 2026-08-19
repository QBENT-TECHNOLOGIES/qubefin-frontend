import { Component, computed, inject, signal } from '@angular/core';
import { LeavePrayerApprovalStore } from '../../stores/leave-prayer-approval-store';
import { EMPTY_UUID } from 'qubefin-core';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { EmployeeService } from '../../services/employee-service';
import { CommonModule, DatePipe } from '@angular/common';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { EmployeeSearchByText } from '../../models/employee-search-by-text';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { LeavePrayerView } from '../../components/leave-prayer-components/leave-prayer-view/leave-prayer-view';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LeavePrayerApprovalList } from '../../components/leave-prayer-approval/leave-prayer-approval-list/leave-prayer-approval-list';
import { MatDatepickerModule } from '@angular/material/datepicker';

@Component({
  selector: 'qfin-leave-prayer-approval-component',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    LucideDynamicIcon,
    CommonModule,
    LeavePrayerApprovalList,
    MatAutocompleteModule,
    MatDatepickerModule,
    LeavePrayerView,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './leave-prayer-approval-component.html',
  styles: ``,
})
export class LeavePrayerApprovalComponent {
  public readonly EMPTY_UUID = EMPTY_UUID;
  readonly iconMap = APP_ICONS_MAP;

  readonly leavePrayerApprovalStore = inject(LeavePrayerApprovalStore);
  private readonly employeeService = inject(EmployeeService);
  private readonly datePipe = inject(DatePipe);
  private readonly dateAdapter = inject(DateAdapter<Date>);

  readonly isViewMode = signal<boolean>(true);
  readonly showFilterArea = signal<boolean>(false);
  readonly selectedLeavePrayerApprovalId = signal<string>(EMPTY_UUID);

  readonly fromDate = signal<Date | null>(null);
  readonly toDate = signal<Date | null>(null);

  readonly employeeOptions = signal<EmployeeSearchByText[]>([]);
  readonly employeeSearchText = signal('');
  private readonly employeeSearch$ = new Subject<{ searchText: string }>();
  readonly selectedEmployee = signal<EmployeeSearchByText | null>(null);

  constructor() {
    this.dateAdapter.setLocale('en-GB');

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

  readonly leavePrayerApprovals = this.leavePrayerApprovalStore.leavePrayersApprovals;
  readonly hasSelectedLeavePrayerApproval = computed(
    () => this.selectedLeavePrayerApprovalId() !== EMPTY_UUID || !this.isViewMode(),
  );

  protected onView(id: string) {
    this.selectedLeavePrayerApprovalId.set(id);
    this.isViewMode.set(true);
  }

  protected closePanel() {
    this.selectedLeavePrayerApprovalId.set(EMPTY_UUID);
    this.isViewMode.set(true);
  }

  protected toggleFilterArea() {
    this.showFilterArea.update((v) => !v);
  }

  protected searchEmployees(searchText: string) {
    this.employeeSearchText.set(searchText);

    if (!searchText.trim()) {
      this.employeeOptions.set([]);
      this.employeeSearchText.set('');
      this.selectedEmployee.set(null);
      return;
    }

    this.employeeSearch$.next({ searchText });
  }

  protected selectEmployee(event: MatAutocompleteSelectedEvent) {
    const employee = event.option.value as EmployeeSearchByText;
    this.selectedEmployee.set(employee);
    this.employeeSearchText.set(employee.employeeName);
  }

  displayEmployeeName(employee: EmployeeSearchByText | string | null): string {
    if (!employee) return '';
    return typeof employee === 'string' ? employee : employee.employeeName;
  }

  protected applyFilters() {
    const from = this.fromDate();
    const to = this.toDate();

    this.leavePrayerApprovalStore.setFromDateQuery(
      from ? this.datePipe.transform(from, 'yyyy-MM-dd') || '' : '',
    );
    this.leavePrayerApprovalStore.setToDateQuery(
      to ? this.datePipe.transform(to, 'yyyy-MM-dd') || '' : '',
    );
    this.leavePrayerApprovalStore.setSearchedEmployeeIdQuery(this.selectedEmployee()?.id || '');
  }

  protected resetFilters() {
    this.fromDate.set(null);
    this.toDate.set(null);
    this.selectedEmployee.set(null);
    this.employeeSearchText.set('');
    this.employeeOptions.set([]);
    this.applyFilters();
  }

  protected changePage(delta: number) {
    const current = this.leavePrayerApprovalStore.pageIndex();
    const next = current + delta;
    if (next >= 0) {
      this.leavePrayerApprovalStore.setPage(next);
    }
  }

  pageChanged(event: PageEvent) {
    this.leavePrayerApprovalStore.setPage(event.pageIndex);
    this.leavePrayerApprovalStore.setPageSize(event.pageSize);
  }

  onSortChanged(sort: Sort) {
    if (!sort.direction) {
      return;
    }
    this.leavePrayerApprovalStore.setSort(sort.active, sort.direction as 'asc' | 'desc');
  }

  protected onActionCompleted() {
    this.closePanel();
  }
}
