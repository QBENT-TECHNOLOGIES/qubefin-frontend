import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { HolidayList } from '../../components/holiday-components/holiday-list/holiday-list';
import { HolidayDetail } from '../../components/holiday-components/holiday-detail/holiday-detail';
import { HolidayView } from '../../components/holiday-components/holiday-view/holiday-view';
import { EMPTY_UUID } from 'qubefin-core';
import { HolidayStore } from '../../stores/holiday-store';
import { provideNativeDateAdapter } from '@angular/material/core';

@Component({
  selector: 'qfin-holiday-component',
  providers: [provideNativeDateAdapter(), DatePipe],
  imports: [
    FormsModule,
    MatSelectModule,
    MatTooltipModule,
    LucideDynamicIcon,
    CommonModule,
    HolidayList,
    HolidayDetail,
    HolidayView,
  ],
  templateUrl: './holiday-component.html',
})
export class HolidayComponent {
  public readonly EMPTY_UUID = EMPTY_UUID;
  readonly holidayStore = inject(HolidayStore);

  readonly isViewMode = signal<boolean>(true);
  readonly selectedHolidayId = signal<string>(EMPTY_UUID);

  readonly minYear = 2026;
  readonly currentYear = new Date().getFullYear();

  readonly yearsList = Array.from(
    { length: this.currentYear - this.minYear + 1 },
    (_, i) => this.currentYear - i,
  );

  readonly selectedYear = signal(this.currentYear);

  readonly holidays = this.holidayStore.holidays;
  readonly hasSelectedHolidayId = computed(
    () => this.selectedHolidayId() !== EMPTY_UUID || !this.isViewMode(),
  );

  protected onView(id: string) {
    this.selectedHolidayId.set(id);
    this.isViewMode.set(true);
  }
  protected onEdit() {
    this.isViewMode.set(false);
  }
  protected onAdd() {
    this.isViewMode.set(false);
    this.selectedHolidayId.set(EMPTY_UUID);
  }
  protected closePanel() {
    this.selectedHolidayId.set(EMPTY_UUID);
    this.isViewMode.set(true);
  }

  onYearChange(year: number) {
    this.selectedYear.set(year);
    this.holidayStore.setYearQuery(year);
  }
}
