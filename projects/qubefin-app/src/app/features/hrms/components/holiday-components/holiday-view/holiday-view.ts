import { Component, effect, inject, model, output } from '@angular/core';
import { HolidayStore } from '../../../stores/holiday-store';
import { EMPTY_UUID } from 'qubefin-core';
import { LucideDynamicIcon } from '@lucide/angular';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'qfin-holiday-view',
  imports: [LucideDynamicIcon, DatePipe],
  templateUrl: './holiday-view.html',
  styles: ``,
})
export class HolidayView {
  private readonly holidayStore = inject(HolidayStore);
  private readonly datePipe = inject(DatePipe);
  readonly holidayId = model<string>(EMPTY_UUID);
  readonly showEdit = output<void>();

  readonly holiday = this.holidayStore.holiday;
  readonly loading = this.holidayStore.holidayLoading;
  readonly error = this.holidayStore.holidayError;

  constructor() {
    effect(() => {
      this.holidayStore.setHolidayId(this.holidayId());
    });
    effect(() => {
      const holiday = this.holidayStore.holiday();

      if (!holiday) return;
    });
  }
  onEdit() {
    this.showEdit.emit();
  }
}
