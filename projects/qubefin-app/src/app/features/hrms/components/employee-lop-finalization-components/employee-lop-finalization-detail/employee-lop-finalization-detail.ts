import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EmployeeLopFinalizationStore } from '../../../stores/employee-lop-finalization-store';
import { EmployeeLosDetails } from '../../../models/employee-lop-finalization';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';

@Component({
  selector: 'qfin-employee-lop-finalization-detail',
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatSelectModule,
    FormsModule,
    LucideDynamicIcon,
    DatePipe,
  ],
  templateUrl: './employee-lop-finalization-detail.html',
  styles: ``,
})
export class EmployeeLopFinalizationDetail {
  readonly recordId = input<string>('');

  cancel = output<void>();
  save = output<void>();
  readonly iconMap = APP_ICONS_MAP;

  readonly store = inject(EmployeeLopFinalizationStore);
  readonly alertService = inject(AlertService);

  displayedColumns = ['date', 'status'];

  // Local copy of data for editing
  editingData = signal<EmployeeLosDetails[]>([]);

  constructor() {
    effect(() => {
      // Whenever the detailData updates, we reset our editing data
      const data = this.store.detailData();
      if (data && data.length) {
        // Create a deep copy to allow editing without mutating the store's cached response
        this.editingData.set(data.map((item) => ({ ...item })));
      } else {
        this.editingData.set([]);
      }
    });
  }

  isLeaveTypeLimitReached(row: EmployeeLosDetails, leaveTypeId: string): boolean {
    if (row.leaveTypeId === leaveTypeId) return false;

    const leaveType = this.store
      .leaveTypeBalances()
      .find((item) => item.leaveTypeId === leaveTypeId);
    if (!leaveType) return false;

    const selectedCount = this.editingData().filter(
      (item) => item !== row && item.leaveTypeId === leaveTypeId,
    ).length;
    return selectedCount >= Math.floor(leaveType.leaveBalance);
  }

  onStatusChange(row: EmployeeLosDetails, leaveTypeId: string | null): void {
    if (leaveTypeId && this.isLeaveTypeLimitReached(row, leaveTypeId)) return;

    row.leaveTypeId = leaveTypeId;
    this.editingData.update((items) => [...items]);
  }

  onSave() {
    const id = this.recordId();
    if (!id) return;

    this.store.updateDetails(id, this.editingData()).subscribe({
      next: (resp: any) => {
        this.alertService.success('Success', resp).then(() => {
          this.save.emit();
        });
      },
      error: (err: any) => {},
    });
  }

  onCancel() {
    this.cancel.emit();
  }
}
