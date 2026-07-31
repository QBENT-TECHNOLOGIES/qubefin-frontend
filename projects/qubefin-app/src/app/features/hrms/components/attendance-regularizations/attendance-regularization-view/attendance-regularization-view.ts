import { Component, computed, effect, inject, model, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { LucideDynamicIcon, LucideIcon } from '@lucide/angular';
import { EMPTY_UUID } from 'qubefin-core';
import { AttendanceRegularizationsStore } from '../../../stores/attendance-regularizations-store';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'qfin-attendance-regularization-view',
  imports: [CommonModule, DatePipe, LucideDynamicIcon, MatFormFieldModule],
  templateUrl: './attendance-regularization-view.html',
  styles: ``,
})
export class AttendanceRegularizationView {
  private readonly store = inject(AttendanceRegularizationsStore);

  readonly regularizationId = model<string>(EMPTY_UUID);

  readonly showEdit = output<void>();
  readonly detail = this.store.regularization;
  readonly loading = this.store.regularizationUnitLoading;
  readonly error = this.store.regularizationUnitError;
  constructor() {
    effect(() => {
      this.store.setRegularizationId(this.regularizationId());
    });
  }

  // onEdit() {
  //   this.showEdit.emit();
  // }
}
