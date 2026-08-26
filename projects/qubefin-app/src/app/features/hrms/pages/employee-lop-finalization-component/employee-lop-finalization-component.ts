import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LucideDynamicIcon } from '@lucide/angular';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { EMPTY_UUID } from 'qubefin-core';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { EmployeeLopFinalizationStore } from '../../stores/employee-lop-finalization-store';
import { EmployeeLopFinalizationList } from '../../components/employee-lop-finalization-components/employee-lop-finalization-list/employee-lop-finalization-list';
import { EmployeeLopFinalizationDetail } from '../../components/employee-lop-finalization-components/employee-lop-finalization-detail/employee-lop-finalization-detail';

@Component({
  selector: 'qfin-employee-lop-finalization-component',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatTooltipModule,
    LucideDynamicIcon,
    EmployeeLopFinalizationList,
    EmployeeLopFinalizationDetail,
  ],
  templateUrl: './employee-lop-finalization-component.html',
  styles: ``,
})
export class EmployeeLopFinalizationComponent {
  // ===========================
  // Constants
  // ===========================
  public readonly EMPTY_UUID = EMPTY_UUID;
  readonly iconMap = APP_ICONS_MAP;

  // ===========================
  // Dependency Injection
  // ===========================
  readonly store = inject(EmployeeLopFinalizationStore);
  readonly snackBar = inject(MatSnackBar);

  // ===========================
  // Component State
  // ===========================
  readonly isViewMode = signal<boolean>(true);
  readonly selectedId = signal<string>(EMPTY_UUID);

  readonly showFilterArea = signal<boolean>(false);

  readonly currentYear = new Date().getFullYear();
  readonly yearsList = Array.from({ length: 4 }, (_, i) => this.currentYear - i);
  
  readonly monthsList = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  readonly statusOptions = [
    { value: 1, label: 'Irregular' },
    { value: 2, label: 'LOP' },
  ];

  readonly year = signal<number>(this.currentYear);
  readonly month = signal<number>(new Date().getMonth() + 1);
  readonly status = signal<number | null>(null);
  readonly searchQuery = signal<string>('');

  constructor() {}

  // ===========================
  // Store Data
  // ===========================
  readonly listData = this.store.listData;
  readonly hasSelectedRecord = computed(
    () => this.selectedId() !== EMPTY_UUID || !this.isViewMode()
  );

  // ===========================
  // Panel Actions
  // ===========================
  protected onEdit(id: string) {
    this.selectedId.set(id);
    this.store.setSelectedId(id);
    this.isViewMode.set(false);
  }

  protected closePanel() {
    this.selectedId.set(EMPTY_UUID);
    this.store.setSelectedId(EMPTY_UUID);
    this.isViewMode.set(true);
    this.store.refreshList();
  }

  protected toggleFilterArea() {
    this.showFilterArea.update((v) => !v);
  }

  // ===========================
  // Filter Actions
  // ===========================
  protected applyFilters() {
    this.store.setYear(this.year());
    this.store.setMonth(this.month());
    this.store.setStatus(this.status());
    this.store.setSearchQuery(this.searchQuery() || null);
  }

  protected resetFilters() {
    this.year.set(this.currentYear);
    this.month.set(new Date().getMonth() + 1);
    this.status.set(null);
    this.searchQuery.set('');
    this.applyFilters();
  }

  // ===========================
  // Actions
  // ===========================
  protected onGenerate() {
    this.store.generateMoralization().subscribe({
      next: (res: any) => {
        this.snackBar.open(res.message || 'Generation successful', 'Close', { duration: 3000 });
        this.store.refreshList();
      },
      error: (err: any) => {
        this.snackBar.open('Error generating moralization', 'Close', { duration: 3000 });
      }
    });
  }
}
