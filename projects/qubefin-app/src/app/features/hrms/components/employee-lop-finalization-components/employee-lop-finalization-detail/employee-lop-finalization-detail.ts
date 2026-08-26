import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EmployeeLopFinalizationStore } from '../../../stores/employee-lop-finalization-store';
import { EmployeeLosDetails } from '../../../models/employee-lop-finalization';

@Component({
  selector: 'qfin-employee-lop-finalization-detail',
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatSelectModule,
    FormsModule,
    DatePipe,
  ],
  templateUrl: './employee-lop-finalization-detail.html',
  styles: ``,
})
export class EmployeeLopFinalizationDetail {
  readonly recordId = input<string>('');
  
  cancel = output<void>();
  save = output<void>();

  readonly store = inject(EmployeeLopFinalizationStore);
  readonly snackBar = inject(MatSnackBar);

  displayedColumns = ['date', 'status'];

  // Local copy of data for editing
  editingData = signal<EmployeeLosDetails[]>([]);

  constructor() {
    effect(() => {
      // Whenever the detailData updates, we reset our editing data
      const data = this.store.detailData();
      if (data && data.length) {
        // Create a deep copy to allow editing without mutating the store's cached response
        this.editingData.set(data.map(item => ({ ...item })));
      } else {
        this.editingData.set([]);
      }
    });
  }

  onSave() {
    const id = this.recordId();
    if (!id) return;
    
    this.store.updateDetails(id, this.editingData()).subscribe({
      next: (res: any) => {
        this.snackBar.open(res.message || 'Updated successfully', 'Close', { duration: 3000 });
        this.save.emit();
      },
      error: (err: any) => {
        this.snackBar.open('Error updating details', 'Close', { duration: 3000 });
      }
    });
  }

  onCancel() {
    this.cancel.emit();
  }
}
