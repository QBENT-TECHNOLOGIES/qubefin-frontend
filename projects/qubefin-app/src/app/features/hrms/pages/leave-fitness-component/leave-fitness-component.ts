import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { EMPTY_UUID } from 'qubefin-core';

import { LeaveFitnessStore } from '../../stores/leave-fitness-store';
import { LeaveFitnessList } from '../../components/leave-fitness-components/leave-fitness-list/leave-fitness-list';
import { LeaveFitnessDetail } from '../../components/leave-fitness-components/leave-fitness-detail/leave-fitness-detail';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'qfin-leave-fitness-component',
  imports: [CommonModule, LeaveFitnessList, LeaveFitnessDetail, LucideDynamicIcon],
  providers: [provideNativeDateAdapter()],
  templateUrl: './leave-fitness-component.html',
  styles: ``,
})
export class LeaveFitnessComponent {
  readonly store = inject(LeaveFitnessStore);
  private readonly dateAdapter = inject(DateAdapter<Date>);

  readonly EMPTY_UUID = EMPTY_UUID;
  readonly isViewMode = signal(true);
  readonly selectedId = signal<string>(EMPTY_UUID);

  readonly listData = this.store.listData;
  readonly loading = this.store.loading;

  readonly hasSelectedRecord = computed(() => this.selectedId() !== EMPTY_UUID);

  constructor() {}

  onView(id: string) {
    this.selectedId.set(id);
    this.isViewMode.set(false);
  }

  closePanel() {
    this.selectedId.set(EMPTY_UUID);
    this.isViewMode.set(true);
  }

  onActionCompleted() {
    this.closePanel();
    this.store.refreshList();
  }
}
