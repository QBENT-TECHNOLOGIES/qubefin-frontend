import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { EMPTY_UUID } from 'qubefin-core';

import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { IEmployeeRecordTabConfig } from '../../../models/employee-record';
import { EmployeeRecordsStore } from '../../../stores/employee-records-store';

@Component({
  selector: 'qfin-employee-records-detail',
  imports: [CommonModule, MatTooltipModule, LucideDynamicIcon],
  templateUrl: './employee-records-detail.html',
  styles: ``,
})
export class EmployeeRecordsDetail {
  public readonly EMPTY_UUID = EMPTY_UUID;
  readonly iconMap = APP_ICONS_MAP;

  private readonly recordsStore = inject(EmployeeRecordsStore);

  readonly tabConfig = input.required<IEmployeeRecordTabConfig>();

  readonly closePanel = output<void>();

  readonly detail = this.recordsStore.detail;
  readonly loading = this.recordsStore.detailLoading;
  readonly error = this.recordsStore.detailError;

  readonly initials = computed(() => {
    const name = (this.detail()?.employeeName ?? '').trim();
    if (!name) return '—';

    const parts = name.split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';

    return `${first}${last}`.toUpperCase();
  });

  protected onClose() {
    this.closePanel.emit();
  }

  protected getStatusClass(status: string | null | undefined): string {
    switch (status) {
      case 'Approved':
      case 'On Time':
        return 'text-emerald-600 dark:text-emerald-400';

      case 'Rejected':
      case 'MSP':
        return 'text-rose-600 dark:text-rose-400';

      case 'Cancelled':
      case 'Lapsed':
        return 'text-slate-600 dark:text-slate-400';

      case 'Pending':
        return 'text-yellow-600 dark:text-yellow-400';

      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  }

  protected getStatusPingClass(status: string | null | undefined): string {
    switch (status) {
      case 'Approved':
      case 'On Time':
        return 'bg-emerald-400';

      case 'Rejected':
      case 'MSP':
        return 'bg-rose-400';

      case 'Cancelled':
      case 'Lapsed':
        return 'bg-slate-400';

      case 'Pending':
        return 'bg-yellow-400';

      default:
        return 'bg-blue-400';
    }
  }

  protected getStatusDotClass(status: string | null | undefined): string {
    switch (status) {
      case 'Approved':
      case 'On Time':
        return 'bg-emerald-500';

      case 'Rejected':
      case 'MSP':
        return 'bg-rose-500';

      case 'Cancelled':
      case 'Lapsed':
        return 'bg-slate-500';

      case 'Pending':
        return 'bg-yellow-500';

      default:
        return 'bg-blue-500';
    }
  }

  protected isPendingEvent(eventStatus: string | null | undefined): boolean {
    return eventStatus === 'Pending';
  }

  protected getEventIconClass(eventStatus: string | null | undefined): string {
    switch (eventStatus) {
      case 'Rejected':
        return 'bg-rose-500 text-white';

      case 'Pending':
        return 'bg-yellow-500 text-white';

      default:
        return 'bg-primary-500 text-white';
    }
  }

  protected getEventBadgeClass(eventStatus: string | null | undefined): string {
    switch (eventStatus) {
      case 'Rejected':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-300 dark:text-black';

      case 'Pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-300 dark:text-black';

      default:
        return 'bg-primary-100 text-primary-700 dark:bg-slate-300 dark:text-black';
    }
  }
}
